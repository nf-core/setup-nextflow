import * as github from "@actions/github"
import { GitHub } from "@actions/github/lib/utils"
import anyTest, { TestFn } from "ava" // eslint-disable-line import/no-unresolved

import { release_data } from "../src/functions"
import { getReleaseTag, getToken } from "./utils"

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

const macro = test.macro(async (t, version: string) => {
  let expected
  if (version === "latest-stable") {
    expected = await getReleaseTag("nextflow-io/nextflow", false)
  } else if (version === "latest-edge") {
    expected = await getReleaseTag("nextflow-io/nextflow", true)
  } else if (version === "latest-everything") {
    expected = await getReleaseTag("nextflow-io/nextflow", undefined)
  } else {
    expected = version
  }
  const result = await release_data(version, t.context["octokit"])
  t.is(result["tag_name"], expected)
})

test("hard version", macro, "v22.10.2")
test("latest-stable", macro, "latest-stable")
test("latest-edge", macro, "latest-edge")
test("latest-everything", macro, "latest-everything")
