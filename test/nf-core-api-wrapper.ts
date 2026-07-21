import test from "ava"
import { Readable } from "stream"

import { NextflowRelease } from "../src/nextflow-release.js"
import {
  get_latest_from_payload,
  get_latest_nextflow_version,
  get_nextflow_versions,
  parse_nextflow_versions_payload
} from "../src/nf-core-api-wrapper.js"

function nf_release_gen(version_number: string): NextflowRelease {
  const is_edge = version_number.endsWith("-edge")
  return {
    version: version_number,
    isEdge: is_edge,
    downloadUrl: `https://github.com/nextflow-io/nextflow/releases/download/${version_number}/nextflow`,
    downloadUrlAll: `https://github.com/nextflow-io/nextflow/releases/download/${version_number}/nextflow-${version_number.replace(
      "v",
      ""
    )}-all`
  }
}

const stable_release = nf_release_gen("v26.04.0")

test("null metadata payload throws actionable error", t => {
  const error = t.throws(() => parse_nextflow_versions_payload(null))
  t.regex(error.message, /malformed metadata/)
})

test.serial("invalid downloaded JSON throws actionable error", async t => {
  Reflect.set(global, "TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY", () =>
    Readable.from(["not JSON"])
  )

  try {
    const error = await t.throwsAsync(get_nextflow_versions())
    t.regex(error.message, /malformed metadata/)
  } finally {
    Reflect.deleteProperty(
      global,
      "TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY"
    )
  }
})

test("metadata with null versions throws actionable error", t => {
  const error = t.throws(() =>
    parse_nextflow_versions_payload({ versions: null, latest: {} })
  )
  t.regex(error.message, /malformed metadata/)
})

test("metadata with empty versions array throws actionable error", t => {
  const error = t.throws(() =>
    parse_nextflow_versions_payload({ versions: [], latest: {} })
  )
  t.regex(error.message, /returned no versions/)
})

test("metadata with null latest throws actionable error", t => {
  const error = t.throws(() =>
    parse_nextflow_versions_payload({
      versions: [stable_release],
      latest: null
    })
  )
  t.regex(error.message, /invalid 'latest' entries/)
})

test("metadata with invalid latest flavor throws actionable error", t => {
  const error = t.throws(() =>
    parse_nextflow_versions_payload({
      versions: [stable_release],
      latest: { stable: null }
    })
  )
  t.regex(error.message, /malformed metadata for latest-stable/)
})

test("missing latest flavor throws actionable error", t => {
  const payload = parse_nextflow_versions_payload({
    versions: [stable_release],
    latest: {}
  })

  const error = t.throws(() => get_latest_from_payload(payload, "stable"))
  t.regex(error.message, /no latest-stable entry/)
})

test.serial("latest version resolves when versions are empty", async t => {
  Reflect.set(global, "TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY", () =>
    Readable.from([
      JSON.stringify({
        versions: [],
        latest: { stable: stable_release }
      })
    ])
  )

  try {
    const release = await get_latest_nextflow_version("stable")
    t.is(release.version, stable_release.version)
  } finally {
    Reflect.deleteProperty(
      global,
      "TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY"
    )
  }
})
