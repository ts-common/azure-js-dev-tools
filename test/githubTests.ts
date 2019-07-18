import { assert } from "chai";
import { ExecutableGit } from "../lib";
import { contains } from "../lib/arrays";
import { assertEx } from "../lib/assertEx";
import { createFolder, deleteFolder, writeFileContents } from "../lib/fileSystem2";
import { FakeGitHub, FakeRepository, getGitHubRepositoryFromUrl, getRepository, getRepositoryBranch, getRepositoryFullName, GitHub, GitHubBranch, GitHubComment, GitHubCommit, GitHubLabel, GitHubMilestone, GitHubPullRequest, GitHubPullRequestCommit, gitHubPullRequestGetAssignee, gitHubPullRequestGetLabel, gitHubPullRequestGetLabels, GitHubReference, GitHubSprintLabel, GitHubUser, RealGitHub, Repository } from "../lib/github";
import { findPackageJsonFileSync } from "../lib/packageJson";
import { getParentFolderPath, joinPath } from "../lib/path";

describe("github.ts", function () {
  describe("getRepository(string)", function () {
    it(`with null`, function () {
      // tslint:disable-next-line:no-null-keyword
      const repository: Repository = getRepository(null as any);
      // tslint:disable-next-line:no-null-keyword
      assert.deepEqual(repository, { name: null as any, owner: "" });
    });

    it(`with undefined`, function () {
      const repository: Repository = getRepository(undefined as any);
      assert.deepEqual(repository, { name: undefined as any, owner: "" });
    });

    it(`with ""`, function () {
      const repository: Repository = getRepository("");
      assert.deepEqual(repository, { name: "", owner: "" });
    });

    it(`with "abc"`, function () {
      const repository: Repository = getRepository("abc");
      assert.deepEqual(repository, { name: "abc", owner: "" });
    });

    it(`with "abc/d"`, function () {
      const repository: Repository = getRepository("abc/d");
      assert.deepEqual(repository, { name: "d", owner: "abc" });
    });

    it(`with "abc\\d"`, function () {
      const repository: Repository = getRepository("abc\\d");
      assert.deepEqual(repository, { name: "d", owner: "abc" });
    });

    it(`with GitHubRepository`, function () {
      const expected: Repository = { name: "a", owner: "b" };
      const repository: Repository = getRepository(expected);
      assert.strictEqual(repository, expected);
    });
  });

  describe("getRepositoryFullName()", function () {
    it("with undefined", function () {
      assert.strictEqual(getRepositoryFullName(undefined as any), "");
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getRepositoryFullName(null as any), "");
    });

    it(`with ""`, function () {
      assert.strictEqual(getRepositoryFullName(""), "");
    });

    it(`with "abc"`, function () {
      assert.strictEqual(getRepositoryFullName("abc"), "abc");
    });

    it(`with "abc/d"`, function () {
      assert.strictEqual(getRepositoryFullName("abc/d"), "abc/d");
    });

    it(`with "abc\\d"`, function () {
      assert.strictEqual(getRepositoryFullName("abc\\d"), "abc\\d");
    });

    it(`with { name: "a", owner: "" }`, function () {
      assert.strictEqual(getRepositoryFullName({ name: "a", owner: "" }), "a");
    });

    it(`with { name: "a", owner: "b" }`, function () {
      assert.strictEqual(getRepositoryFullName({ name: "a", owner: "b" }), "b/a");
    });
  });

  describe("gitHubPullRequestGetLabel()", function () {
    it(`with no labels`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, "spam"), undefined);
    });

    it(`with undefined label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, undefined as any), undefined);
    });

    it(`with null label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, null as any), undefined);
    });

    it(`with "" label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, ""), undefined);
    });

    it(`with not existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      pullRequest.labels.push(createFakeGitHubLabel({ name: "abc" }));
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, "a"), undefined);
    });

    it(`with existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      const label: GitHubLabel = createFakeGitHubLabel({ name: "a" });
      pullRequest.labels.push(label);
      assert.strictEqual(gitHubPullRequestGetLabel(pullRequest, "a"), label);
    });
  });

  describe("gitHubPullRequestGetLabels()", function () {
    it(`with no labels`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, ["abc"]), []);
    });

    it(`with undefined label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, undefined as any), []);
    });

    it(`with null label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      // tslint:disable-next-line:no-null-keyword
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, null as any), []);
    });

    it(`with "" label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, ""), []);
    });

    it(`with not existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      pullRequest.labels.push(createFakeGitHubLabel({ name: "abc" }));
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, "a"), []);
    });

    it(`with existing label name`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      const label: GitHubLabel = createFakeGitHubLabel({ name: "a" });
      pullRequest.labels.push(label);
      assert.deepEqual(gitHubPullRequestGetLabels(pullRequest, "a"), [label]);
    });
  });

  describe("gitHubPullRequestGetAssignee()", function () {
    it(`with no pull request assignees`, function () {
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest();
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, "abc"), undefined);
    });

    it(`with undefined assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, undefined as any), undefined);
    });

    it(`with null assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, null as any), undefined);
    });

    it(`with not found number assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, 1), undefined);
    });

    it(`with found number assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, user.id), user);
    });

    it(`with not found string assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, "a"), undefined);
    });

    it(`with found string assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, user.login), user);
    });

    it(`with not found GitHubUser assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, createFakeGitHubUser()), undefined);
    });

    it(`with found string assignee`, function () {
      const user: GitHubUser = createFakeGitHubUser({ login: "abc", id: 5 });
      const pullRequest: GitHubPullRequest = createFakeGitHubPullRequest({ assignees: [user] });
      assert.strictEqual(gitHubPullRequestGetAssignee(pullRequest, user), user);
    });
  });

  describe("getRepositoryBranch()", function () {
    it("with undefined", function () {
      getRepositoryBranch(undefined as any);
    });

    it("with null", function () {
      // tslint:disable-next-line: no-null-keyword
      getRepositoryBranch(null as any);
    });
  });

  describe("FakeRepository", function () {
    it("with undefined name", function () {
      const repository = new FakeRepository(undefined as any);
      assert.strictEqual(repository.name, undefined);
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it("with null name", function () {
      // tslint:disable-next-line:no-null-keyword
      const repository = new FakeRepository(null as any);
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(repository.name, null);
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "" name`, function () {
      const repository = new FakeRepository("");
      assert.strictEqual(repository.name, "");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "abc" name`, function () {
      const repository = new FakeRepository("abc");
      assert.strictEqual(repository.name, "abc");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "ab/cd" name`, function () {
      const repository = new FakeRepository("ab/cd");
      assert.strictEqual(repository.name, "ab/cd");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });

    it(`with "ab\\cd" name`, function () {
      const repository = new FakeRepository("ab\\cd");
      assert.strictEqual(repository.name, "ab\\cd");
      assert.deepEqual(repository.labels, []);
      assert.deepEqual(repository.milestones, []);
      assert.deepEqual(repository.pullRequests, []);
    });
  });

  describe("getGitHubRepositoryFromUrl()", function () {
    it("with undefined", function () {
      assert.strictEqual(getGitHubRepositoryFromUrl(undefined as any), undefined);
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getGitHubRepositoryFromUrl(null as any), undefined);
    });

    it(`with ""`, function () {
      assert.strictEqual(getGitHubRepositoryFromUrl(""), undefined);
    });

    it(`with non-GitHub URL`, function () {
      assert.strictEqual(getGitHubRepositoryFromUrl("https://www.bing.com/search?q=Kepler-47+third+planet"), undefined);
    });

    it(`with "https://github.com"`, function () {
      assert.strictEqual(getGitHubRepositoryFromUrl("https://github.com"), undefined);
    });

    it(`with "https://github.com/"`, function () {
      assert.strictEqual(getGitHubRepositoryFromUrl("https://github.com/"), undefined);
    });

    it(`with "https://github.com/.git"`, function () {
      assert.strictEqual(getGitHubRepositoryFromUrl("https://github.com/.git"), undefined);
    });

    it(`with "https://github.com/hello"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/hello"), {
        owner: "",
        name: "hello",
      });
    });

    it(`with "https://github.com/hello.git"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/hello.git"), {
        owner: "",
        name: "hello",
      });
    });

    it(`with "https://github.com/hello/"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/hello/"), {
        owner: "",
        name: "hello",
      });
    });

    it(`with "https://github.com/Azure/azure-rest-api-specs"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/Azure/azure-rest-api-specs"), {
        owner: "Azure",
        name: "azure-rest-api-specs",
      });
    });

    it(`with "https://github.com/Azure/azure-rest-api-specs.git"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/Azure/azure-rest-api-specs.git"), {
        owner: "Azure",
        name: "azure-rest-api-specs",
      });
    });

    it(`with "https://github.com/ts-common/azure-js-dev-tools/blob/master/.gitignore"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/ts-common/azure-js-dev-tools/blob/master/.gitignore"), {
        owner: "ts-common",
        name: "azure-js-dev-tools",
      });
    });

    it(`with "https://github.com/ts-common/blob/master/.gitignore"`, function () {
      assert.deepEqual(getGitHubRepositoryFromUrl("https://github.com/ts-common/blob/master/.gitignore"), {
        owner: "",
        name: "ts-common",
      });
    });
  });

  function githubTests(testSuiteName: string, rawGithub: GitHub | undefined): Mocha.Suite | void {
    const github: GitHub = rawGithub!;
    return (rawGithub ? describe : describe.skip)(testSuiteName, function () {
      this.timeout(10000);

      it("getCurrentUser()", async function () {
        const currentUser: GitHubUser = await github.getCurrentUser();
        assert(currentUser);
        assertEx.definedAndNotEmpty(currentUser.login, "currentUser.login");
        assertEx.defined(currentUser.id, "currentUser.id");
        assertEx.definedAndNotEmpty(currentUser.name, "currentUser.name");
        assertEx.startsWith(currentUser.url, "https://api.github.com/users/", "currentUser.url");
      });

      describe("getLabels()", function () {
        it("with undefined", async function () {
          await assertEx.throwsAsync(github.getLabels(undefined as any));
        });

        it("with null", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getLabels(null as any));
        });

        it(`with ""`, async function () {
          await assertEx.throwsAsync(github.getLabels(""));
        });

        it(`with "test-repo-billy/azure-js-dev-tools"`, async function () {
          const labels: GitHubLabel[] = await github.getLabels("test-repo-billy/azure-js-dev-tools");
          assertEx.defined(labels, "labels");
          assertEx.greaterThan(labels.length, 0, "labels.length");
        });

        it(`with "test-repo-billy/azure-sdk-for-js"`, async function () {
          const labels: GitHubLabel[] = await github.getLabels("test-repo-billy/azure-sdk-for-js");
          assertEx.defined(labels, "labels");
          assertEx.greaterThan(labels.length, 0, "labels.length");
        });
      });

      describe("getSprintLabels()", function () {
        it("with undefined", async function () {
          await assertEx.throwsAsync(github.getSprintLabels(undefined as any));
        });

        it("with null", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getSprintLabels(null as any));
        });

        it(`with ""`, async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getSprintLabels(""));
        });

        it(`with "ts-common/azure-js-dev-tools"`, async function () {
          // tslint:disable-next-line:no-null-keyword
          const sprintLabels: GitHubSprintLabel[] = await github.getSprintLabels("ts-common/azure-js-dev-tools");
          assertEx.defined(sprintLabels, "sprintLabels");
          assertEx.greaterThan(sprintLabels.length, 0, "sprintLabels.length");
        });
      });

      describe("createLabel()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.createLabel(undefined as any, "fake label name", "fake color"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createLabel(null as any, "fake label name", "fake color"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.createLabel(undefined as any, "fake label name", "fake color"));
        });

        it("with undefined label name", async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", undefined as any, "fake color"));
        });

        it("with null label name", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", null as any, "fake color"));
        });

        it(`with "" label name`, async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "", "fake color"));
        });

        it("with undefined color", async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "fake label name", undefined as any));
        });

        it("with null color", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "fake label name", null as any));
        });

        it(`with "" color`, async function () {
          await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", "fake label name", ""));
        });

        it(`with valid label name and color with no # prefix in ts-common/azure-js-dev-tools`, async function () {
          const labelName = "fakelabelthatjustgotcreated";
          const labelColor = "123456";
          const createdLabel: GitHubLabel = await github.createLabel("ts-common/azure-js-dev-tools", labelName, labelColor);
          try {
            assertEx.defined(createdLabel, "createdLabel");
            assert.strictEqual(createdLabel.name, labelName);
            assert.strictEqual(createdLabel.color, labelColor);

            const labels: GitHubLabel[] = await github.getLabels("ts-common/azure-js-dev-tools");
            assert.strictEqual(contains(labels, (label: GitHubLabel) => label.name === labelName && label.color === labelColor), true);
          } finally {
            await github.deleteLabel("ts-common/azure-js-dev-tools", labelName);
          }
        });

        it(`with valid label name and color with # prefix in ts-common/azure-js-dev-tools`, async function () {
          const labelName = "fakelabelthatjustgotcreated";
          const labelColor = "#123456";
          try {
            const error: Error = await assertEx.throwsAsync(github.createLabel("ts-common/azure-js-dev-tools", labelName, labelColor));
            assert.strictEqual(error.message, "Validation Failed");
          } finally {
            await github.deleteLabel("ts-common/azure-js-dev-tools", labelName).catch(() => { });
          }
        });

        it(`with valid label name and color with no # prefix in test-repo-billy/azure-sdk-for-js`, async function () {
          const labelName = "fakelabelthatjustgotcreated";
          const labelColor = "123456";
          const createdLabel: GitHubLabel = await github.createLabel("test-repo-billy/azure-sdk-for-js", labelName, labelColor);
          try {
            assertEx.defined(createdLabel, "createdLabel");
            assert.strictEqual(createdLabel.name, labelName);
            assert.strictEqual(createdLabel.color, labelColor);

            const labels: GitHubLabel[] = await github.getLabels("test-repo-billy/azure-sdk-for-js");
            assert.strictEqual(contains(labels, (label: GitHubLabel) => label.name === labelName && label.color === labelColor), true);
          } finally {
            await github.deleteLabel("test-repo-billy/azure-sdk-for-js", labelName);
          }
        });

        it(`with valid label name and color with # prefix in test-repo-billy/azure-sdk-for-js`, async function () {
          const labelName = "fakelabelthatjustgotcreated";
          const labelColor = "#123456";
          try {
            const error: Error = await assertEx.throwsAsync(github.createLabel("test-repo-billy/azure-sdk-for-js", labelName, labelColor));
            assert.strictEqual(error.message, "Validation Failed");
          } finally {
            await github.deleteLabel("test-repo-billy/azure-sdk-for-js", labelName).catch(() => { });
          }
        });
      });

      describe("deleteLabel()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.deleteLabel(undefined as any, "fake label name"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.deleteLabel(null as any, "fake label name"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.deleteLabel(undefined as any, "fake label name"));
        });

        it("with undefined label name", async function () {
          await assertEx.throwsAsync(github.deleteLabel("ts-common/azure-js-dev-tools", undefined as any));
        });

        it("with null label name", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.deleteLabel("ts-common/azure-js-dev-tools", null as any));
        });

        it(`with "" label name`, async function () {
          await assertEx.throwsAsync(github.deleteLabel("ts-common/azure-js-dev-tools", ""));
        });

        it(`with label name that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.deleteLabel("ts-common/azure-js-dev-tools", "labelthatdoesntexist"));
        });

        it(`with label that exists`, async function () {
          const labelName = "fakelabelthatjustgotcreated";
          await github.createLabel("ts-common/azure-js-dev-tools", labelName, "123456");
          await github.deleteLabel("ts-common/azure-js-dev-tools", labelName);
          const labels: GitHubLabel[] = await github.getLabels("ts-common/azure-js-dev-tools");
          assert.strictEqual(contains(labels, (label: GitHubLabel) => label.name === labelName), false);
        });
      });

      describe("createPullRequest()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.createPullRequest(undefined as any, "fake-base-branch", "fake-head-branch", "fake-title"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createPullRequest(null as any, "fake-base-branch", "fake-head-branch", "fake-title"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.createPullRequest("", "fake-base-branch", "fake-head-branch", "fake-title"));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequest("ImARepositoryThatDoesntExist", "fake-base-branch", "fake-head-branch", "fake-title"));
        });

        it("with base branch that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequest("ts-common/azure-js-dev-tools", "not-found-fake-base-branch", "master", "fake-title"));
        });

        it("with head branch that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequest("ts-common/azure-js-dev-tools", "master", "not-found-fake-head-branch", "fake-title"));
        });

        it("with head branch with same label as base branch", async function () {
          await assertEx.throwsAsync(github.createPullRequest("ts-common/azure-js-dev-tools", "master", "master", "fake-title"));
        });

        it("with valid local branches and changes", async function () {
          this.timeout(30000);

          const repository = "test-repo-billy/azure-js-dev-tools";
          const repositoryFolderPath: string = joinPath(getParentFolderPath(findPackageJsonFileSync(__filename)!), "..", repository);
          await createFolder(repositoryFolderPath);
          try {
            const git = new ExecutableGit({ executionFolderPath: repositoryFolderPath });
            const cloneResult: ExecutableGit.Result = await git.clone(`https://github.com/${repository}.git`, {
              directory: repositoryFolderPath
            });
            assert.strictEqual(cloneResult.exitCode, 0);

            const headBranchName = "fake-head-branch";
            await git.createLocalBranch(headBranchName);
            const fakeFilePath: string = joinPath(repositoryFolderPath, "fakeFile.txt");
            await writeFileContents(fakeFilePath, "fake file contents");
            await git.add(fakeFilePath);
            await git.commit(`Add ${fakeFilePath}`, { noVerify: true });

            await git.push({ setUpstream: true, branchName: headBranchName });
            try {
              const pullRequest: GitHubPullRequest = await github.createPullRequest(repository, "master", headBranchName, "fake-title");
              try {
                assertEx.defined(pullRequest, "pullRequest");
                assert.strictEqual(pullRequest.base.ref, "master");
                assert.strictEqual(pullRequest.head.ref, headBranchName);
                assertEx.defined(pullRequest.number, "pullRequest.number");
                assert.strictEqual(pullRequest.title, "fake-title");
                assert.strictEqual(pullRequest.body, "");
              } finally {
                await github.closePullRequest(repository, pullRequest);
              }
            } finally {
              await git.deleteRemoteBranch(headBranchName);
            }
          } finally {
            await deleteFolder(repositoryFolderPath);
          }
        });

        it.skip("with valid branches, changes, and description", async function () {
          this.timeout(30000);

          const repositoryFolderPath: string = getParentFolderPath(findPackageJsonFileSync(__filename)!);
          const git = new ExecutableGit({ executionFolderPath: repositoryFolderPath });

          const currentBranch: string = await git.currentBranch();
          const headBranchName = "fake-head-branch";
          await git.createLocalBranch(headBranchName);
          const fakeFilePath: string = joinPath(repositoryFolderPath, "fakeFile.txt");
          await writeFileContents(fakeFilePath, "fake file contents");
          await git.add(fakeFilePath);
          await git.commit(`Add ${fakeFilePath}`, { noVerify: true });
          try {
            await git.push({ setUpstream: true, branchName: headBranchName });
            try {
              const pullRequest: GitHubPullRequest = await github.createPullRequest("ts-common/azure-js-dev-tools", "master", headBranchName, "fake-title", {
                description: "My pull request's body/description"
              });
              try {
                assertEx.defined(pullRequest, "pullRequest");
                assert.strictEqual(pullRequest.base.ref, "master");
                assert.strictEqual(pullRequest.head.ref, headBranchName);
                assertEx.defined(pullRequest.number, "pullRequest.number");
                assert.strictEqual(pullRequest.title, "fake-title");
                assert.strictEqual(pullRequest.body, "My pull request's body/description");
              } finally {
                await github.closePullRequest("ts-common/azure-js-dev-tools", pullRequest);
              }
            } finally {
              await git.deleteRemoteBranch(headBranchName);
            }
          } finally {
            await git.checkout(currentBranch);
            await git.deleteLocalBranch(headBranchName);
          }
        });

        it("with non-existing head branch in non-existing fork", async function () {
          await assertEx.throwsAsync(github.createPullRequest("ts-common/azure-js-dev-tools", "master", "idontexist:fake-branch", "fake-title"));
        });

        it("with non-existing head branch in existing fork", async function () {
          if (!(github instanceof FakeGitHub)) {
            this.skip();
          } else {
            await github.forkRepository("ts-common/azure-js-dev-tools", "fake-user");
            try {
              await assertEx.throwsAsync(github.createPullRequest("ts-common/azure-js-dev-tools", "master", "fake-user:fake-branch", "fake-title"));
            } finally {
              await github.deleteRepository("fake-user/azure-js-dev-tools");
            }
          }
        });

        it("with existing head branch in existing fork", async function () {
          if (!(github instanceof FakeGitHub)) {
            this.skip();
          } else {
            await github.forkRepository("ts-common/azure-js-dev-tools", "fake-user");
            try {
              await github.createCommit("fake-user/azure-js-dev-tools", "fake-branch-sha", "fake-branch-sha-message");
              await github.createBranch("fake-user/azure-js-dev-tools", "fake-branch", "fake-branch-sha");
              const pullRequest: GitHubPullRequest = await github.createPullRequest("ts-common/azure-js-dev-tools", "master", "fake-user:fake-branch", "fake-title");
              assertEx.defined(pullRequest, "pullRequest");
              assert.deepEqual(pullRequest.base, {
                ref: "master",
                label: "master",
                sha: "fake-base-sha",
              });
              assert.deepEqual(pullRequest.head, {
                ref: "fake-branch",
                label: "fake-user:fake-branch",
                sha: "fake-head-sha",
              });
              assert.strictEqual(await github.getPullRequest("ts-common/azure-js-dev-tools", pullRequest.number), pullRequest);
              await assertEx.throwsAsync(github.getPullRequest("fake-user/azure-js-dev-tools", pullRequest.number));
            } finally {
              await github.deleteRepository("fake-user/azure-js-dev-tools");
            }
          }
        });
      });

      describe("closePullRequest()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.closePullRequest(undefined as any, 50));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.closePullRequest(null as any, 50));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.closePullRequest("", 50));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.closePullRequest("ImARepositoryThatDoesntExist", 50));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.closePullRequest("ts-common/azure-js-dev-tools", 1325097123));
        });

        it("with pull request number that is already closed", async function () {
          await github.closePullRequest("ts-common/azure-js-dev-tools", 113);
        });
      });

      describe("mergePullRequest()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.mergePullRequest(undefined as any, 50));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.mergePullRequest(null as any, 50));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.mergePullRequest("", 50));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.mergePullRequest("ImARepositoryThatDoesntExist", 50));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.mergePullRequest("ts-common/azure-js-dev-tools", 1325097123));
        });

        it("with pull request number that is already closed", async function () {
          await assertEx.throwsAsync(github.mergePullRequest("ts-common/azure-js-dev-tools", 113));
        });
      });

      describe("getPullRequest()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.getPullRequest(undefined as any, 50));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getPullRequest(null as any, 50));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.getPullRequest("", 50));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequest("ImARepositoryThatDoesntExist", 50));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequest("ts-common/azure-js-dev-tools", 1325097123));
        });

        it("with pull request number that exists", async function () {
          const pullRequest: GitHubPullRequest = await github.getPullRequest("ts-common/azure-js-dev-tools", 113);
          assert(pullRequest);
          assert(pullRequest.base);
          assert.strictEqual(pullRequest.base.label, "ts-common:master");
          assert.strictEqual(pullRequest.base.ref, "master");
          assert.strictEqual(pullRequest.base.sha, "c6f8a6b543ece6447ce1f3f5c33d0672989965c5");
          assert.strictEqual(pullRequest.diff_url, "https://github.com/ts-common/azure-js-dev-tools/pull/113.diff");
          assert(pullRequest.head);
          assert.strictEqual(pullRequest.head.label, "ts-common:daschult/capturedLines");
          assert.strictEqual(pullRequest.head.ref, "daschult/capturedLines");
          assert.strictEqual(pullRequest.head.sha, "bc0488dbe9ba7b2dd32c094c826cf799c55ca67d");
          assert.strictEqual(pullRequest.html_url, "https://github.com/ts-common/azure-js-dev-tools/pull/113");
          assert.strictEqual(pullRequest.id, 253577251);
          assert.strictEqual(pullRequest.merge_commit_sha, "17581a5c96422bf4feb5e67edf9920cd62671ccc");
          assert.strictEqual(pullRequest.number, 113);
          assert.strictEqual(pullRequest.state, "closed");
          assert.strictEqual(pullRequest.title, "Buffer external process output and error until newline character");
          assert.strictEqual(pullRequest.url, "https://api.github.com/repos/ts-common/azure-js-dev-tools/pulls/113");
          assert.strictEqual(pullRequest.body, "");
        });
      });

      describe("addPullRequestLabels()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.addPullRequestLabels(undefined as any, 50, ["nope"]));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.addPullRequestLabels(null as any, 50, ["nope"]));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.addPullRequestLabels("", 50, ["nope"]));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.addPullRequestLabels("ImARepositoryThatDoesntExist", 50, ["nope"]));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.addPullRequestLabels("ts-common/azure-js-dev-tools", 1325097123, ["nope"]));
        });

        it("with label that doesn't exist in the repository", async function () {
          assert.deepEqual(await github.addPullRequestLabels("ts-common/azure-js-dev-tools", 113, "nope"), [
            "nope"
          ]);
          const repositoryLabels: GitHubLabel[] = await github.getLabels("ts-common/azure-js-dev-tools");
          assert.strictEqual(contains(repositoryLabels, (label: GitHubLabel) => label.name === "nope"), true);
          assert.deepEqual(await github.removePullRequestLabels("ts-common/azure-js-dev-tools", 113, "nope"), [
            "nope"
          ]);
          await github.deleteLabel("ts-common/azure-js-dev-tools", "nope");
        });
      });

      describe("removePullRequestLabels()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.removePullRequestLabels(undefined as any, 50, ["nope"]));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.removePullRequestLabels(null as any, 50, ["nope"]));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.removePullRequestLabels("", 50, ["nope"]));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.removePullRequestLabels("ImARepositoryThatDoesntExist", 50, ["nope"]));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.removePullRequestLabels("ts-common/azure-js-dev-tools", 1325097123, ["nope"]));
        });

        it("with label that doesn't exist in the repository", async function () {
          const removedLabelNames: string[] = await github.removePullRequestLabels("ts-common/azure-js-dev-tools", 113, ["nope"]);
          assert.deepEqual(removedLabelNames, []);
        });

        it("with label that hasn't been added to the pull request", async function () {
          const removedLabelNames: string[] = await github.removePullRequestLabels("ts-common/azure-js-dev-tools", 113, ["in progress"]);
          assert.deepEqual(removedLabelNames, []);
        });

        it("with label that has been added to the pull request", async function () {
          await github.addPullRequestLabels("ts-common/azure-js-dev-tools", 113, "in progress");
          const removedLabelNames: string[] = await github.removePullRequestLabels("ts-common/azure-js-dev-tools", 113, ["in progress"]);
          assert.deepEqual(removedLabelNames, ["in progress"]);
        });
      });

      describe("getPullRequestComments()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.getPullRequestComments(undefined as any, 50));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getPullRequestComments(null as any, 50));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.getPullRequestComments("", 50));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequestComments("ImARepositoryThatDoesntExist", 50));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.getPullRequestComments("ts-common/azure-js-dev-tools", 1325097123));
        });

        it("with pull request number that exists", async function () {
          const comments: GitHubComment[] = await github.getPullRequestComments("ts-common/azure-js-dev-tools", 113);
          assertEx.defined(comments, "comments");
          assert.deepEqual(comments, []);
        });
      });

      describe("createPullRequestComment()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.createPullRequestComment(undefined as any, 50, "Fake Comment Body"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createPullRequestComment(null as any, 50, "Fake Comment Body"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.createPullRequestComment("", 50, "Fake Comment Body"));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequestComment("ImARepositoryThatDoesntExist", 50, "Fake Comment Body"));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.createPullRequestComment("ts-common/azure-js-dev-tools", 1325097123, "Fake Comment Body"));
        });

        it("with pull request number that exists", async function () {
          const createdComment: GitHubComment = await github.createPullRequestComment("ts-common/azure-js-dev-tools", 113, "Fake Comment Body");
          try {
            assertEx.defined(createdComment, "createdComment");
            assertEx.defined(createdComment.id, "createdComment.id");
            assert.strictEqual(createdComment.body, "Fake Comment Body");
          } finally {
            await github.deletePullRequestComment("ts-common/azure-js-dev-tools", 113, createdComment);
          }
        });
      });

      describe("updatePullRequestComment()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment(undefined as any, 50, 12, "Fake Comment Body"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.updatePullRequestComment(null as any, 50, 12, "Fake Comment Body"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("", 50, 12, "Fake Comment Body"));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("ImARepositoryThatDoesntExist", 50, 12, "Fake Comment Body"));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("ts-common/azure-js-dev-tools", 1325097123, 198761876234, "Fake Comment Body"));
        });

        it("with comment number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.updatePullRequestComment("ts-common/azure-js-dev-tools", 113, 13925876, "New Fake Comment Body"));
        });

        it("with comment that exists", async function () {
          const createdComment: GitHubComment = await github.createPullRequestComment("ts-common/azure-js-dev-tools", 113, "Fake Comment Body");
          try {
            const updatedComment: GitHubComment = await github.updatePullRequestComment("ts-common/azure-js-dev-tools", 113, createdComment, "New Fake Comment Body");
            assertEx.defined(updatedComment, "createdComment");
            assert.strictEqual(updatedComment.id, createdComment.id);
            assert.strictEqual(updatedComment.body, "New Fake Comment Body");
          } finally {
            await github.deletePullRequestComment("ts-common/azure-js-dev-tools", 113, createdComment);
          }
        });
      });

      describe("deletePullRequestComment()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment(undefined as any, 50, 12));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.deletePullRequestComment(null as any, 50, 12));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("", 50, 12));
        });

        it("with repository that doesn't exist", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("ImARepositoryThatDoesntExist", 50, 12));
        });

        it("with pull request number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("ts-common/azure-js-dev-tools", 1325097123, 198761876234));
        });

        it("with comment number that doesn't exist", async function () {
          await assertEx.throwsAsync(github.deletePullRequestComment("ts-common/azure-js-dev-tools", 113, 1392581235476));
        });
      });

      describe("getCommit()", function () {
        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.getCommit(undefined as any, "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getCommit(null as any, "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.getCommit("", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"));
        });

        it(`with repository that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.getCommit("ImARepositoryThatDoesntExist", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"));
        });

        it(`with commit that doesn't exist`, async function () {
          const commit: GitHubCommit | undefined = await github.getCommit("ts-common/azure-js-dev-tools", "applesandbananas");
          assert.strictEqual(commit, undefined);
        });

        it(`with commit that does exist`, async function () {
          const commit: GitHubCommit = (await github.getCommit("ts-common/azure-js-dev-tools", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"))!;
          assertEx.defined(commit, "commit");
          assert.strictEqual(commit.sha, "c6f8a6b543ece6447ce1f3f5c33d0672989965c5");
          assertEx.defined(commit.commit, "commit.commit");
          assert.strictEqual(commit.commit.message, `Merge pull request #112 from ts-common/daschult/encoding\n\n Add encoding to stdout and stderr capture functions`);
        });
      });

      describe("getAllReferences()", function () {
        this.timeout(5000);

        it("with undefined", async function () {
          await assertEx.throwsAsync(github.getAllReferences(undefined as any));
        });

        it("with null", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getAllReferences(null as any));
        });

        it(`with ""`, async function () {
          await assertEx.throwsAsync(github.getAllReferences(""));
        });

        it(`with repository that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.getAllReferences("imarepositorythatdoesntexist"));
        });

        it(`with "ts-common/azure-js-dev-tools"`, async function () {
          const references: GitHubReference[] = await github.getAllReferences("ts-common/azure-js-dev-tools");
          assertEx.defined(references, "references");
          assertEx.greaterThan(references.length, 0, "labels.length");
          assert(contains(references, (reference: GitHubReference) => reference.ref === "refs/heads/master"));
        });
      });

      describe("getAllBranches()", function () {
        this.timeout(5000);

        it("with undefined", async function () {
          await assertEx.throwsAsync(github.getAllBranches(undefined as any));
        });

        it("with null", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getAllBranches(null as any));
        });

        it(`with ""`, async function () {
          await assertEx.throwsAsync(github.getAllBranches(""));
        });

        it(`with repository that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.getAllBranches("imarepositorythatdoesntexist"));
        });

        it(`with "ts-common/azure-js-dev-tools"`, async function () {
          const branches: GitHubBranch[] = await github.getAllBranches("ts-common/azure-js-dev-tools");
          assertEx.defined(branches, "references");
          assertEx.greaterThan(branches.length, 0, "labels.length");
          assert(contains(branches, (branch: GitHubBranch) => branch.ref === "refs/heads/master"));
          assert(contains(branches, (branch: GitHubBranch) => branch.name === "master"));
        });
      });

      describe("getBranch()", function () {
        this.timeout(5000);

        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.getBranch(undefined as any, "fake-branch-name"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.getBranch(null as any, "fake-branch-name"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.getBranch("", "fake-branch-name"));
        });

        it(`with repository that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.getBranch("imarepositorythatdoesntexist", "fake-branch-name"));
        });

        it(`with "ts-common/azure-js-dev-tools" and undefined branch name`, async function () {
          await assertEx.throwsAsync(github.getBranch("ts-common/azure-js-dev-tools", undefined as any));
        });

        it(`with "ts-common/azure-js-dev-tools" and null branch name`, async function () {
          // tslint:disable-next-line: no-null-keyword
          await assertEx.throwsAsync(github.getBranch("ts-common/azure-js-dev-tools", null as any));
        });

        it(`with "ts-common/azure-js-dev-tools" and empty branch name`, async function () {
          await assertEx.throwsAsync(github.getBranch("ts-common/azure-js-dev-tools", ""));
        });

        it(`with "ts-common/azure-js-dev-tools" and non-existing branch name`, async function () {
          await assertEx.throwsAsync(github.getBranch("ts-common/azure-js-dev-tools", "imabranchthatdoesntexist"));
        });

        it(`with "ts-common/azure-js-dev-tools" and existing branch name`, async function () {
          const branch: GitHubBranch = await github.getBranch("ts-common/azure-js-dev-tools", "master");
          assertEx.defined(branch, "branch");
          assert.strictEqual(branch.name, "master");
          assert.strictEqual(branch.ref, "refs/heads/master");
          assertEx.definedAndNotEmpty(branch.node_id, "branch.node_id");
          assertEx.definedAndNotEmpty(branch.url, "branch.url");
          assertEx.defined(branch.object, "branch.object");
          assert.strictEqual(branch.object.type, "commit");
          assertEx.definedAndNotEmpty(branch.object.sha);
          assertEx.definedAndNotEmpty(branch.object.url);
        });
      });

      describe("deleteBranch()", function () {
        this.timeout(5000);

        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.deleteBranch(undefined as any, "fake-branch-name"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.deleteBranch(null as any, "fake-branch-name"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.deleteBranch("", "fake-branch-name"));
        });

        it(`with repository that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.deleteBranch("imarepositorythatdoesntexist", "fake-branch-name"));
        });

        it(`with "ts-common/azure-js-dev-tools" and undefined branch name`, async function () {
          await assertEx.throwsAsync(github.deleteBranch("ts-common/azure-js-dev-tools", undefined as any));
        });

        it(`with "ts-common/azure-js-dev-tools" and null branch name`, async function () {
          // tslint:disable-next-line: no-null-keyword
          await assertEx.throwsAsync(github.deleteBranch("ts-common/azure-js-dev-tools", null as any));
        });

        it(`with "ts-common/azure-js-dev-tools" and empty branch name`, async function () {
          await assertEx.throwsAsync(github.deleteBranch("ts-common/azure-js-dev-tools", ""));
        });

        it(`with "ts-common/azure-js-dev-tools" and non-existing branch name`, async function () {
          await assertEx.throwsAsync(github.deleteBranch("ts-common/azure-js-dev-tools", "imabranchthatdoesntexist"));
        });
      });

      describe("createBranch()", function () {
        this.timeout(5000);

        it("with undefined repository", async function () {
          await assertEx.throwsAsync(github.createBranch(undefined as any, "fake-branch-name", "fake-branch-sha"));
        });

        it("with null repository", async function () {
          // tslint:disable-next-line:no-null-keyword
          await assertEx.throwsAsync(github.createBranch(null as any, "fake-branch-name", "fake-branch-sha"));
        });

        it(`with "" repository`, async function () {
          await assertEx.throwsAsync(github.createBranch("", "fake-branch-name", "fake-branch-sha"));
        });

        it(`with repository that doesn't exist`, async function () {
          await assertEx.throwsAsync(github.createBranch("imarepositorythatdoesntexist", "fake-branch-name", "fake-branch-sha"));
        });

        it(`with "ts-common/azure-js-dev-tools" and undefined branch name`, async function () {
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", undefined as any, "fake-branch-sha"));
        });

        it(`with "ts-common/azure-js-dev-tools" and null branch name`, async function () {
          // tslint:disable-next-line: no-null-keyword
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", null as any, "fake-branch-sha"));
        });

        it(`with "ts-common/azure-js-dev-tools" and empty branch name`, async function () {
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", "", "fake-branch-sha"));
        });

        it(`with "ts-common/azure-js-dev-tools" and existing branch name`, async function () {
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", "master", "fake-branch-sha"));
        });

        it(`with "ts-common/azure-js-dev-tools" and undefined branch sha`, async function () {
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", "fake/branch", undefined as any));
        });

        it(`with "ts-common/azure-js-dev-tools" and null branch sha`, async function () {
          // tslint:disable-next-line: no-null-keyword
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", "fake/branch", null as any));
        });

        it(`with "ts-common/azure-js-dev-tools" and empty branch sha`, async function () {
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", "fake/branch", ""));
        });

        it(`with "ts-common/azure-js-dev-tools" and non-existing branch sha`, async function () {
          await assertEx.throwsAsync(github.createBranch("ts-common/azure-js-dev-tools", "fake/branch", "fake-branch-sha"));
        });

        it(`with "ts-common/azure-js-dev-tools", non-existing branch name, and existing sha`, async function () {
          const master: GitHubBranch = await github.getBranch("ts-common/azure-js-dev-tools", "master");
          assertEx.defined(master, "master");

          const fakeBranch: GitHubBranch = await github.createBranch("ts-common/azure-js-dev-tools", "fake/branch", master.object.sha);
          try {
            assertEx.defined(fakeBranch, "fakeBranch");
            assert.strictEqual(fakeBranch.name, "fake/branch");
            assert.strictEqual(fakeBranch.ref, "refs/heads/fake/branch");
            assertEx.definedAndNotEmpty(fakeBranch.node_id, "fakeBranch.node_id");
            assertEx.definedAndNotEmpty(fakeBranch.url, "fakeBranch.url");
            assertEx.defined(fakeBranch.object, "fakeBranch.object");
            assert.strictEqual(fakeBranch.object.type, "commit");
            assertEx.definedAndNotEmpty(fakeBranch.object.sha, "fakeBranch.object.sha");
            assertEx.definedAndNotEmpty(fakeBranch.object.url, "fakeBranch.object.url");
          } finally {
            await github.deleteBranch("ts-common/azure-js-dev-tools", "fake/branch");
          }
        });
      });
    });
  }
  githubTests("FakeGitHub", createFakeGitHub());
  githubTests("RealGitHub", createRealGitHub());
});

