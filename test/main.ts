import test from "ava" // eslint-disable-line import/no-unresolved
import * as cp from "child_process"
import * as path from "path"
import * as process from "process"

// eslint-disable-next-line ava/no-skip-test
test.skip("test runs", t => {
  process.env.INPUT_VERSION = "v22.10.2"
  const np = process.execPath
  const ip = path.join(__dirname, "..", "lib", "src", "main.js")
  const options: cp.ExecFileSyncOptions = {
    env: process.env
  }
  // eslint-disable-next-line no-console
  console.log(cp.execFileSync(np, [ip], options).toString())
  t.pass()
})
