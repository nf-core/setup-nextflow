#!/usr/bin/env bash

# Customise the terminal command prompt
echo "export PROMPT_DIRTRIM=2" >> $HOME/.bashrc
echo "export PS1='\[\e[3;36m\]\w ->\[\e[0m\\] '" >> $HOME/.bashrc
export PROMPT_DIRTRIM=2
export PS1='\[\e[3;36m\]\w ->\[\e[0m\\] '

# Update Nextflow
nextflow self-update

# Install act
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | bash

# Install the GitHub CLI (mostly for getting API tokens)
conda install gh --channel conda-forge

# Install pre-commit hooks
pip install prek
prek install --install-hooks

# Update welcome message
echo "Welcome to the nf-core/setup-nextflow devcontainer!" > /usr/local/etc/vscode-dev-containers/first-run-notice.txt
