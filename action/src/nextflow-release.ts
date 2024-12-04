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
