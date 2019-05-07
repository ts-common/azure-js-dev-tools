import { assert } from "chai";
import { joinPath } from "../lib";
import { assertEx } from "../lib/assertEx";
import { findFileInPath, findFileInPathSync } from "../lib/fileSystem2";
import { getGitRemoteBranch, getRemoteBranchFullName, git, gitAddAll, gitCheckout, gitClone, gitCommit, gitConfigGet, gitCreateLocalBranch, gitCurrentBranch, gitDeleteLocalBranch, gitDeleteRemoteBranch, gitDiff, GitDiffResult, gitFetch, GitGetConfigResult as GitConfigGetResult, gitGetRepositoryUrl, gitLocalBranches, GitLocalBranchesResult, gitMergeOriginMaster, gitPull, gitPush, GitRemoteBranch, gitRemoteBranches, GitRemoteBranchesResult, GitRunResult, gitStatus, GitStatusResult, gitResetAll, gitCurrentCommitSha, GitCurrentCommitShaResult } from "../lib/git";
import { FakeRunner, RunResult } from "../lib/run";

const runPushRemoteBranchTests: boolean = !!findFileInPathSync("github.auth");

describe("git.ts", function () {
  describe("git()", function () {
    it("with unrecognized command", async function () {
      const result: RunResult = await git(["foo"]);
      assert(result);
      assert.strictEqual(result.exitCode, 1);
      assert.strictEqual(result.stdout, "");
      assertEx.contains(result.stderr, "git: 'foo' is not a git command. See 'git --help'.");
      assertEx.contains(result.stderr, "The most similar command is");
    });
  });

  describe("gitCurrentCommitSha()", function () {
    it("with no options", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitCurrentCommitShaResult = { exitCode: 2, stdout: "c", stderr: "d", currentCommitSha: "c" };
      runner.set({ executable: "git", args: ["rev-parse", "HEAD"], result: expectedResult });
      assert.deepEqual(await gitCurrentCommitSha({ runner }), expectedResult);
    });

    it("with real runner", async function () {
      const result: GitCurrentCommitShaResult = await gitCurrentCommitSha();
      assertEx.defined(result, "result");
      assert.strictEqual(result.exitCode, 0);
      assertEx.defined(result.processId, "result.processId");
      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.stderr, "");
      assertEx.definedAndNotEmpty(result.stdout, "result.stdout");
      assert.strictEqual(result.currentCommitSha, result.stdout);
    });
  });

  describe("gitFetch()", function () {
    it("with no options", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["fetch"], result: expectedResult });
      assert.deepEqual(await gitFetch({ runner }), expectedResult);
    });

    it("with prune: true", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
      runner.set({ executable: "git", args: ["fetch", "--prune"], result: () => expectedResult });
      assert.deepEqual(await gitFetch({ runner, prune: true }), expectedResult);
    });

    it("with prune: false", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
      runner.set({ executable: "git", args: ["fetch"], result: () => expectedResult });
      assert.deepEqual(await gitFetch({ runner, prune: false }), expectedResult);
    });
  });

  it("gitMergeOriginMaster()", async function () {
    const runner = new FakeRunner();
    const expectedResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
    runner.set({ executable: "git", args: ["merge", "origin", "master"], result: expectedResult });
    assert.deepEqual(await gitMergeOriginMaster({ runner }), expectedResult);
  });

  describe("gitClone()", function () {
    it("with no options", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["clone", "https://my.fake.git/url"], result: expectedResult });
      assert.deepEqual(await gitClone("https://my.fake.git/url", { runner }), expectedResult);
    });

    it("with all options", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["clone", "--quiet", "--verbose", "--origin", "foo", "--branch", "fake-branch", "--depth", "5", "https://my.fake.git/url", "fake-directory"], result: expectedResult });
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
      runner.set({ executable: "git", args: ["checkout", "master"], result: expectedResult });
      assert.deepEqual(
        await gitCheckout("master", { runner }),
        {
          ...expectedResult,
          filesThatWouldBeOverwritten: undefined
        });
    });
  });

  it("gitPull()", async function () {
    const runner = new FakeRunner();
    const expectedResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
    runner.set({ executable: "git", args: ["pull"], result: expectedResult });
    assert.deepEqual(await gitPull({ runner }), expectedResult);
  });

  describe("gitPush()", function () {
    it("command line arguments with no setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push"], result: expectedResult });
      assert.deepEqual(await gitPush({ runner }), expectedResult);
    });

    it("command line arguments with undefined setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push"], result: expectedResult });
      assert.deepEqual(await gitPush({ setUpstream: undefined, runner }), expectedResult);
    });

    it("command line arguments with null setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push"], result: expectedResult });
      assert.deepEqual(await gitPush({ setUpstream: undefined, runner }), expectedResult);
    });

    it("command line arguments with empty setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push"], result: expectedResult });
      assert.deepEqual(await gitPush({ setUpstream: "", runner }), expectedResult);
    });

    it("command line arguments with non-empty setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "--set-upstream", "hello", "myfakebranch"], result: expectedResult });
      runner.set({ executable: "git", args: ["branch"], result: { exitCode: 0, stdout: "* myfakebranch" } });
      assert.deepEqual(await gitPush({ setUpstream: "hello", runner }), expectedResult);
    });

    it("command line arguments with true setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "--set-upstream", "origin", "myfakebranch"], result: expectedResult });
      runner.set({ executable: "git", args: ["branch"], result: { exitCode: 0, stdout: "* myfakebranch" } });
      assert.deepEqual(await gitPush({ setUpstream: true, runner }), expectedResult);
    });

    it("command line arguments with true setUpstream", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push"], result: expectedResult });
      assert.deepEqual(await gitPush({ setUpstream: false, runner }), expectedResult);
    });

    it("when branch doesn't exist remotely and set-upstream isn't defined", async function () {
      const currentBranch: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const pushResult: GitRunResult = await gitPush();
        assertEx.defined(pushResult, "pushResult");
        assertEx.defined(pushResult.processId, "pushResult.processId");
        assert.strictEqual(pushResult.exitCode, 128);
        assert.strictEqual(pushResult.stdout, "");
        assertEx.containsAll(pushResult.stderr, [
          "fatal: The current branch myFakeBranch has no upstream branch.",
          "To push the current branch and set the remote as upstream, use",
          "    git push --set-upstream origin myFakeBranch"
        ]);
        assert.strictEqual(pushResult.error, undefined);
      } finally {
        await gitCheckout(currentBranch);
        await gitDeleteLocalBranch("myFakeBranch");
      }
    });

    it("when branch doesn't exist remotely and set-upstream is false", async function () {
      const currentBranch: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const pushResult: GitRunResult = await gitPush({ setUpstream: false });
        assertEx.defined(pushResult, "pushResult");
        assertEx.defined(pushResult.processId, "pushResult.processId");
        assert.strictEqual(pushResult.exitCode, 128);
        assert.strictEqual(pushResult.stdout, "");
        assertEx.containsAll(pushResult.stderr, [
          "fatal: The current branch myFakeBranch has no upstream branch.",
          "To push the current branch and set the remote as upstream, use",
          "    git push --set-upstream origin myFakeBranch"
        ]);
        assert.strictEqual(pushResult.error, undefined);
      } finally {
        await gitCheckout(currentBranch);
        await gitDeleteLocalBranch("myFakeBranch");
      }
    });

    (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is origin and branchName is myFakeBranch", async function () {
      this.timeout(20000);

      const currentBranch: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const pushResult: GitRunResult = await gitPush({ setUpstream: "origin", branchName: "myFakeBranch" });
        assertEx.defined(pushResult, "pushResult");
        assertEx.defined(pushResult.processId, "pushResult.processId");
        assert.strictEqual(pushResult.exitCode, 0);
        assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
        assertEx.containsAll(pushResult.stderr, [
          `remote: `,
          `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
          `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
          `To https://github.com/ts-common/azure-js-dev-tools.git`,
          ` * [new branch]      myFakeBranch -> myFakeBranch`
        ]);
        assert.strictEqual(pushResult.error, undefined);
      } finally {
        await gitCheckout(currentBranch);
        await gitDeleteLocalBranch("myFakeBranch");
        await gitDeleteRemoteBranch("myFakeBranch");
      }
    });

    (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is origin and branchName is not defined", async function () {
      this.timeout(20000);

      const currentBranch: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const pushResult: GitRunResult = await gitPush({ setUpstream: "origin" });
        assertEx.defined(pushResult, "pushResult");
        assertEx.defined(pushResult.processId, "pushResult.processId");
        assert.strictEqual(pushResult.exitCode, 0);
        assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
        assertEx.containsAll(pushResult.stderr, [
          `remote: `,
          `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
          `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
          `To https://github.com/ts-common/azure-js-dev-tools.git`,
          ` * [new branch]      myFakeBranch -> myFakeBranch`
        ]);
        assert.strictEqual(pushResult.error, undefined);
      } finally {
        await gitCheckout(currentBranch);
        await gitDeleteLocalBranch("myFakeBranch");
        await gitDeleteRemoteBranch("myFakeBranch");
      }
    });

    (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is true and branchName is myFakeBranch", async function () {
      this.timeout(20000);

      const currentBranch: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const pushResult: GitRunResult = await gitPush({ setUpstream: true, branchName: "myFakeBranch" });
        assertEx.defined(pushResult, "pushResult");
        assertEx.defined(pushResult.processId, "pushResult.processId");
        assert.strictEqual(pushResult.exitCode, 0);
        assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
        assertEx.containsAll(pushResult.stderr, [
          `remote: `,
          `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
          `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
          `To https://github.com/ts-common/azure-js-dev-tools.git`,
          ` * [new branch]      myFakeBranch -> myFakeBranch`
        ]);
        assert.strictEqual(pushResult.error, undefined);
      } finally {
        await gitCheckout(currentBranch);
        await gitDeleteLocalBranch("myFakeBranch");
        await gitDeleteRemoteBranch("myFakeBranch");
      }
    });

    (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is true and branchName is not defined", async function () {
      this.timeout(20000);

      const currentBranch: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const pushResult: GitRunResult = await gitPush({ setUpstream: true });
        assertEx.defined(pushResult, "pushResult");
        assertEx.defined(pushResult.processId, "pushResult.processId");
        assertEx.containsAll(pushResult.stderr, [
          `remote: `,
          `remote: Create a pull request for 'myFakeBranch' on GitHub by visiting:        `,
          `remote:      https://github.com/ts-common/azure-js-dev-tools/pull/new/myFakeBranch        `,
          `To https://github.com/ts-common/azure-js-dev-tools.git`,
          ` * [new branch]      myFakeBranch -> myFakeBranch`
        ]);
        assert.strictEqual(pushResult.stdout, "Branch 'myFakeBranch' set up to track remote branch 'myFakeBranch' from 'origin'.\n");
        assert.strictEqual(pushResult.exitCode, 0);
        assert.strictEqual(pushResult.error, undefined);
      } finally {
        await gitCheckout(currentBranch);
        await gitDeleteLocalBranch("myFakeBranch");
        await gitDeleteRemoteBranch("myFakeBranch");
      }
    });
  });

  it("gitAddAll()", async function () {
    const runner = new FakeRunner();
    const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
    runner.set({ executable: "git", args: ["add", "*"], result: expectedResult });
    assert.deepEqual(await gitAddAll({ runner }), expectedResult);
  });

  describe("gitCommit()", function () {
    it("with one commit message", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["commit", "-m", "Hello World"], result: expectedResult });
      assert.deepEqual(await gitCommit("Hello World", { runner }), expectedResult);
    });

    it("with two commit messages", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["commit", "-m", "Hello", "-m", "World"], result: expectedResult });
      assert.deepEqual(await gitCommit(["Hello", "World"], { runner }), expectedResult);
    });
  });

  describe("gitDeleteLocalBranch()", function () {
    it("command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["branch", "-D", "branchToDelete"], result: expectedResult });
      assert.deepEqual(await gitDeleteLocalBranch("branchToDelete", { runner }), expectedResult);
    });

    it("when deleting current branch", async function () {
      const currentBranchName: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const deleteBranchResult: GitRunResult = await gitDeleteLocalBranch("myFakeBranch");
        assertEx.defined(deleteBranchResult, "deleteBranchResult");
        assertEx.defined(deleteBranchResult.processId, "deleteBranchResult.processId");
        assert.strictEqual(deleteBranchResult.error, undefined);
        assertEx.defined(deleteBranchResult.stdout, "deleteBranchResult.stdout");
        assertEx.contains(deleteBranchResult.stderr, `Cannot delete branch 'myFakeBranch' checked out at `);
        assert.strictEqual(await gitCurrentBranch(), "myFakeBranch");
      } finally {
        await gitCheckout(currentBranchName);
        await gitDeleteLocalBranch("myFakeBranch");
      }
    });
  });

  describe("gitCreateLocalBranch()", function () {
    it("command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["checkout", "-b", "branchToCreate"], result: expectedResult });
      assert.deepEqual(await gitCreateLocalBranch("branchToCreate", { runner }), expectedResult);
    });

    it("when branch doesn't exist", async function () {
      const currentBranchName: string = await gitCurrentBranch();
      const createBranchResult: GitRunResult = await gitCreateLocalBranch("newBranchName");
      try {
        assertEx.defined(createBranchResult, "createBranchResult");
        assertEx.defined(createBranchResult.processId, "createBranchResult.processId");
        assert.strictEqual(createBranchResult.error, undefined);
        assert.strictEqual(createBranchResult.exitCode, 0);
        assertEx.defined(createBranchResult.stdout, "createBranchResult.stdout");
        assert.strictEqual(createBranchResult.stderr, "Switched to a new branch 'newBranchName'\n");
        assert.strictEqual(await gitCurrentBranch(), "newBranchName");
      } finally {
        await gitCheckout(currentBranchName);
        await gitDeleteLocalBranch("newBranchName");
      }
    });

    it("when branch is the current branch", async function () {
      const currentBranchName: string = await gitCurrentBranch();
      await gitCreateLocalBranch("myFakeBranch");
      try {
        const createBranchResult: GitRunResult = await gitCreateLocalBranch("myFakeBranch");
        assertEx.defined(createBranchResult, "createBranchResult");
        assertEx.defined(createBranchResult.processId, "createBranchResult.processId");
        assert.strictEqual(createBranchResult.error, undefined);
        assert.strictEqual(createBranchResult.exitCode, 128);
        assert.strictEqual(createBranchResult.stdout, "");
        assert.strictEqual(createBranchResult.stderr, `fatal: A branch named 'myFakeBranch' already exists.\n`);
      } finally {
        await gitCheckout(currentBranchName);
        await gitDeleteLocalBranch("myFakeBranch");
      }
    });
  });

  describe("gitDeleteRemoteBranch()", function () {
    it("command line arguments with no provided remoteName", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
      assert.deepEqual(await gitDeleteRemoteBranch("branchToDelete", { runner }), expectedResult);
    });

    it("command line arguments with undefined remoteName", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
      assert.deepEqual(await gitDeleteRemoteBranch("branchToDelete", { remoteName: undefined, runner }), expectedResult);
    });

    it("command line arguments with null remoteName", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
      // tslint:disable-next-line:no-null-keyword
      assert.deepEqual(await gitDeleteRemoteBranch("branchToDelete", { remoteName: null as any, runner }), expectedResult);
    });

    it("command line arguments with empty remoteName", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
      assert.deepEqual(await gitDeleteRemoteBranch("branchToDelete", { remoteName: "", runner }), expectedResult);
    });

    it("command line arguments with provided remoteName", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["push", "fancypants", ":branchToDelete"], result: expectedResult });
      assert.deepEqual(await gitDeleteRemoteBranch("branchToDelete", { remoteName: "fancypants", runner }), expectedResult);
    });

    it("when remote doesn't exist", async function () {
      const result: GitRunResult = await gitDeleteRemoteBranch("myFakeBranch", { remoteName: "fancypants" });
      assertEx.defined(result, "result");
      assertEx.defined(result.processId, "result.processId");
      assert.strictEqual(result.exitCode, 128);
      assert.strictEqual(result.stdout, "");
      assertEx.containsAll(result.stderr, [
        "fatal: 'fancypants' does not appear to be a git repository",
        "fatal: Could not read from remote repository.",
        "Please make sure you have the correct access rights",
        "and the repository exists."
      ]);
    });
  });

  describe("gitDiff()", function () {
    it("command line arguments with no options", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner }), expectedResult);
    });

    it("command line arguments with commit1", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff", "fake-commit1"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, commit1: "fake-commit1" }), expectedResult);
    });

    it("command line arguments with commit2", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff", "fake-commit2"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, commit2: "fake-commit2" }), expectedResult);
    });

    it("command line arguments with commit1 and commit2", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff", "fake-commit1", "fake-commit2"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, commit1: "fake-commit1", commit2: "fake-commit2" }), expectedResult);
    });

    it("command line arguments with nameOnly", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: [
          joinPath(process.cwd(), "c")
        ]
      };
      runner.set({ executable: "git", args: ["diff", "--name-only"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, nameOnly: true }), expectedResult);
    });

    it("command line arguments with staged", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff", "--staged"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, staged: true }), expectedResult);
    });

    it("command line arguments with ignoreSpace: all", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff", "--ignore-all-space"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, ignoreSpace: "all" }), expectedResult);
    });

    it("command line arguments with ignoreSpace: change", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "c",
        stderr: "d",
        filesChanged: []
      };
      runner.set({ executable: "git", args: ["diff", "--ignore-space-change"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, ignoreSpace: "change" }), expectedResult);
    });

    it("command line arguments with ignoreSpace: at-eol", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitDiffResult = {
        exitCode: 2,
        stdout: "diff --git a/foo.txt b/foo.txt",
        stderr: "d",
        filesChanged: [
          joinPath(process.cwd(), "foo.txt")
        ]
      };
      runner.set({ executable: "git", args: ["diff", "--ignore-space-at-eol"], result: expectedResult });
      assert.deepEqual(await gitDiff({ runner, ignoreSpace: "at-eol" }), expectedResult);
    });
  });

  describe("gitLocalBranches()", function () {
    it("with fake command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitLocalBranchesResult = {
        exitCode: 1,
        stdout: "x",
        stderr: "y",
        currentBranch: "",
        localBranches: [
          "x"
        ]
      };
      runner.set({ executable: "git", args: ["branch"], result: expectedResult });
      const branchResult: GitLocalBranchesResult = await gitLocalBranches({ runner });
      assert.deepEqual(branchResult, expectedResult);
    });

    it("with two local branches", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitLocalBranchesResult = {
        currentBranch: "daschult/gitBranchRemote",
        exitCode: 0,
        localBranches: [
          "daschult/gitBranchRemote",
          "master"
        ],
        stdout: "* daschult/gitBranchRemote\n  master\n",
        stderr: "",
      };
      runner.set({ executable: "git", args: ["branch"], result: expectedResult });
      const branchResult: GitLocalBranchesResult = await gitLocalBranches({ runner });
      assert.deepEqual(branchResult, expectedResult);
    });
  });

  describe("getGitRemoteBranch(string|GitRemoteBranch)", function () {
    it("with undefined", function () {
      assert.strictEqual(getGitRemoteBranch(undefined as any), undefined);
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getGitRemoteBranch(null as any), null);
    });

    it("with empty string", function () {
      assert.deepEqual(getGitRemoteBranch(""), {
        repositoryTrackingName: "",
        branchName: ""
      });
    });

    it("with non-empty string with no colon", function () {
      assert.deepEqual(getGitRemoteBranch("hello"), {
        repositoryTrackingName: "",
        branchName: "hello"
      });
    });

    it("with non-empty string with colon", function () {
      assert.deepEqual(getGitRemoteBranch("hello:there"), {
        repositoryTrackingName: "hello",
        branchName: "there"
      });
    });

    it("with GitRemoteBranch", function () {
      const remoteBranch: GitRemoteBranch = {
        repositoryTrackingName: "a",
        branchName: "b",
      };
      assert.strictEqual(getGitRemoteBranch(remoteBranch), remoteBranch);
    });
  });

  describe("getRemoteBranchFullName(string|GitRemoteBranch)", function () {
    it("with undefined", function () {
      assert.strictEqual(getRemoteBranchFullName(undefined as any), undefined);
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getRemoteBranchFullName(null as any), null);
    });

    it("with empty string", function () {
      assert.deepEqual(getRemoteBranchFullName(""), "");
    });

    it("with non-empty string with no colon", function () {
      assert.deepEqual(getRemoteBranchFullName("hello"), "hello");
    });

    it("with non-empty string with colon", function () {
      assert.deepEqual(getRemoteBranchFullName("hello:there"), "hello:there");
    });

    it("with GitRemoteBranch", function () {
      const remoteBranch: GitRemoteBranch = {
        repositoryTrackingName: "a",
        branchName: "b",
      };
      assert.strictEqual(getRemoteBranchFullName(remoteBranch), "a:b");
    });
  });

  describe("gitRemoteBranches()", function () {
    it("with fake command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitRemoteBranchesResult = {
        exitCode: 1,
        stdout: "a/x",
        stderr: "y",
        remoteBranches: [
          {
            repositoryTrackingName: "a",
            branchName: "x"
          }
        ],
      };
      runner.set({ executable: "git", args: ["branch", "--remotes"], result: expectedResult });
      const branchResult: GitRunResult = await gitRemoteBranches({ runner });
      assert.deepEqual(branchResult, expectedResult);
    });

    it("with one remote branch", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitRemoteBranchesResult = {
        exitCode: 0,
        stderr: "",
        stdout: "  origin/HEAD -> origin/master\n  origin/master\n",
        remoteBranches: [
          {
            repositoryTrackingName: "origin",
            branchName: "master"
          }
        ]
      };
      runner.set({ executable: "git", args: ["branch", "--remotes"], result: expectedResult });
      const branchResult: GitRunResult = await gitRemoteBranches({ runner });
      assert.deepEqual(branchResult, expectedResult);
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
      runner.set({ executable: "git", args: ["status"], result: expectedResult });
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
      runner.set({ executable: "git", args: ["status"], result: expectedResult });
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

    it("with untracked files but no files staged for commit", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = {
        exitCode: 0,
        stdout:
          `On branch master
Your branch is up to date with 'origin/master'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

  modified:   a/b.xml
  modified:   a/b/c.txt

Untracked files:
  (use "git add <file>..." to include in what will be committed)

  a.html
  a/b.txt

no changes added to commit (use "git add" and/or "git commit -a")`,
        stderr: ""
      };
      runner.set({ executable: "git", args: ["status"], result: expectedResult });
      const statusResult: GitStatusResult = await gitStatus({
        runner,
        executionFolderPath: "/mock/folder/"
      });
      assert.deepEqual(statusResult, {
        ...expectedResult,
        localBranch: "master",
        remoteBranch: "origin/master",
        hasUncommittedChanges: true,
        modifiedFiles: [
          "/mock/folder/a/b.xml",
          "/mock/folder/a/b/c.txt",
          "/mock/folder/a.html",
          "/mock/folder/a/b.txt"
        ],
        notStagedDeletedFiles: [],
        notStagedModifiedFiles: [
          "/mock/folder/a/b.xml",
          "/mock/folder/a/b/c.txt"
        ],
        stagedDeletedFiles: [],
        stagedModifiedFiles: [],
        untrackedFiles: [
          "/mock/folder/a.html",
          "/mock/folder/a/b.txt"
        ]
      });
    });
  });

  describe("gitConfigGet()", function () {
    it("command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["config", "--get", "a"], result: expectedResult });
      assert.deepEqual(await gitConfigGet("a", { runner }), expectedResult);
    });

    it("with undefined configurationValueName", async function () {
      const result: GitConfigGetResult = await gitConfigGet(undefined as any);
      assertEx.defined(result, "result");
      assert.strictEqual(result.exitCode, 1);
      assertEx.defined(result.processId, "result.processId");
      assert.strictEqual(result.stdout, "");
      assert.strictEqual(result.stderr, "error: key does not contain a section: undefined\n");
      assert.strictEqual(result.configurationValue, undefined);
    });

    it("with null configurationValueName", async function () {
      // tslint:disable-next-line:no-null-keyword
      const result: GitConfigGetResult = await gitConfigGet(null as any);
      assertEx.defined(result, "result");
      assert.strictEqual(result.exitCode, 1);
      assertEx.defined(result.processId, "result.processId");
      assert.strictEqual(result.stdout, "");
      assert.strictEqual(result.stderr, "error: key does not contain a section: null\n");
      assert.strictEqual(result.configurationValue, undefined);
    });

    it("with non-existing configurationValueName", async function () {
      const result: GitConfigGetResult = await gitConfigGet("blah");
      assertEx.defined(result, "result");
      assert.strictEqual(result.exitCode, 1);
      assertEx.defined(result.processId, "result.processId");
      assert.strictEqual(result.stdout, "");
      assert.strictEqual(result.stderr, "error: key does not contain a section: blah\n");
      assert.strictEqual(result.configurationValue, undefined);
    });

    it("with existing configurationValueName", async function () {
      const result: GitConfigGetResult = await gitConfigGet("remote.origin.url");
      assertEx.defined(result, "result");
      assert.strictEqual(result.exitCode, 0);
      assertEx.defined(result.processId, "result.processId");
      assertEx.oneOf(result.stdout, ["https://github.com/ts-common/azure-js-dev-tools.git\n", "https://github.com/ts-common/azure-js-dev-tools\n"]);
      assert.strictEqual(result.stderr, "");
      assertEx.oneOf(result.configurationValue, ["https://github.com/ts-common/azure-js-dev-tools.git\n", "https://github.com/ts-common/azure-js-dev-tools\n"]);
    });

    it("outside git repository", async function () {
      const folderPath: string = joinPath((await findFileInPath("package.json"))!, "../..");
      const result: GitConfigGetResult = await gitConfigGet("remote.origin.url", { executionFolderPath: folderPath });
      assertEx.defined(result, "result");
      assert.strictEqual(result.exitCode, 1);
      assertEx.defined(result.processId, "result.processId");
      assert.strictEqual(result.stdout, "");
      assert.strictEqual(result.stderr, "");
      assert.strictEqual(result.configurationValue, undefined);
    });
  });

  describe("gitGetRepositoryUrl()", function () {
    it("command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitConfigGetResult = { exitCode: 2, stdout: "c", stderr: "d", configurationValue: "e" };
      runner.set({ executable: "git", args: ["config", "--get", "remote.origin.url"], result: expectedResult });
      assert.deepEqual(await gitGetRepositoryUrl({ runner }), expectedResult.configurationValue);
    });

    it("inside git repository", async function () {
      const result: string | undefined = await gitGetRepositoryUrl();
      assertEx.oneOf(result, ["https://github.com/ts-common/azure-js-dev-tools.git", "https://github.com/ts-common/azure-js-dev-tools"]);
    });

    it("outside git repository", async function () {
      const folderPath: string = joinPath((await findFileInPath("package.json"))!, "../..");
      const result: string | undefined = await gitGetRepositoryUrl({ executionFolderPath: folderPath });
      assert.strictEqual(result, undefined);
    });
  });

  describe("gitResetAll()", function () {
    it("command line arguments", async function () {
      const runner = new FakeRunner();
      const expectedResult: GitRunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["reset", "*"], result: expectedResult });
      assert.strictEqual(await gitResetAll({ runner }), expectedResult);
    });
  });
});
