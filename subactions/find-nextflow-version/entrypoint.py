#!/usr/bin/env python
import json
import os
import urllib.parse
import urllib.request

# Required parameters are specified with os.environ
# JAVA_VERSION can be empty, so allow it to be None with os.environ.get
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
GITHUB_OUTPUT = os.environ["GITHUB_OUTPUT"]
VERSION = os.environ["INPUT_VERSION"]
JAVA_VERSION = os.environ.get("INPUT_JAVA_VERSION")


def get_latest_version_string(stable=False):
    """Get the latest Nextflow version number from the GitHub API

    Keyword arguments:
    stable -- Restrict the version to stable (i.e. not `-edge`) only (default False)
    """
    base_url = "https://api.github.com/repos/nextflow-io/nextflow/releases"
    if stable:
        base_url = f"{base_url}/latest"
    query_params = urllib.parse.urlencode({"per_page": "1"})
    full_url = f"{base_url}?{query_params}"
    request = urllib.request.Request(full_url, method="GET")
    request.add_header("Accept", "application/vnd.github+json")
    request.add_header("Authorization", f"Bearer {GITHUB_TOKEN}")
    request.add_header("X-GitHub-Api-Version", "2026-03-10")
    with urllib.request.urlopen(request) as response:
        j_data = json.loads(response.read().decode("utf-8"))
        if stable:
            return j_data["tag_name"]
        else:
            return j_data[0]["tag_name"]


def github_output(key, val):
    """Writes a key-value pair to GitHub Actions output"""
    with open(GITHUB_OUTPUT, "a") as f:
        f.write(f"{key}={val}\n")


def split_version(version):
    """Splits a version string into a tuple for comparison, losing modifiers"""
    return tuple(int(x) for x in version.strip("v").strip("-edge").split("."))


def java_version(nextflow_version):
    """Returns the Java version compatible with this version of Nextflow"""
    # If the user specified a Java version, then we will go with their judgement
    # and skip this check
    if JAVA_VERSION:
        return JAVA_VERSION

    # Based on parsing every version of Nextflow, versions v18.10.1-v24.10.6 are
    # compatible with Java 8, while Nextflow v24.11.0-edge and above require
    # Java 17. There has been no version of Nextflow that requires any other
    # version of Java to this point, but when that day comes, this function will
    # need to be updated.
    if split_version(nextflow_version) > split_version("v24.11.0-edge"):
        return "17"
    else:
        return "8"


# There are three possibilities for version strings:
# 1. The "stable" version
# 2. The "edge" version - due to Nextflow nomenclature, this can actually result
#    in a stable release if the stable release is newer than the edge release
# 3. A specific version number
#
# It is important to note that this version of the action drops support for the
# all/dist versions of Nextflow, and also drops support for the "latest-edge"
# version

if VERSION == "stable" or VERSION == "edge":
    nv = get_latest_version_string(stable=(VERSION == "stable"))
else:
    nv = VERSION

jv = java_version(nv)
github_output("version", nv)
github_output("java-version", jv)
