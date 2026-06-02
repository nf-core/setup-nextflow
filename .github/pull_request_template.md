<!--
# nf-core/setup-nextflow pull request

Many thanks for contributing to nf-core/setup-nextflow!

Please fill in the appropriate checklist below (delete whatever is not relevant).
These are the most common things requested on pull requests (PRs).

Remember that PRs should be made against the dev branch, unless you're preparing a pipeline release.

Learn more about contributing: [CONTRIBUTING.md](https://github.com/nf-core/setup-nextflow/tree/master/.github/CONTRIBUTING.md)
-->

## PR checklist

- [ ] This comment contains a description of changes (with reason)
- [ ] If you've fixed a bug or added code that should be tested, add tests!
- [ ] Make sure your code lints and passes formatting checks (`ruff check`)
- [ ] Ensure the unit test suite passes (`python -m doctest .github/actions/find-nextflow-version/entrypoint.py -v`)
- [ ] Ensure the integration test suite passes (`act -j example-usage -s GITHUB_TOKEN="$(gh auth token)"`)
- [ ] `CHANGELOG.md` is updated
- [ ] `README.md` is updated
