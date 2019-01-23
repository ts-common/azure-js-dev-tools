import { assertEx } from "../lib/assertEx";
import { RunResult, runSync, runAsync, FakeRunner, createRunResult } from "../lib/run";
import { assert } from "chai";

describe("run.ts", function () {
  describe("FakeRunner", function () {
    describe("runSync()", function () {
      it("with no registered result and single string arg", function () {
        const runner = new FakeRunner();
        const error: Error = assertEx.throws(() => runner.runSync("git", "status"));
        assert.strictEqual(error.message, `No FakeRunner result has been registered for the command "git status".`);
      });

      it("with registered result and args array", function () {
        const git = new FakeRunner();
        const registeredResult: RunResult = createRunResult(1, "a", "b");
        git.set("git fetch --prune", registeredResult);
        const result: RunResult = git.runSync("git", ["fetch", "--prune"]);
        assert.deepEqual(result, registeredResult);
      });
    });
  });

  describe("runSync()", function () {
    this.timeout(10000);

    it("with dir", function () {
      const result: RunResult = runSync("dir");
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: false", function () {
      const result: RunResult = runSync("dir", [], { captureOutput: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(result.stdout, null);
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: function", function () {
      let capturedOutput = "";
      const result: RunResult = runSync("dir", [], { captureOutput: (text: string) => capturedOutput += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(capturedOutput, result.stdout);
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureError: false", function () {
      const result: RunResult = runSync("dir", [], { captureError: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(result.stderr, null);
    });

    it("with dir and captureError: function", function () {
      let capturedError = "";
      const result: RunResult = runSync("dir", [], { captureError: (text: string) => capturedError += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assert.strictEqual(result.stderr, "");
      assert.strictEqual(capturedError, result.stderr);
    });
  });

  describe("runAsync()", function () {
    this.timeout(10000);

    it("with dir", async function () {
      const result: RunResult = await runAsync("dir", []);
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "README.md");
      assertEx.contains(result.stdout, "package.json");
      assertEx.contains(result.stdout, "tslint.json");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: false", async function () {
      const result: RunResult = await runAsync("dir", [], { captureOutput: false });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, "");
      assert.strictEqual(result.stderr, "");
    });

    it("with dir and captureOutput: function", async function () {
      const capturedOutput: string[] = [];
      const result: RunResult = await runAsync("dir", [], { captureOutput: (text: string) => capturedOutput.push(text) });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, "");
      assert(capturedOutput.length >= 1);
      const output = capturedOutput.join();
      assertEx.contains(output, "README.md");
      assertEx.contains(output, "package.json");
      assertEx.contains(output, "tslint.json");
      assert.strictEqual(result.stderr, "");
    });
  });
});
