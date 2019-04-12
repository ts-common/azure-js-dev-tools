import { assert } from "chai";
import { any, first, last } from "../lib/arrays";

describe("arrays.ts", function () {
  describe("any()", function () {
    it("with undefined", function () {
      assert.strictEqual(any(undefined), false);
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(any(null as any), false);
    });

    it("with empty array", function () {
      assert.strictEqual(any([]), false);
    });

    it("with non-empty array", function () {
      assert.strictEqual(any(["hello"]), true);
    });
  });

  describe("first()", function () {
    it("with undefined values and no condition", function () {
      assert.strictEqual(first(undefined), undefined);
    });

    it("with null values and no condition", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(first(null as any), undefined);
    });

    it("with empty array and no condition", function () {
      assert.strictEqual(first([]), undefined);
    });

    it("with non-empty array and no condition", function () {
      assert.strictEqual(first(["hello"]), "hello");
    });

    it("with undefined values and value condition", function () {
      assert.strictEqual(first(undefined, 3), undefined);
    });

    it("with null values and value condition", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(first(null as any, 3), undefined);
    });

    it("with empty array and value condition", function () {
      assert.strictEqual(first([] as number[], 3), undefined);
    });

    it("with non-empty array and value condition", function () {
      assert.strictEqual(first([1, 2, 3, 4, 5, 4, 3, 2, 1], 3), 3);
    });

    it("with undefined values and function condition", function () {
      assert.strictEqual(first(undefined, (value: number) => value % 2 === 0), undefined);
    });

    it("with null values and value condition", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(first(null as any, (value: number) => value % 2 === 0), undefined);
    });

    it("with empty array and value condition", function () {
      assert.strictEqual(first([] as number[], (value: number) => value % 2 === 0), undefined);
    });

    it("with non-empty array and value condition", function () {
      assert.strictEqual(first([1, 2, 3, 4, 5, 4, 3, 2, 1], (value: number) => value % 2 === 0), 2);
    });
  });

  describe("last()", function () {
    it("with undefined values and no condition", function () {
      assert.strictEqual(last(undefined), undefined);
    });

    it("with null values and no condition", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(last(null as any), undefined);
    });

    it("with empty array and no condition", function () {
      assert.strictEqual(last([]), undefined);
    });

    it("with non-empty array and no condition", function () {
      assert.strictEqual(last(["hello"]), "hello");
    });

    it("with undefined values and value condition", function () {
      assert.strictEqual(last(undefined, 3), undefined);
    });

    it("with null values and value condition", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(last(null as any, 3), undefined);
    });

    it("with empty array and value condition", function () {
      assert.strictEqual(last([] as number[], 3), undefined);
    });

    it("with non-empty array and value condition", function () {
      assert.strictEqual(last([1, 2, 3, 4, 5], 3), 3);
    });

    it("with undefined values and function condition", function () {
      assert.strictEqual(last(undefined, (value: number) => value % 2 === 0), undefined);
    });

    it("with null values and value condition", function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(last(null as any, (value: number) => value % 2 === 0), undefined);
    });

    it("with empty array and value condition", function () {
      assert.strictEqual(last([] as number[], (value: number) => value % 2 === 0), undefined);
    });

    it("with non-empty array and value condition", function () {
      assert.strictEqual(last([1, 2, 3, 4, 5], (value: number) => value % 2 === 0), 4);
    });
  });
});
