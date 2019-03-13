import { checkEverything, resolvePath, checkFileContains, joinPath } from "../lib";

const testFolderPath: string = resolvePath(__dirname, "..", "test");
checkEverything({
  checkForOnlyCallsOptions: {
    startPaths: testFolderPath
  },
  checkForSkipCallsOptions: {
    startPaths: testFolderPath,
    allowedSkips: {
      "blobStorageTests": "all"
    }
  },
  additionalChecks: [
    checkFileContains(joinPath(testFolderPath, "blobStorageTests.ts"), `const realStorageUrl = "https://sdkautomationdev.blob.core.windows.net/";`)
  ]
});
