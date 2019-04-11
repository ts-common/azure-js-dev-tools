import { checkEverything, resolvePath, checkFileContains, joinPath } from "../lib";

const testFolderPath: string = resolvePath(__dirname, "..", "test");
checkEverything({
  checkForOnlyCallsOptions: {
    startPaths: testFolderPath
  },
  checkForSkipCallsOptions: {
    startPaths: testFolderPath,
    allowedSkips: {
      "blobStorageTests": "all",
      "githubTests": "all",
    }
  },
  additionalChecks: [
    checkFileContains(joinPath(testFolderPath, "blobStorageTests.ts"), `const blobStorageUrl = "https://sdkautomationdev.blob.core.windows.net/";`)
  ]
});
