# ![nf-core/setup-nextflow](docs/images/nfcore-setupnextflow_logo.png#gh-light-mode-only) ![nf-core/setup-nextflow](docs/images/nfcore-setupnextflow_logo_dark.png#gh-dark-mode-only)

[![Testing](https://github.com/nf-core/setup-nextflow/actions/workflows/example.yml/badge.svg)](https://github.com/nf-core/setup-nextflow/actions/workflows/example.yml)
[![codecov](https://codecov.io/gh/nf-core/setup-nextflow/branch/master/graph/badge.svg)](https://codecov.io/gh/nf-core/setup-nextflow)
[![MIT License](https://img.shields.io/github/license/nf-core/setup-nextflow?logo=opensourceinitiative)](https://github.com/nf-core/setup-nextflow/blob/master/LICENSE)
[![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/nf-core/setup-nextflow?logo=github)](https://github.com/nf-core/setup-nextflow/releases/latest)
[![Get from GitHub Actions](https://img.shields.io/static/v1?label=actions&message=marketplace&color=green&logo=githubactions)](https://github.com/marketplace/actions/setup-nextflow)

An action to install Java and [Nextflow](https://nextflow.io) into a GitHub Actions workflow and make it available for subsequent steps.

## Quick start

```yaml
name: Example workflow
on: push
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nf-core/setup-nextflow@v3
      - run: nextflow run ${GITHUB_WORKSPACE}
```

> [!IMPORTANT]
> **v3 Release Changes**
>
> Version 3 of this action includes breaking changes from v2:
> * Installation of `-all` distributions is no longer possible
> * Matching partial Nextflow version numbers no longer works (eg. `24.4`)
>
> If you need either of these features, please continue using v2 of the action.


## Inputs

All inputs are optional! :sunglasses: By default, this action will install the [latest stable release](https://nextflow.io/docs/latest/install.html#stable-and-edge-releases) of Nextflow. You can optionally pick a different version.

### `version`

> **default: `latest-stable`**

A version string to specify the version of Nextflow to install.

- `version: latest-stable` (alias `version: latest`)

  This will download the latest _stable_ release of Nextflow.

- `version: latest-edge`

  This will download the latest _edge_ release of Nextflow. Note that edge releases may be _older_ than the latest stable release. See https://github.com/nextflow-io/nextflow/issues/2467

- `version: latest-everything`

  This will download the latest release of Nextflow, regardless of stable/edge status.

- `version: <string>`

  This will attempt to download the exact version specified. For example: `version: 24.11.0-edge`

### `java-version`

> **default: `17`**

A version string to specify the version of Java to use.
Nextflow supports Java 21 as of Nextflow `24.05.0-edge` onwards.
Java 11 was deprecated from `24.11.0-edge` onwards.


### `java-distribution`

> **default: `zulu`**

A string to specify the Java distribution to use.
See [actions/setup-java](https://github.com/actions/setup-java?tab=readme-ov-file#supported-distributions) for more details.

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
