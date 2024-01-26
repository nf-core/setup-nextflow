import * as github from "@actions/github"
import { GitHub } from "@actions/github/lib/utils"
import anyTest, { TestFn } from "ava" // eslint-disable-line import/no-unresolved

import { NextflowRelease } from "../src/nextflow-release"
import {
  pull_latest_stable_release,
  pull_releases
} from "../src/octokit-wrapper"
import { getToken } from "./utils"

const test = anyTest as TestFn<{
  token: string
  octokit: InstanceType<typeof GitHub>
}>

test.before(t => {
  const first = true
  const current_token = getToken(first)
  t.context = {
    token: current_token,
    octokit: github.getOctokit(current_token)
  }
})

async function get_latest_release(
  octokit: InstanceType<typeof GitHub>,
  use_latest_api: boolean
): Promise<NextflowRelease> {
  if (use_latest_api) {
    return await pull_latest_stable_release(octokit)
  } else {
    const all_releases = pull_releases(octokit)
    const first_response = await all_releases.next()
    const first_release = first_response.value
      ? first_response.value
      : ({} as NextflowRelease)
    return first_release
  }
}

const version_macro = test.macro(
  async (t, object_name: string, use_latest_api: boolean) => {
    const latest_release = await get_latest_release(
      t.context.octokit,
      use_latest_api
    )
    t.assert(latest_release[object_name])
  }
)

test(
  "OctoKit iterator returns semver-parsable version number",
  version_macro,
  "versionNumber",
  false
)
test(
  "OctoKit latest API returns semver-parable version number",
  version_macro,
  "versionNumber",
  true
)

const binary_url_macro = test.macro(
  async (t, get_all: boolean, use_latest_api: boolean) => {
    const latest_release = await get_latest_release(
      t.context.octokit,
      use_latest_api
    )
    const url = get_all ? latest_release.allBinaryURL : latest_release.binaryURL
    t.notThrows(() => new URL(url))
  }
)

test("Nextflow binary URL from iterator valid", binary_url_macro, false, false)
test("Nextflow binary URL from latest API valid", binary_url_macro, false, true)
test(
  "Nextflow all binary URL from iterator valid",
  binary_url_macro,
  true,
  false
)
test(
  "Nextflow all binary URL from latest API valid",
  binary_url_macro,
  true,
  true
)
