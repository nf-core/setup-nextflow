#!/bin/bash

# Check for the NXF_ACTION_VER environment variable
if [ -z "$NXF_ACTION_VER" ]; then
    echo "Error: NXF_ACTION_VER environment variable is not set." >&2
    echo "Set NXF_ACTION_VER to 'latest-stable', 'latest-edge', 'latest-everything', or an exact version number." >&2
    exit 1
fi

# Fetch JSON data
echo "Fetching Nextflow version data" >&2
JSON_URL="https://nf-co.re/nextflow_version"
JSON_DATA=$(curl -s "$JSON_URL")

if [ -z "$JSON_DATA" ]; then
    echo "Error: Unable to fetch JSON data from $JSON_URL."; exit 1
fi

# Determine version string
case $NXF_ACTION_VER in
    latest|latest-stable) VERSION_STRING=$(echo "$JSON_DATA" | jq -r '.latest.stable.version') ;;
    latest-edge)          VERSION_STRING=$(echo "$JSON_DATA" | jq -r '.latest.edge.version') ;;
    latest-everything)    VERSION_STRING=$(echo "$JSON_DATA" | jq -r '.latest.everything.version') ;;
    *)
        # Add 'v' prefix if not present
        [[ $NXF_ACTION_VER != v* ]] && NXF_ACTION_VER="v${NXF_ACTION_VER}"
        # Match exact version number in the "versions" list
        VERSION_STRING=$(echo "$JSON_DATA" | jq -r --arg ver "$NXF_ACTION_VER" '.versions[] | select(.version == $ver) | .version')
        if [ -z "$VERSION_STRING" ]; then
            echo "Error: Version '$NXF_ACTION_VER' not found."; exit 1
        fi ;;
esac

# Remove 'v' prefix
VERSION_STRING=${VERSION_STRING#v}

echo "Installing Nextflow version $VERSION_STRING" >&2
echo "version=$VERSION_STRING"

