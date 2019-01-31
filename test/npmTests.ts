import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { npm, npmExecutable } from "../lib/npm";
import { RunResult } from "../lib/run";

describe("npm.ts", function () {
  describe("npmExecutable()", function () {
    it("with no arguments", function () {
      const npmCommand: string = npmExecutable();
      assert(npmCommand.startsWith("npm"));
    });

    it(`with "aix"`, function () {
      const npmCommand: string = npmExecutable("aix");
      assert.strictEqual(npmCommand, "npm");
    });

    it(`with "darwin"`, function () {
      const npmCommand: string = npmExecutable("darwin");
      assert.strictEqual(npmCommand, "npm");
    });

    it(`with "freebsd"`, function () {
      const npmCommand: string = npmExecutable("freebsd");
      assert.strictEqual(npmCommand, "npm");
    });

    it(`with "linux"`, function () {
      const npmCommand: string = npmExecutable("linux");
      assert.strictEqual(npmCommand, "npm");
    });

    it(`with "openbsd"`, function () {
      const npmCommand: string = npmExecutable("openbsd");
      assert.strictEqual(npmCommand, "npm");
    });

    it(`with "sunos"`, function () {
      const npmCommand: string = npmExecutable("sunos");
      assert.strictEqual(npmCommand, "npm");
    });

    it(`with "win32"`, function () {
      const npmCommand: string = npmExecutable("win32");
      assert.strictEqual(npmCommand, "npm.cmd");
    });
  });

  describe("npm()", function () {
    it("with unrecognized command", async function () {
      const result: RunResult = await npm("foo");
      assert(result);
      assert.strictEqual(result.exitCode, 1);
      assertEx.contains(result.stdout, "Usage: npm <command>");
      assertEx.contains(result.stdout, "where <command> is one of:");
      assert.strictEqual(result.stderr, "");
    });
  });
});
