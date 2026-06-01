# usage: source bootstrap.sh
# Used to setup files and directories that are present in the GitHub Actions
# runner environment so that the scripts can be tested locally
export GITHUB_TOKEN=$(gh auth token)
export GITHUB_OUTPUT=$(mktemp)
export RUNNER_TOOL_CACHE=$(mktemp -d)
export GITHUB_PATH=$(mktemp)
export GITHUB_ENV=$(mktemp)
export RUNNER_TEMP=$(mktemp -d)
