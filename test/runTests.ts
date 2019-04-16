import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { FakeRunner, RunResult, run } from "../lib/run";

describe("run.ts", function () {
  describe("FakeRunner", function () {
    describe("run()", function () {
      it("with no registered result and single string arg", async function () {
        const runner = new FakeRunner();
        const error: Error = await assertEx.throwsAsync(runner.run("git", "status"));
        assert.strictEqual(error.message, `No FakeRunner result has been registered for the command "git status" at "${process.cwd()}".`);
      });

      it("with registered result and args array", async function () {
        const runner = new FakeRunner();
        const registeredResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
        runner.set({ command: "git fetch --prune", result: registeredResult });
        const result: RunResult = await runner.run("git", ["fetch", "--prune"]);
        assert.deepEqual(result, registeredResult);
      });

      it("with undefined registered result", async function () {
        const runner = new FakeRunner();
        runner.set({ command: "git fetch --prune" });
        const result: RunResult = await runner.run("git", ["fetch", "--prune"]);
        assert.deepEqual(result, { exitCode: 0 });
      });

      it("with passthrough command", async function () {
        const innerRunner = new FakeRunner();
        const registeredResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
        innerRunner.set({ command: "git fetch --prune", result: registeredResult });

        const runner = new FakeRunner(innerRunner);
        runner.passthrough("git fetch --prune");

        const result: RunResult = await runner.run("git", ["fetch", "--prune"]);
        assert.deepEqual(result, registeredResult);
      });

      it("with registered command with different executionFolderPath", async function () {
        const runner = new FakeRunner();
        runner.set({ command: "fake-command", executionFolderPath: "/a/b/c" });
        const error: Error = await assertEx.throwsAsync(runner.run("fake-command", []));
        assert.strictEqual(error.message, `No FakeRunner result has been registered for the command "fake-command" at "${process.cwd()}".`);
      });

      it("with registered command with same executionFolderPath", async function () {
        const runner = new FakeRunner();
        runner.set({ command: "fake-command", executionFolderPath: "/a/b/c", result: { exitCode: 2 } });
        const result: RunResult = await runner.run("fake-command", [], { executionFolderPath: "/a/b/c" });
        assert.deepEqual(result, {
          exitCode: 2
        });
      });

      it("with multiple registered commands", async function () {
        const runner = new FakeRunner();
        runner.set({ command: "fake-command", result: { exitCode: 2 } });
        runner.set({ command: "fake-command", result: { exitCode: 3 } });
        const result: RunResult = await runner.run("fake-command");
        assert.deepEqual(result, {
          exitCode: 3
        });
      });

      it("with passthroughUnrecognized() called", async function () {
        const runner = new FakeRunner();
        runner.passthroughUnrecognized();

        const result: RunResult = await runner.run("git", ["fetch", "--prune"]);
        assertEx.defined(result, "result");
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.exitCode, 0);
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

    it("with non-existing executionFolderPath", async function () {
      const result: RunResult = await run("dir", [], { executionFolderPath: "/i/dont/exist" });
      assertEx.defined(result);
      assert.strictEqual(result.exitCode, undefined);
      assert.strictEqual(result.stdout, undefined);
      assert.strictEqual(result.stderr, undefined);
      assert.strictEqual(result.processId, undefined);
      assertEx.defined(result.error);
      assert.strictEqual(result.error!.message, "spawn dir ENOENT");
    });
  });
});
