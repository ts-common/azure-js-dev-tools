import { assert } from "chai";
import { joinPath } from "../lib";
import { assertEx } from "../lib/assertEx";
import { findFileInPath, findFileInPathSync } from "../lib/fileSystem2";
import { getGitRemoteBranch, getRemoteBranchFullName, ExecutableGit, GitRemoteBranch } from "../lib/git";
import { FakeRunner, RunResult } from "../lib/run";

const runPushRemoteBranchTests: boolean = !!findFileInPathSync("github.auth");

describe("git.ts", function () {
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

  describe("ExecutableGit", function () {
    describe("run()", function () {
      it("with unrecognized command", async function () {
        const git = new ExecutableGit();
        const result: RunResult = await git.run(["foo"]);
        assert(result);
        assert.strictEqual(result.exitCode, 1);
        assert.strictEqual(result.stdout, "");
        assertEx.containsAll(result.stderr, [
          "git: 'foo' is not a git command. See 'git --help'.",
          "The most similar command is",
        ]);
      });
    });

    describe("currentCommitSha()", function () {
      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.CurrentCommitShaResult = { exitCode: 2, stdout: "c", stderr: "d", currentCommitSha: "c" };
        runner.set({ executable: "git", args: ["rev-parse", "HEAD"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.currentCommitSha({ runner }), expectedResult);
      });

      it("with real runner", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.CurrentCommitShaResult = await git.currentCommitSha();
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 0);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.error, undefined);
        assert.strictEqual(result.stderr, "");
        assertEx.definedAndNotEmpty(result.stdout, "result.stdout");
        assert.strictEqual(result.currentCommitSha, result.stdout);
      });
    });

    describe("fetch()", function () {
      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["fetch"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner }), expectedResult);
      });

      it("with prune: true", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
        runner.set({ executable: "git", args: ["fetch", "--prune"], result: () => expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner, prune: true }), expectedResult);
      });

      it("with prune: false", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 3, stdout: "e", stderr: "f" };
        runner.set({ executable: "git", args: ["fetch"], result: () => expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.fetch({ runner, prune: false }), expectedResult);
      });
    });

    it("mergeOriginMaster()", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
      runner.set({ executable: "git", args: ["merge", "origin", "master"], result: expectedResult });
      const git = new ExecutableGit();
      assert.deepEqual(await git.mergeOriginMaster({ runner }), expectedResult);
    });

    describe("clone()", function () {
      it("with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["clone", "https://my.fake.git/url"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.clone("https://my.fake.git/url", { runner }), expectedResult);
      });

      it("with all options", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["clone", "--quiet", "--verbose", "--origin", "foo", "--branch", "fake-branch", "--depth", "5", "https://my.fake.git/url", "fake-directory"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.clone("https://my.fake.git/url", {
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

    describe("checkout()", function () {
      it("with no stderr", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "blah", stderr: "" };
        runner.set({ executable: "git", args: ["checkout", "master"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(
          await git.checkout("master", { runner }),
          {
            ...expectedResult,
            filesThatWouldBeOverwritten: undefined
          });
      });
    });

    it("pull()", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 1, stdout: "a", stderr: "b" };
      runner.set({ executable: "git", args: ["pull"], result: expectedResult });
      const git = new ExecutableGit();
      assert.deepEqual(await git.pull({ runner }), expectedResult);
    });

    describe("push()", function () {
      it("command line arguments with no setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ runner }), expectedResult);
      });

      it("command line arguments with undefined setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: undefined, runner }), expectedResult);
      });

      it("command line arguments with null setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: undefined, runner }), expectedResult);
      });

      it("command line arguments with empty setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: "", runner }), expectedResult);
      });

      it("command line arguments with non-empty setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "--set-upstream", "hello", "myfakebranch"], result: expectedResult });
        runner.set({ executable: "git", args: ["branch"], result: { exitCode: 0, stdout: "* myfakebranch" } });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: "hello", runner }), expectedResult);
      });

      it("command line arguments with true setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "--set-upstream", "origin", "myfakebranch"], result: expectedResult });
        runner.set({ executable: "git", args: ["branch"], result: { exitCode: 0, stdout: "* myfakebranch" } });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: true, runner }), expectedResult);
      });

      it("command line arguments with true setUpstream", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.push({ setUpstream: false, runner }), expectedResult);
      });

      it("when branch doesn't exist remotely and set-upstream isn't defined", async function () {
        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push();
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
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });

      it("when branch doesn't exist remotely and set-upstream is false", async function () {
        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: false });
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
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is origin and branchName is myFakeBranch", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: "origin", branchName: "myFakeBranch" });
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
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is origin and branchName is not defined", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: "origin" });
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
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is true and branchName is myFakeBranch", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: true, branchName: "myFakeBranch" });
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
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });

      (runPushRemoteBranchTests ? it : it.skip)("when branch doesn't exist remotely and set-upstream is true and branchName is not defined", async function () {
        this.timeout(20000);

        const git = new ExecutableGit();
        const currentBranch: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const pushResult: ExecutableGit.Result = await git.push({ setUpstream: true });
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
          await git.checkout(currentBranch);
          await git.deleteLocalBranch("myFakeBranch");
          await git.deleteRemoteBranch("myFakeBranch");
        }
      });
    });

    it("addAll()", async function () {
      const runner = new FakeRunner();
      const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
      runner.set({ executable: "git", args: ["add", "*"], result: expectedResult });
      const git = new ExecutableGit();
      assert.deepEqual(await git.addAll({ runner }), expectedResult);
    });

    describe("commit()", function () {
      it("with one commit message", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["commit", "-m", "Hello World"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.commit("Hello World", { runner }), expectedResult);
      });

      it("with two commit messages", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["commit", "-m", "Hello", "-m", "World"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.commit(["Hello", "World"], { runner }), expectedResult);
      });
    });

    describe("deleteLocalBranch()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["branch", "-D", "branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteLocalBranch("branchToDelete", { runner }), expectedResult);
      });

      it("when deleting current branch", async function () {
        const git = new ExecutableGit();
        const currentBranchName: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const deleteBranchResult: ExecutableGit.Result = await git.deleteLocalBranch("myFakeBranch");
          assertEx.defined(deleteBranchResult, "deleteBranchResult");
          assertEx.defined(deleteBranchResult.processId, "deleteBranchResult.processId");
          assert.strictEqual(deleteBranchResult.error, undefined);
          assertEx.defined(deleteBranchResult.stdout, "deleteBranchResult.stdout");
          assertEx.contains(deleteBranchResult.stderr, `Cannot delete branch 'myFakeBranch' checked out at `);
          assert.strictEqual(await git.currentBranch(), "myFakeBranch");
        } finally {
          await git.checkout(currentBranchName);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });
    });

    describe("createLocalBranch()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["checkout", "-b", "branchToCreate"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.createLocalBranch("branchToCreate", { runner }), expectedResult);
      });

      it("when branch doesn't exist", async function () {
        const git = new ExecutableGit();
        const currentBranchName: string = await git.currentBranch();
        const createBranchResult: ExecutableGit.Result = await git.createLocalBranch("newBranchName");
        try {
          assertEx.defined(createBranchResult, "createBranchResult");
          assertEx.defined(createBranchResult.processId, "createBranchResult.processId");
          assert.strictEqual(createBranchResult.error, undefined);
          assert.strictEqual(createBranchResult.exitCode, 0);
          assertEx.defined(createBranchResult.stdout, "createBranchResult.stdout");
          assert.strictEqual(createBranchResult.stderr, "Switched to a new branch 'newBranchName'\n");
          assert.strictEqual(await git.currentBranch(), "newBranchName");
        } finally {
          await git.checkout(currentBranchName);
          await git.deleteLocalBranch("newBranchName");
        }
      });

      it("when branch is the current branch", async function () {
        const git = new ExecutableGit();
        const currentBranchName: string = await git.currentBranch();
        await git.createLocalBranch("myFakeBranch");
        try {
          const createBranchResult: ExecutableGit.Result = await git.createLocalBranch("myFakeBranch");
          assertEx.defined(createBranchResult, "createBranchResult");
          assertEx.defined(createBranchResult.processId, "createBranchResult.processId");
          assert.strictEqual(createBranchResult.error, undefined);
          assert.strictEqual(createBranchResult.exitCode, 128);
          assert.strictEqual(createBranchResult.stdout, "");
          assert.strictEqual(createBranchResult.stderr, `fatal: A branch named 'myFakeBranch' already exists.\n`);
        } finally {
          await git.checkout(currentBranchName);
          await git.deleteLocalBranch("myFakeBranch");
        }
      });
    });

    describe("deleteRemoteBranch()", function () {
      it("command line arguments with no provided remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { runner }), expectedResult);
      });

      it("command line arguments with undefined remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: undefined, runner }), expectedResult);
      });

      it("command line arguments with null remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        // tslint:disable-next-line:no-null-keyword
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: null as any, runner }), expectedResult);
      });

      it("command line arguments with empty remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "origin", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: "", runner }), expectedResult);
      });

      it("command line arguments with provided remoteName", async function () {
        const runner = new FakeRunner();
        const expectedResult: RunResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["push", "fancypants", ":branchToDelete"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.deleteRemoteBranch("branchToDelete", { remoteName: "fancypants", runner }), expectedResult);
      });

      it("when remote doesn't exist", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.Result = await git.deleteRemoteBranch("myFakeBranch", { remoteName: "fancypants" });
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

    describe("diff()", function () {
      it("command line arguments with no options", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner }), expectedResult);
      });

      it("command line arguments with commit1", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "fake-commit1"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, commit1: "fake-commit1" }), expectedResult);
      });

      it("command line arguments with commit2", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "fake-commit2"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, commit2: "fake-commit2" }), expectedResult);
      });

      it("command line arguments with commit1 and commit2", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "fake-commit1", "fake-commit2"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, commit1: "fake-commit1", commit2: "fake-commit2" }), expectedResult);
      });

      it("command line arguments with nameOnly", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "c")
          ]
        };
        runner.set({ executable: "git", args: ["diff", "--name-only"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, nameOnly: true }), expectedResult);
      });

      it("command line arguments with staged", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "--staged"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, staged: true }), expectedResult);
      });

      it("command line arguments with ignoreSpace: all", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "--ignore-all-space"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, ignoreSpace: "all" }), expectedResult);
      });

      it("command line arguments with ignoreSpace: change", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "c",
          stderr: "d",
          filesChanged: []
        };
        runner.set({ executable: "git", args: ["diff", "--ignore-space-change"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, ignoreSpace: "change" }), expectedResult);
      });

      it("command line arguments with ignoreSpace: at-eol", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.DiffResult = {
          exitCode: 2,
          stdout: "diff --git a/foo.txt b/foo.txt",
          stderr: "d",
          filesChanged: [
            joinPath(process.cwd(), "foo.txt")
          ]
        };
        runner.set({ executable: "git", args: ["diff", "--ignore-space-at-eol"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.diff({ runner, ignoreSpace: "at-eol" }), expectedResult);
      });
    });

    describe("localBranches()", function () {
      it("with fake command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.LocalBranchesResult = {
          exitCode: 1,
          stdout: "x",
          stderr: "y",
          currentBranch: "",
          localBranches: [
            "x"
          ]
        };
        runner.set({ executable: "git", args: ["branch"], result: expectedResult });
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.LocalBranchesResult = await git.localBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });

      it("with two local branches", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.LocalBranchesResult = {
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
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.LocalBranchesResult = await git.localBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });
    });

    describe("gitRemoteBranches()", function () {
      it("with fake command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.RemoteBranchesResult = {
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
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.Result = await git.remoteBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });

      it("with one remote branch", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.RemoteBranchesResult = {
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
        const git = new ExecutableGit();
        const branchResult: ExecutableGit.Result = await git.remoteBranches({ runner });
        assert.deepEqual(branchResult, expectedResult);
      });
    });

    describe("status()", function () {
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
        const git = new ExecutableGit();
        const statusResult: ExecutableGit.StatusResult = await git.status({
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
        const git = new ExecutableGit();
        const statusResult: ExecutableGit.StatusResult = await git.status({
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
        const git = new ExecutableGit();
        const statusResult: ExecutableGit.StatusResult = await git.status({
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

    describe("getConfigurationValue()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.GetConfigurationValueResult = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["config", "--get", "a"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.getConfigurationValue("a", { runner }), expectedResult);
      });

      it("with undefined configurationValueName", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue(undefined as any);
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "error: key does not contain a section: undefined\n");
        assert.strictEqual(result.configurationValue, undefined);
      });

      it("with null configurationValueName", async function () {
        const git = new ExecutableGit();
        // tslint:disable-next-line:no-null-keyword
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue(null as any);
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "error: key does not contain a section: null\n");
        assert.strictEqual(result.configurationValue, undefined);
      });

      it("with non-existing configurationValueName", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue("blah");
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 1);
        assertEx.defined(result.processId, "result.processId");
        assert.strictEqual(result.stdout, "");
        assert.strictEqual(result.stderr, "error: key does not contain a section: blah\n");
        assert.strictEqual(result.configurationValue, undefined);
      });

      it("with existing configurationValueName", async function () {
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue("remote.origin.url");
        assertEx.defined(result, "result");
        assert.strictEqual(result.exitCode, 0);
        assertEx.defined(result.processId, "result.processId");
        assertEx.oneOf(result.stdout, ["https://github.com/ts-common/azure-js-dev-tools.git\n", "https://github.com/ts-common/azure-js-dev-tools\n"]);
        assert.strictEqual(result.stderr, "");
        assertEx.oneOf(result.configurationValue, ["https://github.com/ts-common/azure-js-dev-tools.git\n", "https://github.com/ts-common/azure-js-dev-tools\n"]);
      });

      it("outside git repository", async function () {
        const folderPath: string = joinPath((await findFileInPath("package.json"))!, "../..");
        const git = new ExecutableGit();
        const result: ExecutableGit.GetConfigurationValueResult = await git.getConfigurationValue("remote.origin.url", { executionFolderPath: folderPath });
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
        const expectedResult: ExecutableGit.GetConfigurationValueResult = { exitCode: 2, stdout: "c", stderr: "d", configurationValue: "e" };
        runner.set({ executable: "git", args: ["config", "--get", "remote.origin.url"], result: expectedResult });
        const git = new ExecutableGit();
        assert.deepEqual(await git.getRepositoryUrl({ runner }), expectedResult.configurationValue);
      });

      it("inside git repository", async function () {
        const git = new ExecutableGit();
        const result: string | undefined = await git.getRepositoryUrl();
        assertEx.oneOf(result, ["https://github.com/ts-common/azure-js-dev-tools.git", "https://github.com/ts-common/azure-js-dev-tools"]);
      });

      it("outside git repository", async function () {
        const folderPath: string = joinPath((await findFileInPath("package.json"))!, "../..");
        const git = new ExecutableGit();
        const result: string | undefined = await git.getRepositoryUrl({ executionFolderPath: folderPath });
        assert.strictEqual(result, undefined);
      });
    });

    describe("resetAll()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.Result = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["reset", "*"], result: expectedResult });
        const git = new ExecutableGit();
        assert.strictEqual(await git.resetAll({ runner }), expectedResult);
      });
    });

    describe("gitRemoteUrl()", function () {
      it("with undefined", async function () {
        const git = new ExecutableGit();
        assert.strictEqual(await git.getRemoteUrl(undefined as any), undefined);
      });

      it("with empty string", async function () {
        const git = new ExecutableGit();
        assert.strictEqual(await git.getRemoteUrl(""), undefined);
      });

      it("with non-existing remote string", async function () {
        const git = new ExecutableGit();
        assert.strictEqual(await git.getRemoteUrl("idontexist"), undefined);
      });

      it("with origin remote string", async function () {
        const git = new ExecutableGit();
        assertEx.startsWith((await git.getRemoteUrl("origin"))!, `https://github.com/ts-common/azure-js-dev-tools`);
      });
    });

    describe("setRemoteUrl()", function () {
      it("command line arguments", async function () {
        const runner = new FakeRunner();
        const expectedResult: ExecutableGit.Result = { exitCode: 2, stdout: "c", stderr: "d" };
        runner.set({ executable: "git", args: ["remote", "set-url", "abc", "def"], result: expectedResult });
        const git = new ExecutableGit();
        assert.strictEqual(await git.setRemoteUrl("abc", "def", { runner }), expectedResult);
      });
    });
  });
});
