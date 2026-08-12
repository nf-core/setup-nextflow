import { getInput, info } from "@actions/core"
import { downloadTool } from "@actions/tool-cache"
import retry from "async-retry"
import { readFileSync } from "fs"
import semver from "semver"

import { isExactVersion, releaseFromExactVersion } from "./functions.js"
import { NextflowRelease } from "./nextflow-release.js"

const MALFORMED_METADATA_ERROR =
  "The nf-co.re/nextflow_version endpoint returned malformed metadata."
const EMPTY_VERSIONS_ERROR =
  "The nf-co.re/nextflow_version endpoint returned no versions. Partial version aliases require this metadata; use a fully specified version such as 26.04.0 instead."
const INVALID_LATEST_ERROR =
  "The nf-co.re/nextflow_version endpoint returned malformed metadata: missing or invalid 'latest' entries."

const NEXTFLOW_METADATA_URL = "https://nf-co.re/nextflow_version"
const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/nextflow-io/nextflow/releases"
const GITHUB_RELEASES_PAGE_SIZE = 100
const GITHUB_RELEASES_PAGE_LIMIT = 5
const GITHUB_RELEASES_ERROR =
  "The GitHub Nextflow releases endpoint returned malformed data."

export interface NextflowVersionsPayload {
  versions: NextflowRelease[]
  latest: Record<string, NextflowRelease>
}

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function is_nextflow_release(value: unknown): value is NextflowRelease {
  if (!is_record(value)) {
    return false
  }

  return (
    typeof value.version === "string" &&
    typeof value.isEdge === "boolean" &&
    typeof value.downloadUrl === "string" &&
    typeof value.downloadUrlAll === "string"
  )
}

function parse_versions_list(raw_versions: unknown): NextflowRelease[] {
  if (!Array.isArray(raw_versions)) {
    throw new Error(MALFORMED_METADATA_ERROR)
  }

  if (raw_versions.length === 0) {
    throw new Error(EMPTY_VERSIONS_ERROR)
  }

  // Skip malformed entries instead of rejecting the whole payload: the
  // endpoint mirrors GitHub releases verbatim, and some historical releases
  // (e.g. pre-v1 ones with a single asset) are missing downloadUrlAll.
  const versions = raw_versions.filter(is_nextflow_release)
  const skipped = raw_versions.length - versions.length
  if (skipped > 0) {
    info(
      `Skipped ${String(skipped)} malformed entr${skipped === 1 ? "y" : "ies"} from the nf-co.re/nextflow_version metadata.`
    )
  }

  return versions
}

function parse_latest_map(
  raw_latest: unknown
): Record<string, NextflowRelease> {
  if (!is_record(raw_latest)) {
    throw new Error(INVALID_LATEST_ERROR)
  }

  const latest: Record<string, NextflowRelease> = {}
  for (const [flavor, release] of Object.entries(raw_latest)) {
    if (!is_nextflow_release(release)) {
      throw new Error(
        `The nf-co.re/nextflow_version endpoint returned malformed metadata for latest-${flavor}.`
      )
    }
    latest[flavor] = release
  }

  return latest
}

export function parse_nextflow_versions_payload(
  raw: unknown
): NextflowVersionsPayload {
  if (!is_record(raw)) {
    throw new Error(MALFORMED_METADATA_ERROR)
  }

  return {
    versions: parse_versions_list(raw.versions),
    latest: parse_latest_map(raw.latest)
  }
}

function get_latest_from_map(
  latest: Record<string, unknown>,
  flavor: string
): NextflowRelease {
  const release = latest[flavor]
  if (!is_nextflow_release(release)) {
    throw new Error(
      `The nf-co.re/nextflow_version endpoint has no latest-${flavor} entry.`
    )
  }

  return release
}

export function get_latest_from_payload(
  payload: NextflowVersionsPayload,
  flavor: string
): NextflowRelease {
  return get_latest_from_map(payload.latest, flavor)
}

type Downloader = (_url: string, _auth?: string) => Promise<string>

