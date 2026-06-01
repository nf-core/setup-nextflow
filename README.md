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
      - uses: nf-core/setup-nextflow@v4
      - run: nextflow run ${GITHUB_WORKSPACE}
```

## Breaking changes in v4

- `version: latest-stable` and `version: latest` have been renamed to `version: stable`
- `version: latest-all` has been renamed to `version: edge`
- Support for `version: latest-edge` has been removed
- Support for the `all` input has been removed

## Inputs

All inputs are optional! :sunglasses: By default, this action will install the [latest stable release](https://nextflow.io/docs/latest/getstarted.html#stable-edge-releases) of Nextflow. You can optionally pick a different version, or choose to install all versions.

### `version`

> **default: `stable`**

A version string to specify the version of Nextflow to install. All version numbers must be **exact**. Version number may include the `v` prefix optionally.

There are two aliases to assist in choosing up-to-date Nextflow versions.

- `version: stable`

  This will download the latest _stable_ release of Nextflow.

- `version: edge`

  This will download the latest release of Nextflow, regardless of stable/edge status. Note that edge releases may be _older_ than the latest stable release. See https://github.com/nextflow-io/nextflow/issues/2467

### `secrets`

> **default: none**

Nextflow secrets to set, specified as `KEY=VALUE` pairs (one per line).
`VALUE` will only be logged as a masked value.
Typically, `VALUE` will be a GitHub repository secret:

```yaml
- uses: nf-core/setup-nextflow@v4
  with:
    secrets: |
      MY_SECRET=${{ secrets.MY_GITHUB_SECRET }}
      ANOTHER_SECRET=${{ secrets.ANOTHER_GITHUB_SECRET }}
```

These are equivalent to running `nextflow secrets set MY_SECRET <value>` before your workflow steps.

## Outputs

- **`version`**: The version of Nextflow that was installed. This value does not have a leading `v` and is also assigned to the `NXF_VER` variable in the resulting environment.
- **`path`**: The path to where the Nextflow executable has been installed
- **`tool-cache-hit`**: A boolean value to indicate an exact match was found in the tool cache for this version of Nextflow. Can be used for debugging self-hosted runners.
- **`cache-hit`**: A boolean value to indicate an exact match was found in the JAR capsule cache for this version of Nextflow
- All outputs from [setup-java](https://github.com/actions/setup-java/) are output using the `java-` prefix

## Resulting environment

This action will modify the following environment variables in all subsequent
steps:

- **`PATH`**: The directories containing the `java` and `nextflow` executables will be placed on the path
- **`NXF_VER`**: Set to the version number of the resolved Nextflow version installed
- **`NXF_HOME`**: Hard-coded to `~/.nextflow` in order to facilitate capsule download caching
- \*\*`JAVA_HOME`: Set to the directory where Java was installed by [setup-java](https://github.com/actions/setup-java/)
- **`CAPSULE_LOG`**: Set to `none` to make logs less verbose

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

**Reason 1**: versioning. From the Nextflow install script you can't get the latest version regardless of `-edge` status for example.

**Reason 2**: caching. This action automatically caches the Java install, the Nextflow install, and the Nextflow capsule download for faster subsequent runs.

**Reason 3**: Automatic Java versioning. This action will automatically download the correct version of Java for your selected version of Nextflow.
