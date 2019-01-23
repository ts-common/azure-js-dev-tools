import { assert } from "chai";
import { npmExecutable } from "../lib/npm";

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
});
