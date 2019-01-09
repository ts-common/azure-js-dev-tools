import { assertEx } from "../lib/assertEx";
import { RunResult, runSync, runAsync } from "../lib/run";
import { assert } from "chai";

describe("run.ts", function () {
  describe("runSync()", function () {
    this.timeout(10000);

    it("with mockResult", function () {
      const mockResult: RunResult = {
        exitCode: 1,
        stdout: "hello",
        stderr: "there"
      };
      const result: RunResult = runSync("fakeCommand", ["arg1", "arg2"], { mockResult });
      assert.strictEqual(result, mockResult);
    });

    it("with mockError", function () {
      const mockError = new Error("hello");
      assertEx.throws(() => runSync("fakeCommand", ["arg1", "arg2"], { mockError }), mockError);
    });

    it("with ping www.bing.com and captureOutput: function", function () {
      let capturedOutput = "";
      const result: RunResult = runSync("ping", "www.bing.com", { captureOutput: (text: string) => capturedOutput += text });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assertEx.contains(result.stdout, "Pinging");
      assertEx.contains(result.stdout, "Reply from ");
      assert.strictEqual(capturedOutput, result.stdout);
      assert.strictEqual(result.stderr, "");
    });

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

    it("with mockResult", async function () {
      const mockResult: RunResult = {
        exitCode: 1,
        stdout: "hello",
        stderr: "there"
      };
      const result: RunResult = await runAsync("fakeCommand", ["arg1", "arg2"], { mockResult });
      assert.strictEqual(result, mockResult);
    });

    it("with mockError", async function () {
      const mockError = new Error("hello");
      await assertEx.throwsAsync(runAsync("fakeCommand", ["arg1", "arg2"], { mockError }), mockError);
    });

    it("with ping www.bing.com and captureOutput: function", async function () {
      const capturedOutput: string[] = [];
      const result: RunResult = await runAsync("ping", "www.bing.com", { captureOutput: (text: string) => capturedOutput.push(text) });
      assert(result);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, "");
      assert(capturedOutput.length >= 1);
      const output = capturedOutput.join();
      assertEx.contains(output, "Pinging");
      assertEx.contains(output, "Reply from ");
      assertEx.contains(output, "Minimum = ");
      assertEx.contains(output, "Maximum = ");
      assertEx.contains(output, "Average = ");
      assert.strictEqual(result.stderr, "");
    });

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