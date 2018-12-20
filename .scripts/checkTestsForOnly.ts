import { checkTestsForOnly, resolvePath } from "../lib";

checkTestsForOnly(resolvePath(__dirname, "..", "test"));