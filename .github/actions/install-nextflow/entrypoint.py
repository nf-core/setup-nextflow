#!/usr/bin/env python
import os
import os.path
import shutil
import subprocess
import urllib.request
import uuid

### GitHub Actions Tool Cache Reimplementation ###
# The following functions reimplement the core functionality of the GitHub
# Actions Tool Cache. The Tool Cache is the approved location to install new
# software in a GitHub Actions action. GitHub Actions documentation explicitly
# states that "The file paths on virtual machines are not static. Use the
# environment variables GitHub provides to construct file paths..."
# (https://docs.github.com/en/actions/reference/runners/github-hosted-runners#file-systems)

RUNNER_TOOL_CACHE = os.environ["RUNNER_TOOL_CACHE"]
RUNNER_TEMP = os.environ["RUNNER_TEMP"]

cache_hit = False


def create_tool_path(tool, version):
    """Creates a path within the Tool Cache for `tool`

    GitHub Actions expects the Tool Cache to be structured in the form of
    `${RUNNER_TOOL_CACHE}/tool_name/version`, and optionally in another
    subdirectory indicating the processor architecture. In the case of Nextflow,
    the processor architecture doesn't matter, so just create the expected path
    with the tool name and version name.
    """
    folder_path = os.path.join(
        RUNNER_TOOL_CACHE,
        tool,
        version,
    )
    if os.path.isdir(folder_path):
        shutil.rmtree(folder_path)
    os.makedirs(folder_path)
    return folder_path


def cache_file(source_file, target_file, tool, version):
    """Caches `source_file` in the Tool Cache"""
    destination_folder = create_tool_path(tool, version)

    # Copy the file. The official JavaScript implementation says this to avoid
    # antivirus blocking the move on Windows runners, but we should stick to
    # the official implementation as close as possible even if Nextflow doesn't
    # run on Windows machines
    shutil.copyfile(source_file, os.path.join(destination_folder, target_file))

    # For some reason, the reference implementation does not set the executable
    # bit, but we will at this point
    os.chmod(os.path.join(destination_folder, target_file), 0o755)

    # The official implementation writes an empty `.complete` file to indicate
    # that the file has finished copying. Not sure if this is required, but we
    # will follow suit.
    open(f"{destination_folder}.complete", "a").close()

    return destination_folder


def find_cache(tool, version):
    """Finds if the cache contains the tool at the specified version"""
    global cache_hit
    destination_folder = os.path.join(RUNNER_TOOL_CACHE, tool, version)
    if os.path.isfile(f"{destination_folder}.complete"):
        cache_hit = True
        return destination_folder
    else:
        return None


def download_tool(url):
    """Downloads a file to a random (non-conflicting) filename"""
    destination_path = os.path.join(RUNNER_TEMP, str(uuid.uuid4()))
    urllib.request.urlretrieve(url, destination_path)

    return destination_path


### End of GitHub Actions Tool Cache Reimplementation ###

GITHUB_OUTPUT = os.environ["GITHUB_OUTPUT"]
GITHUB_PATH = os.environ["GITHUB_PATH"]
GITHUB_ENV = os.environ["GITHUB_ENV"]
VERSION = os.environ["INPUT_VERSION"]


def github_output(key, val):
    """Writes a key-value pair to GitHub Actions output"""
    with open(GITHUB_OUTPUT, "a") as f:
        f.write(f"{key}={val}\n")


def github_path(dir):
    """Writes a directory to GitHub Actions PATH variable"""
    with open(GITHUB_PATH, "a") as f:
        f.write(f"{dir}\n")


def github_env(key, val):
    """Writes a key-value pair to GitHub Actions environment"""
    with open(GITHUB_ENV, "a") as f:
        f.write(f"{key}={val}\n")


# Ensure the version number has no leading v for internal variable purposes,
# but does for tag/download purposes
stripped_version = VERSION.strip("v")
canonical_version = f"v{stripped_version}"


# Find Nextflow in the cache (or not)
cache_dir = find_cache("nextflow", stripped_version)

# Download Nextflow if it is not in the cache
if cache_dir is None:
    cache_dir = cache_file(
        download_tool(
            f"https://github.com/nextflow-io/nextflow/releases/download/{canonical_version}/nextflow"
        ),
        "nextflow",
        "nextflow",
        stripped_version,
    )

# Add Nextflow to the PATH
github_path(cache_dir)
github_output("path", cache_dir)

# Export NXF_HOME, as that is key to making the cache work
github_env("NXF_HOME", "~/.nextflow")

# Export the canonical version of Nextflow installed
github_output("version", stripped_version)
github_env("NXF_VER", stripped_version)

# Export whether the cache was used or not
github_output("cache-hit", str(cache_hit).lower())

# Remove CAPSULE_LOG boilerplate
github_env("CAPSULE_LOG", "none")

# Run Nextflow to download the Java files that actually power it
# If the cache has been hit, then this step will run instantly, as
# the Java files will already have been restored
subprocess.run([f"{cache_dir}/nextflow", "-version"])

# Note: no `main()` function is implemented here and no doctests are written
# here because is intentionally non-functional and non-deterministic.
# Technically mocks and stubs could be used, but that would increase the
# complexity of this simple action, and would only really test if our mocks and
# stubs are working properly. In other words, I am allergic to mocks and stubs
# after watching Gary Bernhardt's talk "Boundaries."
