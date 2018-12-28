import { checkEverything, resolvePath } from "../lib";

const testFolderPath: string = resolvePath(__dirname, "..", "test");
checkEverything({
  checkForOnlyCallsOptions: {
    startPaths: testFolderPath
  },
  checkForSkipCallsOptions: {
    startPaths: testFolderPath
  }
});