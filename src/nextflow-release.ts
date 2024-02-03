/**
 * Houses the pertinent data that GitHub exposes for each Nextflow release
 */
export type NextflowRelease = {
  version: string
  isEdge: boolean
  downloadUrl: string
  downloadUrlAll: string
  published_at?: string
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
