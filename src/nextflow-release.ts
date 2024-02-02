/**
 * Houses the pertinent data that GitHub exposes for each Nextflow release
 */
export type NextflowRelease = {
  versionNumber: string
  isEdge: boolean
  binaryURL: string
  allBinaryURL: string
  published_at?: string
}

/**
 * Converts the raw OctoKit data into a structured NextflowRelease
 * @param data A "release" data struct from OctoKit
 * @returns `data` converted into a `NextflowRelease`
 */
export function nextflow_release(data: object): NextflowRelease {
  const nf_release: NextflowRelease = {
    versionNumber: data["tag_name"],
    isEdge: data["prerelease"],
    binaryURL: nextflow_bin_url(data, false),
    allBinaryURL: nextflow_bin_url(data, true)
  }
  return nf_release
}

/**
 * Gets the download URL of a Nextflow binary
 * @param release A "release" data struct from OctoKit
 * @param get_all Whether to return the url for the "all" variant of Nextflow
 * @returns The URL of the Nextflow binary
 */
export function nextflow_bin_url(release: object, get_all: boolean): string {
  const release_assets = release["assets"]
  const all_asset = release_assets.filter((a: object) => {
    return a["browser_download_url"].endsWith("-all")
  })[0]
  const regular_asset = release_assets.filter((a: object) => {
    return a["name"] === "nextflow"
  })[0]

  const dl_asset = get_all ? all_asset : regular_asset
  if (dl_asset) {
    return dl_asset.browser_download_url
  } else {
    // Old pre-release versions of Nextflow didn't have an "all" variant. To
    // avoid downstream errors, substitute the regular url here.
    return regular_asset.browser_download_url
  }
}
