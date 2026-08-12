import test from "ava"

import { NextflowRelease } from "../src/nextflow-release.js"
import {
  get_latest_from_payload,
  get_latest_nextflow_version,
  get_nextflow_versions,
  parse_nextflow_versions_payload,
  set_downloader
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

// Serves a fixed body for every download, regardless of URL.
function fixed_downloader(body: unknown): () => Promise<string> {
  const json = JSON.stringify(body)
  return () => Promise.resolve(json)
}

// Serves a body chosen by matching a substring against the requested URL, so
// multi-endpoint flows (nf-co.re + paginated GitHub) don't depend on call
// order. Routes are checked longest-match-first so e.g. "&page=1" doesn't
// get shadowed by a broader match.
function routed_downloader(
  routes: [match: string, body: unknown][]
): (_url: string) => Promise<string> {
  const sorted = [...routes].sort((a, b) => b[0].length - a[0].length)
  return url => {
    const route = sorted.find(([match]) => url.includes(match))
    if (!route) {
      throw new Error(`No stub response configured for ${url}`)
    }
    return Promise.resolve(JSON.stringify(route[1]))
  }
}

test("null metadata payload throws actionable error", t => {
  const error = t.throws(() => parse_nextflow_versions_payload(null))
  t.regex(error.message, /malformed metadata/)
})

test.serial("invalid downloaded JSON throws actionable error", async t => {
  const previous = set_downloader(() => Promise.resolve("not JSON"))

  try {
    const error = await t.throwsAsync(get_nextflow_versions())
    t.regex(error.message, /malformed metadata/)
  } finally {
    set_downloader(previous)
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
  const previous = set_downloader(
    fixed_downloader({ versions: [], latest: { stable: stable_release } })
  )

  try {
    const release = await get_latest_nextflow_version("stable")
    t.is(release.version, stable_release.version)
  } finally {
    set_downloader(previous)
  }
})

test.serial(
  "malformed unrelated flavor doesn't block a valid requested flavor",
  async t => {
    const previous = set_downloader(
      fixed_downloader({
        versions: [],
        latest: { stable: stable_release, edge: null }
      })
    )

    try {
      const release = await get_latest_nextflow_version("stable")
      t.is(release.version, stable_release.version)
    } finally {
      set_downloader(previous)
    }
  }
)

test.serial(
  "malformed version entries are skipped, valid ones still resolve",
  async t => {
    // Mirrors the live endpoint: historical releases with a single asset are
    // emitted without a downloadUrlAll field.
    const malformed_release = {
      version: "v0.12.2",
      isEdge: false,
      downloadUrl:
        "https://github.com/nextflow-io/nextflow/releases/download/v0.12.2/nextflow"
    }
    const previous = set_downloader(
      fixed_downloader({
        versions: [stable_release, malformed_release],
        latest: { stable: stable_release }
      })
    )

    try {
      const releases = await get_nextflow_versions()
      t.deepEqual(
        releases.map(release => release.version),
        [stable_release.version]
      )
    } finally {
      set_downloader(previous)
    }
  }
)

test.serial(
  "all-malformed version entries fall back to GitHub releases",
  async t => {
    const previous = set_downloader(
      routed_downloader([
        [
          "nf-co.re",
          {
            versions: [{ version: "v0.12.2", isEdge: false }],
            latest: {}
          }
        ],
        ["&page=1", [{ tag_name: "v26.04.6" }]]
      ])
    )

    try {
      const releases = await get_nextflow_versions()
      t.true(releases.some(release => release.version === "v26.04.6"))
    } finally {
      set_downloader(previous)
    }
  }
)

test.serial("empty metadata falls back to GitHub releases", async t => {
  const previous = set_downloader(
    routed_downloader([
      ["nf-co.re", { versions: [], latest: {} }],
      [
        "&page=1",
        Array.from({ length: 100 }, (_, patch) => ({
          tag_name: `v26.07.${String(patch)}-edge`
        }))
      ],
      ["&page=2", [{ tag_name: "v26.04.6" }]]
    ])
  )

  try {
    const releases = await get_nextflow_versions()
    t.true(releases.some(release => release.version === "v26.04.6"))

    const release = await get_latest_nextflow_version("stable")
    t.is(release.version, "v26.04.6")
  } finally {
    set_downloader(previous)
  }
})
