/**
 * Houses the pertinent data that GitHub exposes for each Nextflow release
 */
export type NextflowRelease = {
  versionNumber: string
  isEdge: boolean
  binaryURL: string
  allBinaryURL: string
}
