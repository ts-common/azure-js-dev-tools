import { assert } from "chai";
import { Version } from "../lib";
import { getNodeVersion } from "../lib/node";

describe("node.ts", function () {
  it("getNodeVersion()", function () {
    const version: Version = getNodeVersion();
    assert(version);
    assert.notEqual(version.major, undefined);
    assert.notEqual(version.minor, undefined);
    assert.notEqual(version.patch, undefined);
  });
});