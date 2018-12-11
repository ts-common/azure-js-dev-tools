import { RunResult, runSync } from "../lib/run";
import { assert } from "chai";

describe("run.ts", function () {
  it("runSync()", function () {
    const mockResult: RunResult = {
      exitCode: 1,
      stdout: "hello",
      stderr: "there"
    };
    const result: RunResult = runSync("fakeCommand", ["arg1", "arg2"], { mockResult });
    assert.strictEqual(result, mockResult);
  });
});