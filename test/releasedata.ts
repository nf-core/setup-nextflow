import * as github from "@actions/github"
import { GitHub } from "@actions/github/lib/utils"
import anyTest, { TestFn } from "ava" // eslint-disable-line import/no-unresolved

import { nextflow_bin_url } from "../src/nextflow-release"
import { all_nf_release_data } from "../src/octokit-wrapper"
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

const exists_macro = test.macro(async (t, object_name: string) => {
  const all_releases = await all_nf_release_data(t.context.octokit)
  const first_release = all_releases[0]
  t.assert(first_release.hasOwnProperty(object_name))
})

test("OctoKit returns tag", exists_macro, "tag_name")
test("Octokit returns prerelease", exists_macro, "prerelease")
test("Octokit returns assets", exists_macro, "assets")

const binary_url_macro = test.macro(async (t, get_all: boolean) => {
  const all_releases = await all_nf_release_data(t.context.octokit)
  const first_release = all_releases[0]
  const url = nextflow_bin_url(first_release, get_all)
  t.notThrows(() => new URL(url))
})

test("Nextflow binary URL valid", binary_url_macro, false)
test("Nextflow 'all' binary URL valid", binary_url_macro, true)
