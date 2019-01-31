import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { FakeRunner, RunResult, run } from "../lib/run";

describe("run.ts", function () {
  describe("FakeRunner", function () {
    describe("run()", function () {
      it("with no registered result and single string arg", async function () {
        const runner = new FakeRunner();
        const error: Error = await assertEx.throwsAsync(runner.run("git", "status"));
        assert.strictEqual(error.message, `No FakeRunner result has been registered for the command "git status".`);
      });

      it("with registered result and args array", async function () {
        const git = new FakeRunner();
        const registeredResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
        git.set("git fetch --prune", registeredResult);
        const result: RunResult = await git.run("git", ["fetch", "--prune"]);
        assert.deepEqual(result, registeredResult);
      });
    });
  });

  describe("run()", function () {
    this.timeout(10000);

    it("with dir", async function () {
      const result: RunResult = await run("dir");
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: false", async function () {
      const result: RunResult = await run("dir", [], { captureOutput: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, undefined);
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: true", async function () {
      const result: RunResult = await run("dir", [], { captureOutput: true });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: function", async function () {
      let capturedOutput = "";
      const result: RunResult = await run("dir", [], { captureOutput: (text: string) => capturedOutput += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(capturedOutput, "README.md");
      assertEx.contains(capturedOutput, "package.json");
      assert.strictEqual(result.stdout, undefined);
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureError: false", async function () {
      const result: RunResult = await run("dir", [], { captureError: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, undefined);
    });

    it("with dir and captureError: function", async function () {
      let capturedError = "";
      const result: RunResult = await run("dir", [], { captureError: (text: string) => capturedError += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, undefined);
      assert.strictEqual(capturedError, "");
    });

    it("with dir and log and showResult defined", async function () {
      let capturedOutput = "";
      const result: RunResult = await run("dir", [], { log: (text: string) => capturedOutput += text, showResult: true });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
      assertEx.contains(capturedOutput, "dir");
      assertEx.contains(capturedOutput, "Exit Code: 0");
      assertEx.contains(capturedOutput, "Output:");
      assertEx.contains(capturedOutput, "README.md");
    });
  });
});
