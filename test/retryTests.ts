import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { DontRetryError, retry, RetryControl } from "../lib/retry";

describe("retry.ts", function () {
  describe("retry()", function () {
    it("with undefined action", async function () {
      const error: TypeError = await assertEx.throwsAsync(() => retry(undefined as any));
      assert.strictEqual(error.message, "action is not a function");
    });

    it("with null action", async function () {
      // tslint:disable-next-line: no-null-keyword
      const error: TypeError = await assertEx.throwsAsync(() => retry(null as any));
      assert.strictEqual(error.message, "action is not a function");
    });

    it("with non-function action", async function () {
      // tslint:disable-next-line: no-null-keyword
      const error: TypeError = await assertEx.throwsAsync(retry("spam" as any));
      assert.strictEqual(error.message, "action is not a function");
    });

    it("with function that doesn't throw and returns void", async function () {
      const result: void = await retry(() => {});
      assert.strictEqual(result, undefined);
    });

    it("with function that doesn't throw and returns a number", async function () {
      const result: number = await retry((control: RetryControl) => {
        assert.strictEqual(control.attempt, 1);
        return 5;
      });
      assert.strictEqual(result, 5);
    });

    it("with function that throws on the first call and then returns a number", async function () {
      const result: number = await retry((control: RetryControl) => {
        if (control.attempt <= 1) {
          throw new Error();
        }
        return 6;
      });
      assert.strictEqual(result, 6);
    });

    it("with function that throws on the first call and indicates that no retry should happen", async function () {
      const error: Error = await assertEx.throwsAsync(retry((control: RetryControl) => {
        if (control.attempt <= 1) {
          control.shouldRetry = false;
          throw new Error(`Error on attempt ${control.attempt}`);
        }
        return 6;
      }));
      assert.strictEqual(error.message, `Error on attempt 1`);
    });

    it("with function that throws a DontRetryError on the first call", async function () {
      const result: number = await retry((control: RetryControl) => {
        if (control.attempt <= 1) {
          throw new DontRetryError(new Error());
        }
        return 6;
      });
      assert.strictEqual(result, 6);
    });

    it("with function that throws on the first two calls and then returns a number", async function () {
      const result: number = await retry((control: RetryControl) => {
        if (control.attempt <= 2) {
          throw new Error();
        }
        return 7;
      });
      assert.strictEqual(result, 7);
    });

    it("with function that throws on the first three calls and then returns a number", async function () {
      const error: Error = await assertEx.throwsAsync(retry((control: RetryControl) => {
        if (control.attempt <= 3) {
          throw new Error(`Error on attempt ${control.attempt}`);
        }
        return 7;
      }));
      assert.strictEqual(error.message, `Error on attempt 3`);
    });

    it("with function that throws an error that should not be retried based on shouldRetry", async function () {
      const error: Error = await assertEx.throwsAsync(retry({
        action: (control: RetryControl) => {
          if (control.attempt <= 3) {
            throw new Error(`Error on attempt ${control.attempt}`);
          }
          return 7;
        },
        shouldRetry: (error: Error) => !error.message.includes("attempt 2")
      }));
      assert.strictEqual(error.message, `Error on attempt 2`);
    });

    it("with counter between failed attempts", async function () {
      let counter = 0;
      const error: Error = await assertEx.throwsAsync(retry({
        action: (control: RetryControl) => { throw new Error(`Error on attempt ${control.attempt}`); },
        betweenAttempts: () => ++counter,
      }));
      assert.strictEqual(error.message, `Error on attempt 3`);
      assert.strictEqual(counter, 2);
    });

    it("with async function that returns void", async function () {
      const result: void = await retry(async () => {});
      assert.strictEqual(result, undefined);
    });

    it("with async function that returns a number", async function () {
      const result: number = await retry(async () => 5);
      assert.strictEqual(result, 5);
    });

    it("with async function that throws on the first call and then returns a number", async function () {
      const result: number = await retry(async (control: RetryControl) => {
        if (control.attempt <= 1) {
          throw new Error();
        }
        return 6;
      });
      assert.strictEqual(result, 6);
    });

    it("with async function that throws on the first two calls and then returns a number", async function () {
      const result: number = await retry(async (control: RetryControl) => {
        if (control.attempt <= 2) {
          throw new Error();
        }
        return 7;
      });
      assert.strictEqual(result, 7);
    });

    it("with async function that throws on the first three calls and then returns a number", async function () {
      const error: Error = await assertEx.throwsAsync(retry(async (control: RetryControl) => {
        if (control.attempt <= 3) {
          throw new Error(`Error on attempt ${control.attempt}`);
        }
        return 7;
      }));
      assert.strictEqual(error.message, `Error on attempt 3`);
    });
  });
});
