import { gitStatus, GitStatusResult } from "../lib/git";
import { assert } from "chai";
import { RunResult } from "../lib/run";

describe("git.ts", function () {
  describe("gitStatus()", function () {
    it("with not staged modified file", function () {
      const mockResult: RunResult = {
        exitCode: 0,
        stdout:
          `On branch daschult/ci
Your branch is up to date with 'origin/daschult/ci'.

Changes not staged for commit:
(use "git add <file>..." to update what will be committed)
(use "git checkout -- <file>..." to discard changes in working directory)

      modified:   gulpfile.ts

no changes added to commit (use "git add" and/or "git commit -a")`,
        stderr: ""
      };
      const statusResult: GitStatusResult = gitStatus({
        executionFolderPath: "/mock/folder/",
        mockResult
      });
      assert.deepEqual(statusResult, {
        ...mockResult,
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

    it("with detached head with no changes", function () {
      const mockResult: RunResult = {
        exitCode: 0,
        stdout:
          `HEAD detached at pull/818/merge
nothing to commit, working tree clean`,
        stderr: ""
      };
      const statusResult: GitStatusResult = gitStatus({
        executionFolderPath: "/mock/folder/",
        mockResult
      });
      assert.deepEqual(statusResult, {
        ...mockResult,
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