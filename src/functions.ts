import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import retry from "async-retry"
import * as fs from "fs"
import semver from "semver"

import { NextflowRelease } from "./NextflowRelease"

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

  const matching_releases = all_releases.filter(filter)

  matching_releases.sort((x, y) => {
    // HACK IDK why the value flip is necessary with the return
    return semver.compare(x["tag_name"], y["tag_name"], true) * -1
  })

  return matching_releases[0]
}

export async function install_nextflow(
  url: string,
  version: string
): Promise<string> {
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
