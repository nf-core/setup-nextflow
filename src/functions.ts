import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import retry from "async-retry"
import * as fs from "fs"
import semver from "semver"

import { NextflowRelease } from "./nextflow-release"

export async function get_nextflow_release(
  version: string,
  releases: NextflowRelease[] | AsyncGenerator<NextflowRelease>
): Promise<NextflowRelease> {
  // The releases are sent in reverse chronological order
  // If we are sent a numbered tag, then back through the list until we find
  // a release that fulfils the requested version number
  for await (const release of releases) {
    if (semver.satisfies(release.version, version, true)) {
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
