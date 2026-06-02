# `nf-core/setup-nextflow`: Contributing Guidelines

Hi there!
Many thanks for taking an interest in improving nf-core/setup-nextflow.

> [!NOTE]
> If you need help using or modifying nf-core/setup-nextflow then the best place to ask is on the nf-core Slack [#tools](https://nfcore.slack.com/channels/tools) channel ([join our Slack here](https://nf-co.re/join/slack)).

## Project architecture

`setup-nextflow` is a [Composite GitHub Action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action) that performs four steps:

1. It resolves an ambiguous "recent" tag like `stable` or `edge` to a concrete Nextflow version number with the correct version of Java to support it
2. It installs the correct version of Java using [actions/setup-java](https://github.com/actions/setup-java)
3. It installs and caches the version of Nextflow found in Step 1
4. It (optionally) sets up any provided [Nextflow secrets](https://docs.seqera.io/nextflow/secrets)

Steps 1, 3, and 4 are self-contained Python scripts. Steps 1, 2, and 3 are separated because they form a set of sequential dependencies, while Step 4 is separated as it is a completely separate functionality.

Step 1 uses the GitHub API to retrieve a list of the 30 most recent Nextflow versions to determine which should be installed. However, it only accesses the API if and only if an ambiguous tag (`stable` or `edge`) is used, and only makes 1 call. This is to help reduce API calls and avoid hitting rate limits.

## Development tools

To run and test this project locally, you will need:

1. [Docker](https://docs.docker.com/engine/install/)
2. [Act](https://nektosact.com/installation/index.html)
3. [Python](https://www.python.org/downloads/)
4. [Ruff](https://github.com/astral-sh/ruff)
5. [Prek](https://github.com/j178/prek)
6. [gh cli](https://cli.github.com/)

[Another engine that is compatible with the Docker Engine API may be used by act](https://nektosact.com/usage/custom_engine.html), but since feature sets and environment are very different between engines, please ensure that failures are reproducible using vendored Docker before opening an issue.

The entrypoint scripts are all written in Python, and designed to have no external dependencies, i.e. they can be run using any recent (>3.4) version of Python without installing packages.

In order to run the entrypoints, you will need to bootstrap environment variables found in the GitHub Actions runners. To do so, run

```bash
source boostrap.sh
```

from the repository root. This will set all Runner variables to temporary files or directories, and will populate a GitHub Token from the gh cli.

## Code formatting

### Ruff

All Python code in nf-core/setup-nextflow must be passed through the [Ruff code linter and formatter](https://github.com/astral-sh/ruff). This ensures a harmonised code formatting style throughout the codebase, from all contributors.

You can run Ruff on the command line (it's included in the dev dependencies) - eg. to run recursively on the whole repository:

```bash
ruff format .
```

Alternatively, Ruff has [integrations for most common editors](https://github.com/astral-sh/ruff-lsp) and VSCode(https://github.com/astral-sh/ruff-vscode) to automatically format code when you hit save.

There is an automated CI check that runs when you open a pull-request to nf-core/setup-nextflow that will fail if any code does not adhere to Ruff formatting.

Ruff has been adopted for linting and formatting in replacement of Black, isort (for imports) and pyupgrade. It also includes Flake8.

### pre-commit hooks

This repository comes with pre-commit hooks for ruff and Prettier, managed by [prek](https://github.com/j178/prek). Pre-commit hooks automatically run checks before a commit is committed into the git history. If all checks pass, the commit is made, if files are changed by the pre-commit hooks, the user is informed and has to stage the changes and attempt the commit again.

You can use the pre-commit hooks if you like, but you don't have to. The CI on Github will run the same checks as the tools installed with prek. If the pre-commit checks pass, then the same checks in the CI will pass, too.

You can install the pre-commit hooks into the development environment by running the following command in the root directory of the repository.

```bash
prek install --install-hooks
```

You can also run all pre-commit hooks without making a commit:

```bash
prek run --all-files
```

## Contribution workflow

If you'd like to write some code for nf-core/setup-nextflow, the standard workflow is as follows:

1. Check if there is an issue about your idea in the [nf-core/setup-nextflow issues](https://github.com/nf-core/setup-nextflow/issues) and create one if there isn't one already. Assign yourself to the issue you intend to work on so that others know you're working on this and we can avoid duplicating work
2. [Fork](https://help.github.com/en/github/getting-started-with-github/fork-a-repo) the [nf-core/setup-nextflow repository](https://github.com/nf-core/setup-nextflow) to your GitHub account
3. Make the necessary changes / additions within your forked repository
4. Submit a Pull Request against the `master` branch and wait for the code to be reviewed and merged

If you're not used to this workflow with git, you can start with some [docs from GitHub](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests) or even their [excellent `git` resources](https://try.github.io/).

## Unit Tests

Unit tests of deterministic Python functions are written using [Python doctests](https://docs.python.org/3/library/doctest.html). When adding new code, please try to consider if you can isolate the logic (`if` statements and flow) from the environment (API calls, file writes, etc.), and write doctests for the logic functions.

Execute doctests with the following command for each testable script file:

```bash
python -m doctest ./path/to/script/file.py -v
```

Some files do not contain unit tests, as we do not implement stubs/mocks/etc. for testing non-deterministic code.

When you create a pull request with changes, [GitHub Actions](https://github.com/features/actions) will run automatic tests. Typically, pull-requests are only fully reviewed when these tests are passing, though of course we can help out before then.

## Integration Tests

A mock workflow is contained with the [workflows/example.yml](../.github/workflows/example.yml) that can be used to test the end result of the GitHub Action within a GitHub Action-like environment.
`act` is configured via the [.actrc](..//.actrc) file to pull the correct Docker images for bootstrapping a GitHub Actions Environment automatically.
You should test your changes locally by running your code through the integration tests via `act`.
Execute the integration tests with the following command:

```bash
act -j example-usage -s GITHUB_TOKEN="$(gh auth token)"
```

> [!NOTE] > `.actrc` is configured to work correctly on x86_64/amd64 Linux machines and Macs, and Apple Silicon Macs.
> The configuration is known to not function correctly on arm64 Linux machines (e.g. Asahi Linux or Raspberry Pi).
> In order to run tests on an arm64 Linux machine, remove the `--container-architecture linux/amd64` line from `.actrc` temporarily.

## GitHub Codespaces

This repo includes a devcontainer configuration which will create a GitHub Codespaces for Nextflow development! This is an online developer environment that runs in your browser, complete with VSCode and a terminal.

To get started:

- Open the repo in [Codespaces](https://github.com/nf-core/tools/codespaces)
- Tools installed
  - nf-core
  - Nextflow
  - Docker
  - Act
  - Python
  - Prek
  - gh

Devcontainer specs:

- [DevContainer config](../.devcontainer/devcontainer.json)

## Getting help

For further information/help, please don't hesitate to get in touch on the nf-core Slack [#tools](https://nfcore.slack.com/channels/tools) channel ([join our Slack here](https://nf-co.re/join/slack)).
