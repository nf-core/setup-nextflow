import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import retry from "async-retry"
import * as fs from "fs"
import semver from "semver"

import { NextflowRelease } from "./nextflow-release"

function tag_filter(version: string): (r: NextflowRelease) => Boolean {
  // Setup tag-based filtering
  let filter = (r: NextflowRelease): boolean => {
    return semver.satisfies(r.versionNumber, version, true)
  }

  // Check if the user passed a 'latest*' tag, and override filtering
  // accordingly
  if (version.includes("latest")) {
    if (version.includes("-everything")) {
      // No filtering
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      filter = (r: NextflowRelease) => {
        return true
      }
    } else if (version.includes("-edge")) {
      filter = (r: NextflowRelease) => {
        return r.versionNumber.endsWith("-edge")
      }
    } else {
      filter = (r: NextflowRelease) => {
        return !r.isEdge
      }
    }
  }
  return filter
}

async function get_latest_everything_nextflow_release(
  releases: AsyncGenerator<NextflowRelease>
): Promise<NextflowRelease> {
  // Need to make sure we aren't in the edge case where a patch release is
  // more recent chronologically than the edge release
  let latest_release = {} as NextflowRelease

  for await (const release of releases) {
    // First iteration:
    if (Object.keys(latest_release).length === 0) {
      // If the most recent release is an edge release, then we have nothing to
      // worry about, return it.
      if (release.isEdge) {
        return release
      }
      // Ok, so the most recent release is a stable release. We need to keep
      // tabs on it
      latest_release = release
      continue
    }

    // A larger version number that is older than the "latest" release
    // indicates that we've hit an edge release that is more up-to-date
    // than a patch release. Return it.
    if (semver.gt(release.versionNumber, latest_release.versionNumber, true)) {
      return release
    }

    // A smaller version number that is also an edge release indicates that the
    // chronologically most recent release is also the most up-to-date
    if (
      release.isEdge &&
      semver.lt(release.versionNumber, latest_release.versionNumber, true)
    ) {
      return latest_release
    }

    // Once we've hit the major.minor.0 of the version that is the most recent
    // patch, we know that we would have traversed any edge releases along the
    // way, so check to see if we've hit that point yet.
    const latest_release_major = semver.major(
      latest_release.versionNumber,
      true
    )
    const latest_release_minor = semver.minor(
      latest_release.versionNumber,
      true
    )
    const latest_release_minver = `${latest_release_major}.${latest_release_minor}.0`
    if (semver.eq(release.versionNumber, latest_release_minver, true)) {
      return latest_release
    }
  }

  // We should never get here, but just in case
  return {} as NextflowRelease
}

async function get_latest_edge_nextflow_release(
  releases: AsyncGenerator<NextflowRelease>
): Promise<NextflowRelease> {
  // Because we don't have to worry about crossing between edge and stable
  // releases, we can just return the first edge release we come across
  for await (const release of releases) {
    if (release.isEdge) {
      return release
    }
  }

  // We should never get here, but just in case
  return {} as NextflowRelease
}

async function get_latest_stable_nextflow_release(
  releases: AsyncGenerator<NextflowRelease>
): Promise<NextflowRelease> {
  // Because we don't have to worry about crossing between edge and stable
  // releases, we can just return the first stable release we come across
  for await (const release of releases) {
    if (!release.isEdge) {
      return release
    }
  }

  // We should never get here, but just in case
  return {} as NextflowRelease
}

export async function get_nextflow_release(
  version: string,
  releases: AsyncGenerator<NextflowRelease>
): Promise<NextflowRelease> {
  // First, check to see if we are using a "latest-*" version system, and return
  // early
  if (version === "latest-everything") {
    return await get_latest_everything_nextflow_release(releases)
  }
  if (version === "latest-edge") {
    return await get_latest_edge_nextflow_release(releases)
  }
  if (version === "latest" || version === "latest-stable") {
    return await get_latest_stable_nextflow_release(releases)
  }

  // The releases are sent in reverse chronological order
  // If we are sent a numbered tag, then back through the list until we find
  // a release that fulfils the requested version number
  for await (const release of releases) {
    if (semver.satisfies(release.versionNumber, version, true)) {
      return release
    }
  }

  // We should never get here, but just in case
  return {} as NextflowRelease
}

export async function install_nextflow(
  release: NextflowRelease,
  get_all: boolean
): Promise<string> {
  const url = get_all ? release.allBinaryURL : release.binaryURL
  const version = release.versionNumber

  core.debug(`Downloading Nextflow from ${url}`)
  const nf_dl_path = await retry(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async bail => {
      return await tc.downloadTool(url)
    },
    {
      onRetry: err => {
        core.debug(`Download of ${url} failed, trying again. Error ${err}`)
      }
    }
  )

  const temp_install_dir = fs.mkdtempSync(`nxf-${version}`)
  const nf_path = `${temp_install_dir}/nextflow`

  try {
    fs.renameSync(nf_dl_path, nf_path)
  } catch (err: unknown) {
    core.debug(`Failed to rename file: ${err}`)
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
  const resolved_version = String(cleaned_version)

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
