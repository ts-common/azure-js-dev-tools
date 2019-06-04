import { assert } from "chai";
import { padLeft, clone } from "../lib/common";

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

  describe("clone()", function () {
    it("with null", function () {
      // tslint:disable-next-line: no-null-keyword
      assert.strictEqual(null, clone(null));
    });

    it("with undefined", function () {
      assert.strictEqual(undefined, clone(undefined));
    });

    it("with false", function () {
      assert.strictEqual(false, clone(false));
    });

    it("with true", function () {
      assert.strictEqual(true, clone(true));
    });

    it("with number", function () {
      assert.strictEqual(53, clone(53));
    });

    it(`with ""`, function () {
      assert.strictEqual("", clone(""));
    });

    it(`with "abc"`, function () {
      assert.strictEqual("abc", clone("abc"));
    });

    it(`with []`, function () {
      const value: any[] = [];
      const clonedValue: any[] = clone(value);
      assert.deepEqual(clonedValue, value);
      assert.notStrictEqual(clonedValue, value);
    });

    it(`with [false, true, 5, "10"]`, function () {
      const value: any[] = [false, true, 5, "10"];
      const clonedValue: any[] = clone(value);
      assert.deepEqual(clonedValue, value);
      assert.notStrictEqual(clonedValue, value);
    });

    it(`with [{},{}]`, function () {
      const value: any[] = [{}, {}];
      const clonedValue: any[] = clone(value);
      assert.deepEqual(clonedValue, value);
      assert.notStrictEqual(clonedValue, value);
      assert.deepEqual(clonedValue[0], value[0]);
      assert.notStrictEqual(clonedValue[0], value[0]);
      assert.deepEqual(clonedValue[1], value[1]);
      assert.notStrictEqual(clonedValue[1], value[1]);
    });

    it(`with {"a":5,"b":true}`, function () {
      const value = { "a": 5, "b": true };
      const clonedValue = clone(value);
      assert.deepEqual(clonedValue, value);
      assert.notStrictEqual(clonedValue, value);
      assert.strictEqual(clonedValue.a, value.a);
      assert.strictEqual(clonedValue.b, value.b);
    });

    it(`with {"a":[],"b":() => false}`, function () {
      const value = { "a": [], "b": () => false };
      const clonedValue = clone(value);
      assert.deepEqual(clonedValue, value);
      assert.notStrictEqual(clonedValue, value);
      assert.deepEqual(clonedValue.a, value.a);
      assert.notStrictEqual(clonedValue.a, value.a);
      assert.strictEqual(clonedValue.b, value.b);
    });
  });
});
