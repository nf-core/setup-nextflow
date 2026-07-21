import test from "ava"
import { Readable } from "stream"

import { get_nextflow_versions } from "../src/nf-core-api-wrapper.js"

test.failing("invalid downloaded JSON throws actionable error", async t => {
  Reflect.set(global, "TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY", () =>
    Readable.from(["not JSON"])
  )

  try {
    const error = await t.throwsAsync(get_nextflow_versions())
    t.regex(error.message, /malformed metadata/)
  } finally {
    Reflect.deleteProperty(
      global,
      "TEST_DOWNLOAD_TOOL_RESPONSE_MESSAGE_FACTORY"
    )
  }
})