function createFakeGitHub(): FakeGitHub {
  const fakeGitHub = new FakeGitHub();

  const fakeUserLogin = "fakeUser";
  fakeGitHub.createUser(fakeUserLogin);
  fakeGitHub.setCurrentUser(fakeUserLogin);

  fakeGitHub.createRepository("ts-common/azure-js-dev-tools");
  fakeGitHub.createCommit("ts-common/azure-js-dev-tools", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5", `Merge pull request #112 from ts-common/daschult/encoding\n\n Add encoding to stdout and stderr capture functions`);
  fakeGitHub.createCommit("ts-common/azure-js-dev-tools", "bc0488dbe9ba7b2dd32c094c826cf799c55ca67d", `fake pull request base commit message`);
  fakeGitHub.createBranch("ts-common/azure-js-dev-tools", "master", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5");
  fakeGitHub.createBranch("ts-common/azure-js-dev-tools", "daschult/capturedLines", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5");
  fakeGitHub.createBranch("ts-common/azure-js-dev-tools", "fake-head-branch", "c6f8a6b543ece6447ce1f3f5c33d0672989965c5");
  fakeGitHub.createLabel("ts-common/azure-js-dev-tools", "Planned-Sprint-130", "fake label color");
  fakeGitHub.createFakePullRequest("ts-common/azure-js-dev-tools", createFakeGitHubPullRequest({
    base: {
      label: "ts-common:master",
      ref: "master",
      sha: "c6f8a6b543ece6447ce1f3f5c33d0672989965c5"
    },
    diff_url: "https://github.com/ts-common/azure-js-dev-tools/pull/113.diff",
    head: {
      label: "ts-common:daschult/capturedLines",
      ref: "daschult/capturedLines",
      sha: "bc0488dbe9ba7b2dd32c094c826cf799c55ca67d"
    },
    html_url: "https://github.com/ts-common/azure-js-dev-tools/pull/113",
    id: 253577251,
    merge_commit_sha: "17581a5c96422bf4feb5e67edf9920cd62671ccc",
    number: 113,
    state: "closed",
    title: "Buffer external process output and error until newline character",
    url: "https://api.github.com/repos/ts-common/azure-js-dev-tools/pulls/113"
  }));

  fakeGitHub.createRepository("test-repo-billy/azure-sdk-for-js");
  fakeGitHub.createLabel("test-repo-billy/azure-sdk-for-js", "Fake-Label", "fake label color2");

  return fakeGitHub;
}

function createRealGitHub(): RealGitHub | undefined {
  const packageJsonFilePath: string | undefined = findPackageJsonFileSync(__dirname);
  const githubAuthFilePath: string = joinPath(getParentFolderPath(packageJsonFilePath!), "github.auth");
  let result: RealGitHub | undefined;
  try {
    result = RealGitHub.fromTokenFile(githubAuthFilePath);
  } catch (error) {
  }
  return result;
}

interface GitHubPullRequestOptions {
  base?: GitHubPullRequestCommit;
  head?: GitHubPullRequestCommit;
  id?: number;
  labels?: GitHubLabel[];
  merge_commit_sha?: string;
  number?: number;
  state?: "open" | "closed";
  title?: string;
  url?: string;
  html_url?: string;
  diff_url?: string;
  milestone?: GitHubMilestone;
  assignees?: GitHubUser[];
}

function createFakeGitHubPullRequest(options: GitHubPullRequestOptions = {}): GitHubPullRequest {
  const url: string = options.url != undefined ? options.url : "Fake URL";
  return {
    base: options.base || createFakeGitHubCommit("Base"),
    head: options.head || createFakeGitHubCommit("Head"),
    id: options.id != undefined ? options.id : 0,
    labels: options.labels || [],
    merge_commit_sha: options.merge_commit_sha != undefined ? options.merge_commit_sha : "Fake Merge Commit SHA",
    number: options.number != undefined ? options.number : 1,
    state: options.state != undefined ? options.state : "open",
    title: options.title != undefined ? options.title : "Fake Title",
    url: url,
    html_url: options.html_url != undefined ? options.html_url : url,
    diff_url: options.diff_url != undefined ? options.diff_url : `${url}.diff`,
    assignees: options.assignees,
    milestone: options.milestone
  };
}

interface GitHubLabelOptions {
  id?: number;
  node_id?: string;
  url?: string;
  name?: string;
  color?: string;
  default?: boolean;
}

function createFakeGitHubLabel(options: GitHubLabelOptions = {}): GitHubLabel {
  return {
    name: options.name != undefined ? options.name : "Fake Label Name",
    color: options.color != undefined ? options.color : "Fake Label Color",
    default: options.default != undefined ? options.default : false,
    id: options.id != undefined ? options.id : 0,
    node_id: options.node_id != undefined ? options.node_id : "Fake node_id",
    url: options.url != undefined ? options.url : "Fake Label URL"
  };
}

function createFakeGitHubCommit(name: "Base" | "Head"): GitHubPullRequestCommit {
  return {
    label: `Fake ${name} Commit`,
    ref: `Fake ${name} Ref`,
    sha: `Fake ${name} SHA`
  };
}

export interface GitHubUserOptions {
  id?: number;
  login?: string;
  node_id?: string;
  name?: string;
  url?: string;
  site_admin?: boolean;
}

function createFakeGitHubUser(options: GitHubUserOptions = {}): GitHubUser {
  return {
    id: options.id != undefined ? options.id : 0,
    login: options.login != undefined ? options.login : "Fake User Login",
    node_id: options.node_id != undefined ? options.node_id : "Fake Node ID",
    name: options.name != undefined ? options.name : "Fake User Name",
    url: options.url != undefined ? options.url : "Fake User URL",
    site_admin: options.site_admin != undefined ? options.site_admin : false,
  };
}
