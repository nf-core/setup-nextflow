import * as core from "@actions/core"
import { getOctokitOptions, GitHub } from "@actions/github/lib/utils"
import { throttling } from "@octokit/plugin-throttling"

import { nextflow_release, NextflowRelease } from "./nextflow-release"

const NEXTFLOW_REPO = { owner: "nextflow-io", repo: "nextflow", per_page: 100 }

export async function setup_octokit(
  github_token: string,
  cooldown = 60,
  max_retries = 3
): Promise<InstanceType<typeof GitHub>> {
  const throttledOctokit = GitHub.plugin(throttling)
  let octokit = {} as InstanceType<typeof GitHub>
  try {
    octokit = new throttledOctokit(
      getOctokitOptions(github_token, {
        throttle: {
          onRateLimit: (retryAfter, options, ok, retryCount) => {
            ok.log.warn(
              `Request quota exhausted for request ${options.method} ${options.url}`
            )

            if (retryCount < max_retries) {
              ok.log.info(`Retrying after ${retryAfter} seconds!`)
              return true
            }
          },
          onSecondaryRateLimit: (retryAfter, options, ok, retryCount) => {
            ok.log.warn(
              `SecondaryRateLimit detected for request ${options.method} ${options.url}`
            )

            if (retryCount < max_retries) {
              octokit.log.info(`Retrying after ${retryAfter} seconds!`)
              return true
            }
          },
          fallbackSecondaryRateRetryAfter: cooldown
        }
      })
    )
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
