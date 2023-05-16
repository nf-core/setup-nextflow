import * as core from "@actions/core"
import { GitHub } from "@actions/github/lib/utils"
import * as tc from "@actions/tool-cache"
import retry from "async-retry"
import * as fs from "fs"
import semver from "semver"

const NEXTFLOW_REPO = { owner: "nextflow-io", repo: "nextflow" }

// HACK Private but I want to test this
export async function all_nf_releases(
  ok: InstanceType<typeof GitHub>
): Promise<object[]> {
  return await ok.paginate(
    ok.rest.repos.listReleases,
    NEXTFLOW_REPO,
    response => response.data
  )
}

// HACK Private but I want to test this
export async function latest_stable_release_data(
  ok: InstanceType<typeof GitHub>
): Promise<object> {
  const { data: stable_release } = await ok.rest.repos.getLatestRelease(
    NEXTFLOW_REPO
  )

  return stable_release
}

export async function release_data(
  version: string,
  ok: InstanceType<typeof GitHub>
): Promise<object> {
  // Setup tag-based filtering
  let filter = (r: object): boolean => {
    return semver.satisfies(r["tag_name"], version, true)
  }

  // Check if the user passed a 'latest*' tag, and override filtering
  // accordingly
  if (version.includes("latest")) {
    if (version.includes("-everything")) {
      // No filtering
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      filter = (r: object) => {
        return true
      }
    } else if (version.includes("-edge")) {
      filter = r => {
        return r["tag_name"].endsWith("-edge")
      }
    } else {
      // This is special: passing 'latest' or 'latest-stable' allows us to use
      // the latest stable GitHub release direct from the API
      const stable_release = await latest_stable_release_data(ok)
      return stable_release
    }
  }

  // Get all the releases
  const all_releases: object[] = await all_nf_releases(ok)

  const matching_releases = all_releases.filter(filter)

  matching_releases.sort((x, y) => {
    // HACK IDK why the value flip is necessary with the return
    return semver.compare(x["tag_name"], y["tag_name"], true) * -1
  })

  return matching_releases[0]
}

export function nextflow_bin_url(release: object, get_all: boolean): string {
  const release_assets = release["assets"]
  const all_asset = release_assets.filter((a: object) => {
    return a["browser_download_url"].endsWith("-all")
  })[0]
  const regular_asset = release_assets.filter((a: object) => {
    return a["name"] === "nextflow"
  })[0]

  const dl_asset = get_all ? all_asset : regular_asset

  return dl_asset.browser_download_url
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

  fs.renameSync(nf_dl_path, nf_path)
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
