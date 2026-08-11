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
      - uses: actions/checkout@v6
      - uses: nf-core/setup-nextflow@v2
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

### `install-java`

> **default: `true`**

Nextflow requires Java, so by default this action installs it using [`actions/setup-java`](https://github.com/actions/setup-java) before installing Nextflow.

Set this to `false` if you provide your own Java installation (for example a pre-installed or self-managed JDK on a self-hosted runner) and want to skip that step:

```yaml
- uses: nf-core/setup-nextflow@v3
  with:
    install-java: false
```

When skipping the Java installation, it is up to you to make sure that a Java version [supported by Nextflow](https://nextflow.io/docs/latest/install.html#requirements) is available, either via `JAVA_HOME` or on the `PATH`. The action checks for one before installing Nextflow and fails with an explanatory error if it can't find any, rather than leaving you with a Nextflow installation that breaks the first time it runs. It does not check _which_ version it found, so a Java that is too old for your chosen Nextflow version is still your responsibility.

### `java-version`

> **default: `17`**

The Java version to install. Passed to the `java-version` input of [`actions/setup-java`](https://github.com/actions/setup-java). Ignored if `install-java` is `false`.

### `java-distribution`

> **default: `temurin`**

The Java distribution to install. Passed to the `distribution` input of [`actions/setup-java`](https://github.com/actions/setup-java). Ignored if `install-java` is `false`.

### `secrets`

> **default: none**

Nextflow secrets to set, specified as `KEY=VALUE` pairs (one per line).
`VALUE` will only be logged as a masked value.
Typically, `VALUE` will be a GitHub repository secret:

```yaml
- uses: nf-core/setup-nextflow@v2
  with:
    secrets: |
      MY_SECRET=${{ secrets.MY_GITHUB_SECRET }}
      ANOTHER_SECRET=${{ secrets.ANOTHER_GITHUB_SECRET }}
```

These are equivalent to running `nextflow secrets set MY_SECRET <value>` before your workflow steps.

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
