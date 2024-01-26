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

export async function* release_iter(
  octokit: InstanceType<typeof GitHub>
): AsyncGenerator<NextflowRelease> {
  const iterator = octokit.paginate.iterator(
    octokit.rest.repos.listReleases,
    NEXTFLOW_REPO
  )
  let item_index = 0
  let release_items = []

  /* eslint-disable-next-line @typescript-eslint/unbound-method */
  const { next } = iterator[Symbol.asyncIterator]()

  let request = await next()

  return {
    async next() {
      if (item_index >= release_items.length) {
        if (request.done) {
          return { done: true }
        }

        request = await next()
        release_items = request.value.data
        item_index = 0
      }
      return {
        value: nextflow_release(release_items[item_index++]),
        done: false
      }
    }
  }
}

export async function pull_releases(
  ok: InstanceType<typeof GitHub>
): Promise<NextflowRelease[]> {
  return await ok.paginate(
    ok.rest.repos.listReleases,
    NEXTFLOW_REPO,
    response => {
      const all_releases: NextflowRelease[] = []
      const releases_data = response.data
      for (const release_data of releases_data) {
        all_releases.push(nextflow_release(release_data))
      }
      return all_releases
    }
  )
}

export async function pull_latest_stable_release(
  ok: InstanceType<typeof GitHub>
): Promise<NextflowRelease> {
  const { data: stable_release } = await ok.rest.repos.getLatestRelease(
    NEXTFLOW_REPO
  )

  return nextflow_release(stable_release)
}
