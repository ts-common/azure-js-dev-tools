import { assert } from "chai";
import { npmExecutable, npm } from "../lib/npm";
import { RunResult } from "../lib/run";
import { getLines } from "../lib/common";

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
    it("with unrecognized command", function () {
      const result: RunResult = npm("foo");
      assert(result);
      assert.strictEqual(result.exitCode, 1);
      assert.deepEqual(getLines(result.stdout), [
        "",
        "Usage: npm <command>",
        "",
        "where <command> is one of:",
        "    access, adduser, audit, bin, bugs, c, cache, ci, cit,",
        "    completion, config, create, ddp, dedupe, deprecate,",
        "    dist-tag, docs, doctor, edit, explore, get, help,",
        "    help-search, hook, i, init, install, install-test, it, link,",
        "    list, ln, login, logout, ls, outdated, owner, pack, ping,",
        "    prefix, profile, prune, publish, rb, rebuild, repo, restart,",
        "    root, run, run-script, s, se, search, set, shrinkwrap, star,",
        "    stars, start, stop, t, team, test, token, tst, un,",
        "    uninstall, unpublish, unstar, up, update, v, version, view,",
        "    whoami",
        "",
        "npm <command> -h  quick help on <command>",
        "npm -l            display full usage info",
        "npm help <term>   search for help on <term>",
        "npm help npm      involved overview",
        "",
        "Specify configs in the ini-formatted file:",
        "    C:\\Users\\daschult\\.npmrc",
        "or on the command line via: npm <command> --key value",
        "Config info can be viewed via: npm help config",
        "",
        "npm@6.4.1 C:\\Users\\daschult\\AppData\\Roaming\\nvm\\v10.15.0\\node_modules\\npm",
        "",
        ""
      ]);
      assert.deepEqual(getLines(result.stderr), [""]);
    });
  });
});
