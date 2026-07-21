import { info } from "@actions/core"
import { downloadTool } from "@actions/tool-cache"
import retry from "async-retry"
import { readFileSync } from "fs"

import { NextflowRelease } from "./nextflow-release.js"

const MALFORMED_METADATA_ERROR =
  "The nf-co.re/nextflow_version endpoint returned malformed metadata."
const EMPTY_VERSIONS_ERROR =
  "The nf-co.re/nextflow_version endpoint returned no versions. Partial version aliases require this metadata; use a fully specified version such as 26.04.0 instead."
const INVALID_LATEST_ERROR =
  "The nf-co.re/nextflow_version endpoint returned malformed metadata: missing or invalid 'latest' entries."

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

  const versions: NextflowRelease[] = []
  for (const element of raw_versions) {
    if (!is_nextflow_release(element)) {
      throw new Error(MALFORMED_METADATA_ERROR)
    }
    versions.push(element)
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
  latest: Record<string, NextflowRelease>,
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

async function fetch_nextflow_versions_data(): Promise<unknown> {
  // Occasionally the connection is reset for unknown reasons
  // In those cases, retry the download
  const versionsFile = await retry(
    async () => {
      return await downloadTool("https://nf-co.re/nextflow_version")
    },
    {
      retries: 5,
      onRetry: (err: Error) => {
        info(`Download of versions.json failed, trying again. Error: ${err}`)
      }
    }
  )

  try {
    return JSON.parse(readFileSync(versionsFile).toString())
  } catch {
    throw new Error(MALFORMED_METADATA_ERROR)
  }
}

export async function get_nextflow_versions(): Promise<NextflowRelease[]> {
  const raw = await fetch_nextflow_versions_data()
  if (!is_record(raw)) {
    throw new Error(MALFORMED_METADATA_ERROR)
  }

  return parse_versions_list(raw.versions)
}

export async function get_latest_nextflow_version(
  flavor: string
): Promise<NextflowRelease> {
  const raw = await fetch_nextflow_versions_data()
  if (!is_record(raw)) {
    throw new Error(MALFORMED_METADATA_ERROR)
  }

  return get_latest_from_map(parse_latest_map(raw.latest), flavor)
}