let download_json: Downloader = async (url, auth) => {
  const response_file = await retry(
    async () => {
      return downloadTool(url, undefined, auth)
    },
    {
      retries: 5,
      onRetry: (err: Error) => {
        info(`Download of ${url} failed, trying again. Error: ${err}`)
      }
    }
  )
  return readFileSync(response_file).toString()
}

// Test-only seam: tests call this to stub network downloads, and restore
// the previous downloader (returned) in a `finally` block.
export function set_downloader(downloader: Downloader): Downloader {
  const previous = download_json
  download_json = downloader
  return previous
}

async function fetch_json(
  url: string,
  error_message: string,
  auth?: string
): Promise<unknown> {
  const body = await download_json(url, auth)

  try {
    return JSON.parse(body)
  } catch {
    throw new Error(error_message)
  }
}

async function fetch_nextflow_versions_data(): Promise<unknown> {
  return await fetch_json(NEXTFLOW_METADATA_URL, MALFORMED_METADATA_ERROR)
}

function github_auth_token(): string | undefined {
  const token = getInput("token")
  return token ? `Bearer ${token}` : undefined
}
async function get_github_releases(): Promise<NextflowRelease[]> {
  const releases: NextflowRelease[] = []

  for (let page = 1; page <= GITHUB_RELEASES_PAGE_LIMIT; page++) {
    const raw = await fetch_json(
      `${GITHUB_RELEASES_URL}?per_page=${String(GITHUB_RELEASES_PAGE_SIZE)}&page=${String(page)}`,
      GITHUB_RELEASES_ERROR,
      github_auth_token()
    )
    if (!Array.isArray(raw)) {
      throw new Error(GITHUB_RELEASES_ERROR)
    }

    for (const release of raw) {
      if (!is_record(release) || typeof release.tag_name !== "string") {
        throw new Error(GITHUB_RELEASES_ERROR)
      }
      if (isExactVersion(release.tag_name)) {
        releases.push(releaseFromExactVersion(release.tag_name))
      }
    }

    if (raw.length < GITHUB_RELEASES_PAGE_SIZE) {
      break
    }
  }

  if (releases.length === 0) {
    throw new Error(GITHUB_RELEASES_ERROR)
  }

  return releases.sort((left, right) =>
    semver.rcompare(left.version, right.version, true)
  )
}

async function get_github_latest_nextflow_version(
  flavor: string
): Promise<NextflowRelease> {
  const releases = await get_github_releases()
  let matching_releases: NextflowRelease[]
  switch (flavor) {
    case "stable":
      matching_releases = releases.filter(release => !release.isEdge)
      break
    case "edge":
      matching_releases = releases.filter(release => release.isEdge)
      break
    case "everything":
      matching_releases = releases
      break
    default:
      matching_releases = []
  }

  if (matching_releases.length === 0) {
    throw new Error(
      `The GitHub Nextflow releases endpoint has no latest-${flavor} entry.`
    )
  }

  return matching_releases[0]
}

export async function get_nextflow_versions(): Promise<NextflowRelease[]> {
  const raw = await fetch_nextflow_versions_data()
  if (!is_record(raw)) {
    throw new Error(MALFORMED_METADATA_ERROR)
  }

  if (Array.isArray(raw.versions) && raw.versions.length === 0) {
    return await get_github_releases()
  }

  const versions = parse_versions_list(raw.versions)
  if (versions.length === 0) {
    // Every entry was malformed: fall back to the GitHub releases API.
    return await get_github_releases()
  }

  return versions
}

export async function get_latest_nextflow_version(
  flavor: string
): Promise<NextflowRelease> {
  const raw = await fetch_nextflow_versions_data()
  if (!is_record(raw)) {
    throw new Error(MALFORMED_METADATA_ERROR)
  }
  if (!is_record(raw.latest)) {
    throw new Error(INVALID_LATEST_ERROR)
  }

  if (Object.hasOwn(raw.latest, flavor)) {
    return get_latest_from_map(raw.latest, flavor)
  }

  return await get_github_latest_nextflow_version(flavor)
}
