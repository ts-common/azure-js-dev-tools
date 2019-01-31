import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { git, gitCheckout, gitClone, gitFetch, gitMergeOriginMaster, gitStatus, GitStatusResult } from "../lib/git";
import { FakeRunner, RunResult } from "../lib/run";

describe("git.ts", function () {
  describe("git()", function () {
    it("with unrecognized command", async function () {
      const result: RunResult = await git("foo");
      assert(result);
      assert.strictEqual(result.exitCode, 1);
      assert.strictEqual(result.stdout, "");
      assertEx.contains(result.stderr, "git: 'foo' is not a git command. See 'git --help'.");
      assertEx.contains(result.stderr, "The most similar command is");
    });
  });

  describe("gitFetch()", function () {
    it("with no options", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set("git fetch", expectedResult);
      assert.deepEqual(await gitFetch({ runner }), expectedResult);
    });

    it("with prune: true", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
      runner.set("git fetch --prune", () => expectedResult);
      assert.deepEqual(await gitFetch({ runner, prune: true }), expectedResult);
    });

    it("with prune: false", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
      runner.set("git fetch", () => expectedResult);
      assert.deepEqual(await gitFetch({ runner, prune: false }), expectedResult);
    });
  });

  it("gitMergeOriginMaster()", async function () {
    const runner = new FakeRunner();
    const expectedResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
    runner.set("git merge origin master", expectedResult);
    assert.deepEqual(await gitMergeOriginMaster({ runner }), expectedResult);
  });

  describe("gitClone()", function () {
    it("with no options", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set("git clone https://my.fake.git/url", expectedResult);
      assert.deepEqual(await gitClone("https://my.fake.git/url", { runner }), expectedResult);
    });

    it("with all options", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set("git clone --quiet --verbose --origin foo --branch fake-branch --depth 5 https://my.fake.git/url fake-directory", expectedResult);
      assert.deepEqual(
        await gitClone("https://my.fake.git/url", {
          runner,
          quiet: true,
          verbose: true,
          origin: "foo",
          branch: "fake-branch",
          depth: 5,
          directory: "fake-directory"
        }),
        expectedResult);
    });
  });

  describe("gitCheckout()", function () {
    it("with no stderr", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "blah", stderr: "" };
      runner.set("git checkout master", expectedResult);
      assert.deepEqual(
        await gitCheckout("master", { runner }),
        {
          ...expectedResult,
          filesThatWouldBeOverwritten: undefined
        });
    });
  });

  describe("gitStatus()", function () {
    it("with not staged modified file", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = {
        exitCode: 2,
        stdout: `On branch daschult/ci
Your branch is up to date with 'origin/daschult/ci'.

Changes not staged for commit:
(use "git add <file>..." to update what will be committed)
(use "git checkout -- <file>..." to discard changes in working directory)

      modified:   gulpfile.ts

no changes added to commit (use "git add" and/or "git commit -a")`
      };
      runner.set("git status", expectedResult);
      const statusResult: GitStatusResult = await gitStatus({
        executionFolderPath: "/mock/folder/",
        runner
      });
      assert.deepEqual(statusResult, {
        ...expectedResult,
        localBranch: "daschult/ci",
        remoteBranch: "origin/daschult/ci",
        hasUncommittedChanges: true,
        modifiedFiles: [
          "/mock/folder/gulpfile.ts"
        ],
        notStagedDeletedFiles: [],
        notStagedModifiedFiles: [
          "/mock/folder/gulpfile.ts"
        ],
        stagedDeletedFiles: [],
        stagedModifiedFiles: [],
        untrackedFiles: []
      });
    });

    it("with detached head with no changes", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = {
        exitCode: 0,
        stdout:
          `HEAD detached at pull/818/merge
nothing to commit, working tree clean`,
        stderr: ""
      };
      runner.set("git status", expectedResult);
      const statusResult: GitStatusResult = await gitStatus({
        runner,
        executionFolderPath: "/mock/folder/"
      });
      assert.deepEqual(statusResult, {
        ...expectedResult,
        localBranch: "pull/818/merge",
        remoteBranch: undefined,
        hasUncommittedChanges: false,
        modifiedFiles: [],
        notStagedDeletedFiles: [],
        notStagedModifiedFiles: [],
        stagedDeletedFiles: [],
        stagedModifiedFiles: [],
        untrackedFiles: []
      });
    });
  });
});
