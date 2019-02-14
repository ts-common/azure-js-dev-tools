import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { mvnExecutable } from "../lib/mvn";

describe("mvn.ts", function () {
  describe("mvnExecutable()", function () {
    it("with no arguments", function () {
      const mvnCommand: string = mvnExecutable({});
      assertEx.startsWith(mvnCommand, "mvn");
    });

    it(`with "aix"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "aix", mvnPath: "./node_modules/.bin" });
      assert.strictEqual(mvnCommand, "./node_modules/.bin/mvn");
    });

    it(`with "darwin"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "darwin", mvnPath: "blah" });
      assert.strictEqual(mvnCommand, "blah/mvn");
    });

    it(`with "freebsd"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "freebsd" });
      assert.strictEqual(mvnCommand, "mvn");
    });

    it(`with "linux"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "linux", mvnPath: "place/mvn" });
      assert.strictEqual(mvnCommand, "place/mvn");
    });

    it(`with "openbsd"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "openbsd" });
      assert.strictEqual(mvnCommand, "mvn");
    });

    it(`with "sunos"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "sunos" });
      assert.strictEqual(mvnCommand, "mvn");
    });

    it(`with "win32"`, function () {
      const mvnCommand: string = mvnExecutable({ osPlatform: "win32", mvnPath: "./node_modules/.bin" });
      assert.strictEqual(mvnCommand, "./node_modules/.bin/mvn.cmd");
    });

    it(`with no osPlatform specified`, function () {
      const mvnCommand: string = mvnExecutable({ mvnPath: "./node_modules/.bin" });
      assertEx.startsWith(mvnCommand, "./node_modules/.bin/mvn");
    });
  });
});
