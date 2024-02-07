# ![nf-core/setup-nextflow](docs/images/nfcore-setupnextflow_logo.png#gh-light-mode-only) ![nf-core/setup-nextflow](docs/images/nfcore-setupnextflow_logo_dark.png#gh-dark-mode-only)

[![Testing](https://github.com/nf-core/setup-nextflow/actions/workflows/example.yml/badge.svg)](https://github.com/nf-core/setup-nextflow/actions/workflows/example.yml)
[![codecov](https://codecov.io/gh/nf-core/setup-nextflow/branch/master/graph/badge.svg)](https://codecov.io/gh/nf-core/setup-nextflow)
[![MIT License](https://img.shields.io/github/license/nf-core/setup-nextflow?logo=opensourceinitiative)](https://github.com/nf-core/setup-nextflow/blob/master/LICENSE)
[![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/nf-core/setup-nextflow?logo=github)](https://github.com/nf-core/setup-nextflow/releases/latest)
[![Get from GitHub Actions](https://img.shields.io/static/v1?label=actions&message=marketplace&color=green&logo=githubactions)](https://github.com/marketplace/actions/setup-nextflow)

An action to install [Nextflow](https://nextflow.io) into a GitHub Actions workflow and make it available for subsequent steps.

## Quick start

```yaml
name: Example workflow
on: push
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: nf-core/setup-nextflow@v1
      - run: nextflow run ${GITHUB_WORKSPACE}
```

## Inputs

All inputs are optional! :sunglasses: By default, this action will install the [latest stable release](https://nextflow.io/docs/latest/getstarted.html#stable-edge-releases) of Nextflow. You can optionally pick a different version, or choose to install all versions.

### `version`

> **default: `latest`**

A version string to specify the version of Nextflow to install. This version number will try to resolve using [npm's semantic versioning](https://github.com/npm/node-semver), so

- `version: 21`
- `version: 21.10`
- `version: 21.10.6`

will all download Nextflow version 21.10.6 as of 13 June 2022. Since Nextflow does not use true semantic versioning, you should **always** specify at least the minor version (e.g. `version: 21.10`).

Edge releases are resolved as pre-release, see <https://github.com/npm/node-semver#prerelease-tags> for more details. In short, in nearly all cases, passing an `-edge` release to this action will need to specify the _exact_ edge release targeted.

There are three (technically four) aliases to assist in choosing up-to-date Nextflow versions.

- `version: latest-stable` (alias `version: latest`)

  This will download the latest _stable_ release of Nextflow.

- `version: latest-edge`

  This will download the latest _edge_ release of Nextflow. Note that edge releases may be _older_ than the latest stable release. See https://github.com/nextflow-io/nextflow/issues/2467

- `version: latest-everything`

  This will download the latest release of Nextflow, regardless of stable/edge status.

### `all`

> **default: `false`**

A boolean deciding whether to download the "all versions" distribution of Nextflow. May be useful for running tests against multiple versions downstream.

### `token`

> **default: `${{ secrets.GITHUB_TOKEN }}`**

> **:warning: This really shouldn't be changed. If you think this will fix a workflow problem, triple-check everything else first. :warning:**

This action locates the releases based upon the GitHub API, and requires an access token. The default token provided with all GitHub actions should be sufficient for all use cases on GitHub. Valid reasons to change this:

- GitHub Enterprise server (and only under some configurations)
- Testing workflows locally with [act](https://github.com/nektos/act)

## Outputs

There are no outputs from this action.

## Why was this action made?

[Slack link](https://nfcore.slack.com/archives/CE56GDKN0/p1655210460795839)

You may be asking, why not just a few yaml lines?

```yaml
- name: Install Nextflow
  env:
    NXF_VER: ${{ matrix.NXF_VER }}
  run: |
    wget -qO- get.nextflow.io | bash
    sudo mv nextflow /usr/local/bin/
```

The versioning. From the Nextflow install script you can't get `latest-edge` or `latest-everything` for example.
