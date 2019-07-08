import { assert } from "chai";
import { padLeft, getLines } from "../lib/common";

describe("common.ts", function () {
  describe("padLeft()", function () {
    it(`with "" and 0`, function () {
      assert.strictEqual(padLeft("", 0), "");
    });

    it(`with "" and 5`, function () {
      assert.strictEqual(padLeft("", 5), "     ");
    });

    it(`with "abc" and 2`, function () {
      assert.strictEqual(padLeft("abc", 2), "abc");
    });

    it(`with "abc" and 5`, function () {
      assert.strictEqual(padLeft("abc", 5), "  abc");
    });

    it(`with "", 0, and "z"`, function () {
      assert.strictEqual(padLeft("", 0, "z"), "");
    });

    it(`with "", 5, and "z"`, function () {
      assert.strictEqual(padLeft("", 5, "z"), "zzzzz");
    });

    it(`with "abc", 2, and "z"`, function () {
      assert.strictEqual(padLeft("abc", 2, "z"), "abc");
    });

    it(`with "abc", 5, and "z"`, function () {
      assert.strictEqual(padLeft("abc", 5, "z"), "zzabc");
    });

    it(`with 20, 5, and "0"`, function () {
      assert.strictEqual(padLeft(20, 5, "0"), "00020");
    });
  });

  describe("getLines()", function () {
    it("with undefined", function () {
      assert.deepEqual(getLines(undefined), []);
    });

    it("with null", function () {
      // tslint:disable-next-line: no-null-keyword
      assert.deepEqual(getLines(null as any), []);
    });

    it(`with ""`, function () {
      assert.deepEqual(getLines(""), [""]);
    });

    it(`with "abc"`, function () {
      assert.deepEqual(getLines("abc"), ["abc"]);
    });

    it(`with "\\n"`, function () {
      assert.deepEqual(getLines("\n"), ["", ""]);
    });

    it(`with "a\\nb"`, function () {
      assert.deepEqual(getLines("a\nb"), ["a", "b"]);
    });

    it(`with "a\\r\\nb"`, function () {
      assert.deepEqual(getLines("a\r\nb"), ["a", "b"]);
    });
  });
});
