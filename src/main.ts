import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as github from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'
import * as tc from '@actions/tool-cache'
import {install_nextflow, nextflow_bin_url, release_data} from './functions'

async function run(): Promise<void> {
  // Set environment variables
  core.exportVariable('CAPSULE_LOG', 'none')

  // Read in the arguments
  const token = core.getInput('token')
  const version = core.getInput('version')
  const get_all = core.getBooleanInput('all')

  let resolved_version = ''

  // Setup the API
  let octokit: InstanceType<typeof GitHub> | undefined
  try {
    octokit = github.getOctokit(token)
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(
        `Could not authenticate to GitHub Releases API with provided token\n${e.message}`
      )
    }
  }

  // Get the release info for the desired release
  let release = {}
  try {
    if (octokit !== undefined) {
      release = await release_data(version, octokit)
    }
    resolved_version = release['tag_name']
    core.info(
      `Input version '${version}' resolved to Nextflow ${release['name']}`
    )
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(
        `Could not retrieve Nextflow release matching ${version}.\n${e.message}`
      )
    }
  }

  // Get the download url for the desired release
  let url = ''
  try {
    url = nextflow_bin_url(release, get_all)
    core.info(`Preparing to download from ${url}`)
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(`Could not parse the download URL\n${e.message}`)
    }
  }
  try {
    // Download Nextflow and add it to path
    let nf_path = ''
    nf_path = tc.find('nextflow', resolved_version)

    if (!nf_path) {
      core.debug(`Could not find Nextflow ${resolved_version} in cache`)
      const nf_install_path = await install_nextflow(url, resolved_version)

      nf_path = await tc.cacheDir(nf_install_path, 'nextflow', resolved_version)
      core.debug(`Added Nextflow to cache: ${nf_path}`)

      fs.rmdirSync(nf_install_path, {recursive: true})
    } else {
      core.debug(`Using cached version of Nextflow: ${nf_path}`)
    }

    core.addPath(nf_path)

    core.info(`Downloaded \`nextflow\` to ${nf_path} and added to PATH`)
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.setFailed(e.message)
    }
  }

  // Run Nextflow so it downloads its dependencies
  try {
    await exec.exec('nextflow', ['help'])
  } catch (e: unknown) {
    if (e instanceof Error) {
      core.warning(
        'Nextflow appears to have installed correctly, but an error was thrown while running it.'
      )
    }
  }
}

run()
