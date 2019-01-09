import { assertEx } from "../lib/assertEx";
import { assert } from "chai";
import { AssertionError } from "assert";

describe("assertEx.ts", function () {
  describe("equalErrors()", function () {
    it("with different errors", function () {
      assertEx.throws(() => assertEx.equalErrors(new Error("a"), new Error("b")), (error: AssertionError) => {
        assert(error.actual);
        assert.strictEqual(error.actual.message, "a");
        assert(error.expected);
        assert.strictEqual(error.expected.message, "b");
      });
    });

    it("with equal errors", function () {
      assertEx.equalErrors(new Error("a"), new Error("a"));
    });
  });

  describe("throws(Function)", function () {
    it("with no thrown error", function () {
      const error: Error = assertEx.throws(() => assertEx.throws(() => { }));
      assertEx.equalErrors(error, new AssertionError({
        message: "Missing expected exception.",
        operator: "throws"
      }));
    });

    it("with thrown Error", function () {
      const error: Error = assertEx.throws(() => { throw new Error("abc"); });
      assertEx.equalErrors(error, new Error("abc"));
    });
  });

  describe("throws(Function,Error)", function () {
    it("with no thrown error", function () {
      const error: Error = assertEx.throws(() => assertEx.throws(() => { }, new Error("hello")));
      assertEx.equalErrors(error, new AssertionError({
        message: "Missing expected exception.",
        operator: "throws"
      }));
    });

    it("with different error message", function () {
      const error: AssertionError = assertEx.throws(() => assertEx.throws(() => { throw new Error("abc"); }, new Error("hello")));
      assert(error.actual);
      assert.strictEqual(error.actual.message, "abc");
      assert(error.expected);
      assert.strictEqual(error.expected.message, "hello");
    });

    it("with equal error", function () {
      assertEx.throws(() => { throw new Error("abc"); }, new Error("abc"));
    });
  });

  describe("throws(Function,Function)", function () {
    it("with no thrown error", function () {
      const error: Error = assertEx.throws(() => assertEx.throws(() => {}, () => {}));
      assertEx.equalErrors(error, new AssertionError({
        message: "Missing expected exception.",
        operator: "throws"
      }));
    });

    it("with assertion failure in error check function", function () {
      const error: AssertionError = assertEx.throws(() => assertEx.throws(() => { throw new Error("a"); },
        (expectedError: Error) => { assert.strictEqual(expectedError.message, "b"); }));
      assert.strictEqual(error.actual, "a");
      assert.strictEqual(error.expected, "b");
      assert.strictEqual(error.message, "expected 'a' to equal 'b'");
    });
  });

  describe("throwsAsync(Promise)", function () {
    it("with no thrown error", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(Promise.resolve()),
        new AssertionError({
        message: "Missing expected exception.",
        operator: "throws"
      }));
    });

    it("with thrown Error", async function () {
      const rejectedPromise = Promise.reject(new Error("abc"));
      const error: Error = await assertEx.throwsAsync(rejectedPromise);
      assertEx.equalErrors(error, new Error("abc"));
    });
  });

  describe("throwsAsync(Promise,Error)", function () {
    it("with no thrown error", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(Promise.resolve(), new Error("hello")),
        new AssertionError({
          message: "Missing expected exception.",
          operator: "throws"
        }));
    });

    it("with different error message", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(Promise.reject(new Error("abc")), new Error("hello"))),
        new AssertionError({
          actual: new Error("abc"),
          expected: new Error("hello"),
          operator: "deepStrictEqual"
        });
    });

    it("with equal error", async function () {
      await assertEx.throwsAsync(Promise.reject(new Error("abc")), new Error("abc"));
    });
  });

  describe("throwsAsync(Promise,Function)", function () {
    it("with no thrown error", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(Promise.resolve(), () => {}),
        new AssertionError({
          message: "Missing expected exception.",
          operator: "throws"
        }));
    });

    it("with assertion failure in error check function", async function () {
      const error: AssertionError = await assertEx.throwsAsync(assertEx.throwsAsync(Promise.reject(new Error("a")),
        (expectedError: Error) => { assert.strictEqual(expectedError.message, "b"); }));
      assert.strictEqual(error.actual, "a");
      assert.strictEqual(error.expected, "b");
      assert.strictEqual(error.message, "expected 'a' to equal 'b'");
    });
  });

  describe("throwsAsync(Function)", function () {
    it("with no thrown error", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(async () => {}),
        new AssertionError({
        message: "Missing expected exception.",
        operator: "throws"
      }));
    });

    it("with thrown Error", async function () {
      const error: Error = await assertEx.throwsAsync(async () => { throw new Error("abc"); });
      assertEx.equalErrors(error, new Error("abc"));
    });
  });

  describe("throwsAsync(Function,Error)", function () {
    it("with no thrown error", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(async () => {}, new Error("hello")),
        new AssertionError({
          message: "Missing expected exception.",
          operator: "throws"
        }));
    });

    it("with different error message", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(async () => { throw new Error("abc"); }, new Error("hello"))),
        new AssertionError({
          actual: new Error("abc"),
          expected: new Error("hello"),
          operator: "deepStrictEqual"
        });
    });

    it("with equal error", async function () {
      await assertEx.throwsAsync(async () => { throw new Error("abc"); }, new Error("abc"));
    });
  });

  describe("throwsAsync(Function,Function)", function () {
    it("with no thrown error", async function () {
      await assertEx.throwsAsync(assertEx.throwsAsync(async () => {}, () => {}),
        new AssertionError({
          message: "Missing expected exception.",
          operator: "throws"
        }));
    });

    it("with assertion failure in error check function", async function () {
      const error: AssertionError = await assertEx.throwsAsync(assertEx.throwsAsync(async () => { throw new Error("a"); },
        (expectedError: Error) => { assert.strictEqual(expectedError.message, "b"); }));
      assert.strictEqual(error.actual, "a");
      assert.strictEqual(error.expected, "b");
      assert.strictEqual(error.message, "expected 'a' to equal 'b'");
    });
  });
});