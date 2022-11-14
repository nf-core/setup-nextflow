import * as functions from '../src/functions'
import {getToken} from './utils'
import * as github from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'
import anyTest, {TestFn} from 'ava' // eslint-disable-line import/no-unresolved

const test = anyTest as TestFn<{
  token: string
  octokit: InstanceType<typeof GitHub>
}>

test.before(t => {
  const first = true
  const current_token = getToken(first)
  t.context = {token: current_token, octokit: github.getOctokit(current_token)}
})

test('all_nf_releases', async t => {
  const result = await functions.all_nf_releases(t.context['octokit'])
  t.is(typeof result, 'object')
})

test('lastest_stable_release_data', async t => {
  const result = await functions.latest_stable_release_data(
    t.context['octokit']
  )
  t.is(typeof result, 'object')
  t.is(result['tag_name'], 'v22.10.2')
})

test.todo('nextflow_bin_url')
test.todo('install_nextflow')
