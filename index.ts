import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as github from "@actions/github";
import * as tc from "@actions/tool-cache";
import retry = require("async-retry");
import semver = require("semver");

const NEXTFLOW_REPO = { owner: "nextflow-io", repo: "nextflow" };

async function all_nf_releases(ok) {
  const { data: releases } = await ok.rest.repos.listReleases(NEXTFLOW_REPO);

  return releases;
}

async function latest_stable_release_data(ok) {
  const { data: stable_release } = await ok.rest.repos.getLatestRelease(
    NEXTFLOW_REPO
  );

  return stable_release;
}

async function release_data(version, ok) {
  // Setup tag-based filtering
  let filter = (r) => {
    return semver.satisfies(r.tag_name, version, true);
  };

  // Check if the user passed a 'latest*' tag, and override filtering
  // accordingly
  if (version.includes("latest")) {
    if (version.includes("-everything")) {
      // No filtering
      filter = (r) => {
        return true;
      };
    } else if (version.includes("-edge")) {
      filter = (r) => {
        return r.tag_name.endsWith("-edge");
      };
    } else {
      // This is special: passing 'latest' or 'latest-stable' allows us to use
      // the latest stable GitHub release direct from the API
      const stable_release = await latest_stable_release_data(ok);
      return stable_release;
    }
  }

  // Get all the releases
  const all_releases = await all_nf_releases(ok);

  let matching_releases = all_releases.filter(filter);

  matching_releases.sort(function (x, y) {
    semver.compare(x.tag_name, y.tag_name, true);
  });

  return matching_releases[0];
}

function nextflow_bin_url(release, get_all) {
  const release_assets = release.assets;
  const all_asset = release_assets.filter((a) => {
    return a.browser_download_url.endsWith("-all");
  })[0];
  const regular_asset = release_assets.filter((a) => {
    return a.name == "nextflow";
  })[0];

  const dl_asset = get_all ? all_asset : regular_asset;

  return dl_asset.browser_download_url;
}

async function install_nextflow(url, version) {
  core.debug(`Downloading Nextflow from ${url}`);
  const nf_dl_path = await retry(
    async (bail) => {
      return await tc.downloadTool(url);
    },
    {
      onRetry: (err) => {
        core.debug(`Download of ${url} failed, trying again. Error ${err}`);
      },
    }
  );

  const temp_install_dir = fs.mkdtempSync(`nxf-${version}`);
  const nf_path = `${temp_install_dir}/nextflow`;

  fs.renameSync(nf_dl_path, nf_path);
  fs.chmodSync(nf_path, "0711");

  return temp_install_dir;
}

async function run() {
  // Read in the arguments
  const token = core.getInput("token");
  const version = core.getInput("version");
  const get_all = core.getBooleanInput("all");

  let resolved_version = "";

  // Setup the API
  let octokit = {};
  try {
    octokit = github.getOctokit(token);
  } catch (e) {
    core.setFailed(
      `Could not authenticate to GitHub Releases API with provided token\n${e.message}`
    );
  }

  // Get the release info for the desired release
  let release: any = {};
  try {
    release = await release_data(version, octokit);
    resolved_version = release.tag_name;
    core.info(
      `Input version '${version}' resolved to Nextflow ${release.name}`
    );
  } catch (e) {
    core.setFailed(
      `Could not retrieve Nextflow release matching ${version}.\n${e.message}`
    );
  }

  // Get the download url for the desired release
  let url = "";
  try {
    url = nextflow_bin_url(release, get_all);
    core.info(`Preparing to download from ${url}`);
  } catch (e) {
    core.setFailed(`Could not parse the download URL\n${e.message}`);
  }
  try {
    // Download Nextflow and add it to path
    let nf_path = "";
    nf_path = tc.find("nextflow", resolved_version);

    if (!nf_path) {
      core.debug(`Could not find Nextflow ${resolved_version} in cache`);
      const nf_install_path = await install_nextflow(url, resolved_version);

      nf_path = await tc.cacheDir(
        nf_install_path,
        "nextflow",
        resolved_version
      );
      core.debug(`Added Nextflow to cache: ${nf_path}`);

      fs.rmdirSync(nf_install_path, { recursive: true });
    } else {
      core.debug(`Using cached version of Nextflow: ${nf_path}`);
    }

    core.addPath(nf_path);

    core.info(`Downloaded \`nextflow\` to ${nf_path} and added to PATH`);
  } catch (e) {
    core.setFailed(e.message);
  }

  // Run Nextflow so it downloads its dependencies
  try {
    const nf_exit_code = await exec.exec("nextflow", ["help"])
  } catch (e) {
    core.warning("Nextflow appears to have installed correctly, but an error was thrown while running it.")
  }
}

run();
