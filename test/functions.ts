import test from "ava" // eslint-disable-line import/no-unresolved

import * as functions from "../src/functions"
import { NextflowRelease } from "../src/nextflow-release"

// The Nextflow releases we are going to use for testing follow a regular
// pattern: create a mock function to bootstrap some test data without repeating
// ourselves
function nf_release_gen(version_number: string): NextflowRelease {
  const is_edge = version_number.endsWith("-edge")
  const release: NextflowRelease = {
    versionNumber: version_number,
    isEdge: is_edge,
    binaryURL: `https://github.com/nextflow-io/nextflow/releases/download/${version_number}/nextflow`,
    allBinaryURL: `https://github.com/nextflow-io/nextflow/releases/download/${version_number}/nextflow-${version_number.replace(
      "v",
      ""
    )}-all`
  }
  return release
}

// A mock set of Nextflow releases
const edge_is_newer = [
  nf_release_gen("v23.09.1-edge"),
  nf_release_gen("v23.04.3"),
  nf_release_gen("v23.04.2")
]
const edge_is_older = [
  nf_release_gen("v23.04.3"),
  nf_release_gen("v23.04.2"),
  nf_release_gen("v23.03.0-edge")
]

/*
  The whole reason this action exists is to handle the cases where a final
  release is the "bleeding edge" release, rather than the "edge" release, even
  though that's what the name would imply. Therefore, we need to test that the
  'latest-everything' parameter can find the correct one regardless of whether
  an "edge" release or a stable release is the true latest
*/
const release_filter_macro = test.macro(
  async (
    t,
    input_version: string,
    expected_version: string,
    releases: NextflowRelease[]
  ) => {
    const matched_release = await functions.get_nextflow_release(
      input_version,
      releases
    )
    t.is(matched_release.versionNumber, expected_version)
  }
)
test(
  "Latest-everything install with newer edge release",
  release_filter_macro,
  "latest-everything",
  "v23.09.1-edge",
  edge_is_newer
)
test(
  "Latest-everything install with older edge release",
  release_filter_macro,
  "latest-everything",
  "v23.04.3",
  edge_is_older
)
test(
  "Latest-edge install with newer edge release",
  release_filter_macro,
  "latest-edge",
  "v23.09.1-edge",
  edge_is_newer
)
test(
  "Latest-edge install with older edge release",
  release_filter_macro,
  "latest-edge",
  "v23.03.0-edge",
  edge_is_older
)
test(
  "Latest-stable install with newer edge release",
  release_filter_macro,
  "latest",
  "v23.04.3",
  edge_is_newer
)
test(
  "Latest-stable install with older edge release",
  release_filter_macro,
  "latest",
  "v23.04.3",
  edge_is_older
)
test(
  "Fully versioned tag release",
  release_filter_macro,
  "v23.04.2",
  "v23.04.2",
  edge_is_newer
)
test(
  "Partially versioned tag release",
  release_filter_macro,
  "v23.04",
  "v23.04.3",
  edge_is_newer
)

test.todo("install_nextflow")
