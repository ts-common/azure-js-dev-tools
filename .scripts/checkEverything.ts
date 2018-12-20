import { checkEverything, resolvePath } from "../lib";

checkEverything({
  checkForOnlyCallsOptions: {
    startPaths: resolvePath(__dirname, "..", "test")
  }
});