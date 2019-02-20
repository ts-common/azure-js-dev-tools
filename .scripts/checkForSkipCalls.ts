import { checkForSkipCalls, resolvePath } from "../lib";

checkForSkipCalls({
  startPaths: resolvePath(__dirname, "..", "test"),
  allowedSkips: {
    "blobStorageTests": "all"
  }
});
