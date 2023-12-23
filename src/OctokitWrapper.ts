import * as core from "@actions/core"
import * as github from "@actions/github"
import { GitHub } from "@actions/github/lib/utils"

import { nextflow_release, NextflowRelease } from "./NextflowRelease"

const NEXTFLOW_REPO = { owner: "nextflow-io", repo: "nextflow" }

export async function setup_octokit(
  github_token: string
): Promise<InstanceType<typeof GitHub>> {
  let octokit = {} as InstanceType<typeof GitHub>
  try {
    octokit = github.getOctokit(github_token)
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(
        `Could not authenticate to GitHub Releases API with provided token\n${e.message}`
      )
    }
  }
  return octokit
}

export async function pull_releases(
  octokit: InstanceType<typeof GitHub>
): Promise<NextflowRelease[]> {
  const all_release_data: object[] = await all_nf_release_data(octokit)
  const all_releases: NextflowRelease[] = []
  for (const data of all_release_data) {
    all_releases.push(nextflow_release(data))
  }

  return all_releases
}

export async function all_nf_release_data(
  ok: InstanceType<typeof GitHub>
): Promise<object[]> {
  return await ok.paginate(
    ok.rest.repos.listReleases,
    NEXTFLOW_REPO,
    response => response.data
  )
}

export async function latest_stable_release_data(
  ok: InstanceType<typeof GitHub>
): Promise<object> {
  const { data: stable_release } = await ok.rest.repos.getLatestRelease(
    NEXTFLOW_REPO
  )

  return stable_release
}

export async function pull_latest_stable_release(
  ok: InstanceType<typeof GitHub>
): Promise<NextflowRelease> {
  const latest_release = await latest_stable_release_data(ok)
  return nextflow_release(latest_release)
}
