import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import retry from "async-retry"
import * as fs from "fs"
import semver from "semver"

import { NextflowRelease } from "./nextflow-release.js"

const EXACT_VERSION_PATTERN = /^v?(\d+)\.(\d{1,2})\.(\d+)(-edge)?$/

export function isExactVersion(version: string): boolean {
  return EXACT_VERSION_PATTERN.test(version.trim())
}

export function releaseFromExactVersion(version: string): NextflowRelease {
  const trimmed = version.trim()
  const match = EXACT_VERSION_PATTERN.exec(trimmed)
  if (!match) {
    throw new Error(`Invalid exact Nextflow version '${version}'.`)
  }

  const [, major, minor, patch, edge = ""] = match
  const tag = `v${major}.${minor.padStart(2, "0")}.${patch}${edge}`
  const version_without_v = tag.replace(/^v/, "")
  const is_edge = tag.endsWith("-edge")
  const first_dist_version = is_edge ? "24.07.0-edge" : "24.10.0"
  const archive_suffix = semver.gte(version_without_v, first_dist_version, true)
    ? "dist"
    : "all"

  return {
    version: tag,
    isEdge: is_edge,
    downloadUrl: `https://github.com/nextflow-io/nextflow/releases/download/${tag}/nextflow`,
    downloadUrlAll: `https://github.com/nextflow-io/nextflow/releases/download/${tag}/nextflow-${version_without_v}-${archive_suffix}`
  }
}

export async function get_nextflow_release(
  version: string,
  releases: NextflowRelease[] | AsyncGenerator<NextflowRelease>
): Promise<NextflowRelease> {
  if (isExactVersion(version)) {
    return releaseFromExactVersion(version)
  }

  // The releases are sent in reverse chronological order
  // If we are sent a numbered tag, then back through the list until we find
  // a release that fulfils the requested version number
  for await (const release of releases) {
    if (semver.satisfies(release.version, version, true)) {
      return release
    }
  }

  throw new Error(
    `No Nextflow release found matching '${version}'. Use a fully specified version such as 26.04.0, or check that the nf-co.re/nextflow_version metadata endpoint is available.`
  )
}

export async function install_nextflow(
  release: NextflowRelease,
  get_all: boolean
): Promise<string> {
  const url = get_all ? release.downloadUrlAll : release.downloadUrl
  const version = release.version

  core.debug(`Downloading Nextflow from ${url}`)
  const nf_dl_path = await retry(
    async _bail => {
      return await tc.downloadTool(url)
    },
    {
      onRetry: err => {
        core.debug(
          `Download of ${url} failed, trying again. Error ${String(err)}`
        )
      }
    }
  )

  const temp_install_dir = fs.mkdtempSync(`nxf-${version}`)
  const nf_path = `${temp_install_dir}/nextflow`

  try {
    fs.renameSync(nf_dl_path, nf_path)
  } catch (err: unknown) {
    core.debug(`Failed to rename file: ${String(err)}`)
    fs.copyFileSync(nf_dl_path, nf_path)
    fs.unlinkSync(nf_dl_path)
  }
  fs.chmodSync(nf_path, "0711")

  return temp_install_dir
}

export function check_cache(version: string): boolean {
  // A 'latest*' version indicates that a cached version would be invalid until
  // the version is resolved: abort
  if (version.includes("latest")) {
    return false
  }
  const cleaned_version = semver.clean(version, true)
  if (cleaned_version === null) {
    return false
  }
  const resolved_version = cleaned_version

  const nf_path = tc.find("nextflow", resolved_version)
  if (!nf_path) {
    core.debug(`Could not find Nextflow ${resolved_version} in the tool cache`)
    return false
  } else {
    core.debug(`Found Nextflow ${resolved_version} at path '${nf_path}'`)
    core.debug(`Adding '${nf_path}' to PATH`)
    core.addPath(nf_path)
    return true
  }
}
