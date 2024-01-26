import * as core from "@actions/core"
import * as exec from "@actions/exec"
import * as tc from "@actions/tool-cache"
import * as fs from "fs"
import semver from "semver"

import {
  check_cache,
  get_nextflow_release,
  install_nextflow
} from "./functions"
import { NextflowRelease } from "./nextflow-release"
import {
  pull_latest_stable_release,
  pull_releases,
  setup_octokit
} from "./octokit-wrapper"

async function run(): Promise<void> {
  // CAPSULE_LOG leads to a bunch of boilerplate being output to the logs: turn
  // it off
  core.exportVariable("CAPSULE_LOG", "none")

  // Read in the arguments
  const token = core.getInput("token")
  const version = core.getInput("version")
  const get_all = core.getBooleanInput("all")
  const cooldown = Number(core.getInput("cooldown"))
  const max_retries = Number(core.getInput("max-retries"))

  // Check the cache for the Nextflow version that matched last time
  if (check_cache(version)) {
    return
  }

  // Setup the API
  const octokit = await setup_octokit(token, cooldown, max_retries)

  // Get the release info for the desired release
  let release = {} as NextflowRelease
  let resolved_version = ""
  try {
    if (version === "latest" || version === "latest-stable") {
      release = await pull_latest_stable_release(octokit)
    } else {
      const release_iterator = pull_releases(octokit)
      release = await get_nextflow_release(version, release_iterator)
    }
    resolved_version = release.versionNumber
    core.info(
      `Input version '${version}' resolved to Nextflow ${release["name"]}`
    )
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(
        `Could not retrieve Nextflow release matching ${version}.\n${e.message}`
      )
    }
  }

  try {
    // Download Nextflow and add it to path
    if (!check_cache(resolved_version)) {
      const nf_install_path = await install_nextflow(release, get_all)
      const cleaned_version = String(semver.clean(resolved_version, true))
      const nf_path = await tc.cacheDir(
        nf_install_path,
        "nextflow",
        cleaned_version
      )
      core.addPath(nf_path)
      core.info(`Downloaded \`nextflow\` to ${nf_path} and added to PATH`)
      core.debug(`Added Nextflow to cache: ${nf_path}`)
      fs.rmdirSync(nf_install_path, { recursive: true })
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(e.message)
    }
  }

  // Run Nextflow so it downloads its dependencies
  try {
    await exec.exec("nextflow", ["help"])
  } catch (e: unknown) {
    if (e instanceof Error) {
      // fail workflow if Nextflow run does not succeed
      core.setFailed(`Could not run 'nextflow help'. Error: ${e.message}`)
    }
  }
}

run()
