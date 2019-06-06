// import { assert } from "chai";
// import { createFolder, deleteFolder, folderExists, joinPath, resolvePath } from "../lib";
// import { assertEx } from "../lib/assertEx";
// import { GitCurrentCommitShaResult, GitCheckoutResult } from "../lib/git";
// import { IsomorphicGit } from "../lib/isomorphicGit";

// const repositoryUrl = "https://github.com/ts-common/azure-js-dev-tools.git";

// let fakeFolderPathCount = 1;
// function getFakeFolderName(): string {
//   return `fake-folder-${fakeFolderPathCount++}`;
// }

// async function getIsomorphicGit(cloneRepository = true): IsomorphicGit {
//   const fakeFolderName: string = getFakeFolderName();
//   const fakeFolderPath: string = resolvePath(fakeFolderName);
//   const git: IsomorphicGit = new IsomorphicGit({
//     executionFolderPath: fakeFolderPath,
//   });
//   if (cloneRepository) {
//     await git.clone(repositoryUrl);
//   }
//   return git;
// }

// describe("isomorphicGit.ts", function () {
//   describe("IsomorphicGit", function () {
//     it("currentCommitSha()", async function () {
//       const git: IsomorphicGit = getIsomorphicGit();
//       const result: GitCurrentCommitShaResult = await git.getCurrentCommitSha();
//       assertEx.defined(result, "result");
//       assertEx.definedAndNotEmpty(result.currentCommitSha, "result.currentCommitSha");
//     });

//     describe("fetch()", function () {
//       it("with no options", async function () {
//         const git: IsomorphicGit = getIsomorphicGit();
//         const result: IsomorphicGit.FetchResponse = await git.fetch();
//         assertEx.defined(result, "result");
//       });

//       it("with prune: true", async function () {
//         const git: IsomorphicGit = getIsomorphicGit();
//         const result: IsomorphicGit.FetchResponse = await git.fetch({ prune: true });
//         assertEx.defined(result, "result");
//       });

//       it("with prune: false", async function () {
//         const git: IsomorphicGit = getIsomorphicGit();
//         const result: IsomorphicGit.FetchResponse = await git.fetch({ prune: false });
//         assertEx.defined(result, "result");
//       });
//     });

//     it("mergeOriginMaster()", async function () {
//       const git: IsomorphicGit = getIsomorphicGit();
//       const result: IsomorphicGit.MergeReport = await git.mergeOriginMaster();
//       assertEx.defined(result, "result");
//     });

//     describe("clone()", function () {
//       it("with repository url that doesn't exist", async function () {
//         const git: IsomorphicGit = getIsomorphicGit(false);
//         assert.strictEqual(await folderExists(git.executionFolderPath), false);
//         try {
//           const error: Error = await assertEx.throwsAsync(git.clone("https://my.fake.git/url"));
//           assert.strictEqual(error.message, `getaddrinfo ENOTFOUND my.fake.git my.fake.git:443`);
//           assert.strictEqual(await folderExists(git.executionFolderPath), true);
//         } finally {
//           await deleteFolder(git.executionFolderPath);
//         }
//       });

//       it("with branch that doesn't exist", async function () {
//         const git: IsomorphicGit = getIsomorphicGit(false);
//         assert.strictEqual(await folderExists(git.executionFolderPath), false);
//         try {
//           const error: Error = await assertEx.throwsAsync(git.clone(repositoryUrl, {
//             branch: "fake-branch",
//           }));
//           assert.strictEqual(error.message, `Could not resolve reference "fake-branch".`);
//           assert.strictEqual(await folderExists(joinPath(git.executionFolderPath, ".git")), true);
//         } finally {
//           await deleteFolder(git.executionFolderPath);
//         }
//       });

//       it("with relative path directory that doesn't exist", async function () {
//         const git: IsomorphicGit = getIsomorphicGit(false);
//         const folderPath: string = getFakeFolderName();
//         assert.strictEqual(await folderExists(git.executionFolderPath), false);
//         try {
//           await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
//             directory: folderPath,
//           });
//           assert.strictEqual(await folderExists(joinPath(git.executionFolderPath, folderPath, ".git")), true);
//         } finally {
//           await deleteFolder(git.executionFolderPath);
//         }
//       });

//       it("with relative path directory that exists", async function () {
//         const git: IsomorphicGit = getIsomorphicGit(false);
//         const folderPath: string = getFakeFolderName();
//         assert.strictEqual(await createFolder(joinPath(git.executionFolderPath, folderPath)), true);
//         try {
//           await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
//             directory: folderPath,
//           });
//           assert.strictEqual(await folderExists(joinPath(git.executionFolderPath, folderPath, ".git")), true);
//         } finally {
//           await deleteFolder(git.executionFolderPath);
//         }
//       });

//       it("with rooted path directory that doesn't exist", async function () {
//         const git: IsomorphicGit = getIsomorphicGit(false);
//         const rootedFolderPath: string = resolvePath(getFakeFolderName());
//         assert.strictEqual(await folderExists(git.executionFolderPath), false);
//         assert.strictEqual(await folderExists(rootedFolderPath), false);
//         try {
//           await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
//             directory: rootedFolderPath,
//           });
//           assert.strictEqual(await folderExists(git.executionFolderPath), false);
//           assert.strictEqual(await folderExists(joinPath(rootedFolderPath, ".git")), true);
//         } finally {
//           await deleteFolder(git.executionFolderPath);
//           await deleteFolder(rootedFolderPath);
//         }
//       });

//       it("with rooted path directory that exists", async function () {
//         const git: IsomorphicGit = getIsomorphicGit(false);
//         const rootedFolderPath: string = resolvePath(getFakeFolderName());
//         assert.strictEqual(await createFolder(rootedFolderPath), true);
//         assert.strictEqual(await folderExists(git.executionFolderPath), false);
//         try {
//           await git.clone("https://github.com/ts-common/azure-js-dev-tools.git", {
//             directory: rootedFolderPath,
//           });
//           assert.strictEqual(await folderExists(git.executionFolderPath), false);
//           assert.strictEqual(await folderExists(joinPath(rootedFolderPath, ".git")), true);
//         } finally {
//           await deleteFolder(git.executionFolderPath);
//           await deleteFolder(rootedFolderPath);
//         }
//       });
//     });

//     describe("checkout()", function () {
//       this.timeout(10000);

//       it("with current branch", async function () {
//         const git: IsomorphicGit = getIsomorphicGit();
//         const result: GitCheckoutResult = await git.checkout(await git.currentBranch());
//         assert.deepEqual(result, {});
//       });

//       it("with branch that doesn't exist", async function () {
//         const git: IsomorphicGit = getIsomorphicGit();
//         const result: GitCheckoutResult = await git.checkout("idontexist");
//         assert.deepEqual(result, {});
//       });
//     });
//   });
// });
