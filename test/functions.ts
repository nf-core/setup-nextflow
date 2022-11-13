import * as functions from '../src/functions'
import * as github from '@actions/github'
import anyTest, {TestFn} from 'ava'

const test = anyTest as TestFn<{foo: string}>

test.before(t => {
  const first = true
  const current_token = getToken(first)
  t.context = {token: current_token}
  t.context = {octokit: github.getOctokit(current_token)}
})

test('all_nf_releases', async t => {
  const result = await functions.all_nf_releases(t.context.octokit)
  t.is(typeof result, 'object')
})

test('lastest_stable_release_data', async t => {
  const result = await functions.latest_stable_release_data(t.context.octokit)
  t.is(typeof result, 'object')
  t.is(result.tag_name, 'v22.10.2')
})

test('release_data', async t => {
  const result = await functions.release_data('v22.10.2', t.context.octokit)
  t.is(result.tag_name, 'v22.10.2')
})

test.todo('nextflow_bin_url')
test.todo('install_nextflow')

function getToken(first: boolean): string {
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
