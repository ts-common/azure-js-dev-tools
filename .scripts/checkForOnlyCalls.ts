import { checkForOnlyCalls, resolvePath } from "../lib";

checkForOnlyCalls({
  startPaths: resolvePath(__dirname, "..", "test")
});