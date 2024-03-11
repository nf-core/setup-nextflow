import { restoreCache } from "@actions/cache"
import * as core from "@actions/core"
import { downloadTool } from "@actions/tool-cache"
import retry from "async-retry"
import * as fs from "fs"
import os from "os"
import path from "path"
import semver from "semver"

import { NextflowRelease } from "./nextflow-release"

const nextflow_path = path.join(os.homedir(), "nextflow")

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

  core.debug(`Downloading Nextflow from ${url}`)
  const nf_dl_path = await retry(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async bail => {
      return await downloadTool(url)
    },
    {
      onRetry: err => {
        core.debug(`Download of ${url} failed, trying again. Error ${err}`)
      }
    }
  )

  try {
    fs.renameSync(nf_dl_path, nextflow_path)
  } catch (err: unknown) {
    core.debug(`Failed to rename file: ${err}`)
    fs.copyFileSync(nf_dl_path, nextflow_path)
    fs.unlinkSync(nf_dl_path)
  }
  fs.chmodSync(nextflow_path, "0711")

  return nextflow_path
}

export async function check_cache(version: string): Promise<boolean> {
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
  const key = `nextflow-${resolved_version}`
  const restore_key = await restoreCache([nextflow_path], key, [])
  if (!restore_key) {
    core.debug(`Could not find Nextflow ${resolved_version} in the cache`)
    return false
  } else {
    core.debug(`Found Nextflow ${resolved_version} from key ${restore_key}`)
    core.debug(`Adding '${nextflow_path}' to PATH`)
    core.addPath(nextflow_path)
    return true
  }
}
