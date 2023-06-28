import fetch from "node-fetch"

export function getToken(first: boolean): string {
  const token = process.env["GITHUB_TOKEN"] || ""
  if (!token && first) {
    /* eslint-disable-next-line no-console */
    console.warn(
      "Skipping GitHub tests. Set $GITHUB_TOKEN to run REST client and GraphQL client tests"
    )
    first = false
  }

  return token
}

/**
 * Retrieves the release from a GitHub repository. This function allows to fetch
 * either the latest release or the latest pre-release ("edge" release).
 *
 * @param {string} repo - The GitHub repository to fetch the release from,
 * in the format 'owner/repo'.
 * @param {boolean} [prerelease] - If true, fetches the latest pre-release.
 * If false or undefined, fetches the latest release regardless of whether
 * it's a pre-release or not.
 *
 * @returns {Promise<string>} A Promise that resolves to a string representing the tag name
 * of the found release. If no release is found, the Promise resolves to 'Release not found'.
 */
export async function getReleaseTag(
  repo: string,
  prerelease?: boolean
): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases`)
  const releases = await response.json()

  const release = releases.find(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (rel: any) => prerelease === undefined || rel.prerelease === prerelease
  )

  return release ? release.tag_name : "No release found"
}
