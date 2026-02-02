import { info } from "@actions/core"
import { downloadTool } from "@actions/tool-cache"
import retry from "async-retry"
import { readFileSync } from "fs"

import { NextflowRelease } from "./nextflow-release"

interface NextflowVersionsData {
  versions: unknown[]
  latest: Record<string, unknown>
}

async function fetch_nextflow_versions_data(): Promise<NextflowVersionsData> {
  // Occasionally the connection is reset for unknown reasons
  // In those cases, retry the download
  const versionsFile = await retry(
    async () => {
      return await downloadTool("https://nf-co.re/nextflow_version")
    },
    {
      retries: 5,
      onRetry: (err: Error) => {
        info(`Download of versions.json failed, trying again. Error: ${err}`)
      }
    }
  )

  return JSON.parse(
    readFileSync(versionsFile).toString()
  ) as NextflowVersionsData
}

export async function get_nextflow_versions(): Promise<NextflowRelease[]> {
  const version_dataset = await fetch_nextflow_versions_data()
  const versions = version_dataset.versions
  const nextflow_releases: NextflowRelease[] = []
  for (const element of versions) {
    const release = element as NextflowRelease
    nextflow_releases.push(release)
  }
  return nextflow_releases
}

export async function get_latest_nextflow_version(
  flavor: string
): Promise<NextflowRelease> {
  const version_dataset = await fetch_nextflow_versions_data()
  const latest_versions = version_dataset.latest
  const latest_version = latest_versions[flavor] as NextflowRelease
  return latest_version
}
