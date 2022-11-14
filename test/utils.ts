export function getToken(first: boolean): string {
  const token = process.env['GITHUB_TOKEN'] || ''
  if (!token && first) {
    /* eslint-disable-next-line no-console */
    console.warn(
      'Skipping GitHub tests. Set $GITHUB_TOKEN to run REST client and GraphQL client tests'
    )
    first = false
  }

  return token
}
