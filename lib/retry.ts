/**
 * An error that can be wrapped around another error that indicates that the action should not be
 * retried.
 */
export class DontRetryError extends Error {
  constructor(public readonly innerError: Error) {
    super(`Don't Retry: ${innerError}`);
  }
}

/**
 * A control object that is passed to a retriable action.
 */
export interface RetryControl {
  /**
   * The attempt number.
   */
  readonly attempt: number;
  /**
   * The maximum number of attempts that will be made.
   */
  readonly maxAttempts: number;
  /**
   * Whether or not the retry function should attempt to run the action again when an error is
   * encountered..
   */
  shouldRetry?: boolean;
  /**
   * The errors that have occurred on previous attempts.
   */
  readonly errors: Error[];
}

export type RetryFunction<T> = (control: RetryControl) => (T | Promise<T>);
export type ShouldRetryFunction<T> = (error: Error | undefined, result: T | undefined, control: RetryControl) => (boolean | Promise<boolean>);
export type BetweenAttemptsFunction<T> = (error: Error | undefined, result: T | undefined, control: RetryControl) => (unknown | Promise<unknown>);

/**
 * Options that can be passed to the retry() function.
 */
export interface RetryOptions<T> {
  /**
   * The retriable action.
   */
  action: RetryFunction<T>;
  /**
   * The maximum number of attempts. Defaults to 3.
   */
  maxAttempts?: number;
  /**
   * Whether or not to retry when the provided error was thrown.
   */
  shouldRetry?: ShouldRetryFunction<T>;
  /**
   * A function that should be run between attempts.
   */
  betweenAttempts?: BetweenAttemptsFunction<T>;
}

/**
 * Attempt to run the provided action. If the action throws an error, then it will be retried up to
 * 2 more times. If the action still throws an error on the 3rd attempt (2nd retry), then the error
 * will be thrown to the caller of this function.
 * @param action The action that will be run.
 */
export async function retry<T>(action: RetryFunction<T> | RetryOptions<T>): Promise<T> {
  let maxAttempts = 3;
  let shouldRetry: ShouldRetryFunction<T> = (error: Error | undefined) => !!error;
  let betweenAttempts: BetweenAttemptsFunction<T> = () => { };
  if (action && typeof action !== "function") {
    if (action.maxAttempts != undefined) {
      maxAttempts = action.maxAttempts;
    }
    if (action.shouldRetry) {
      shouldRetry = action.shouldRetry;
    }
    if (action.betweenAttempts) {
      betweenAttempts = action.betweenAttempts;
    }
    action = action.action;
  }

  let result: T;
  let attempt = 0;
  const errors: Error[] = [];
  while (true) {
    ++attempt;
    const control: RetryControl = { attempt, maxAttempts, errors };
    try {
      result = await Promise.resolve(action(control));
      if (control.shouldRetry === false) {
        break;
      } else if (control.shouldRetry === true || await Promise.resolve(shouldRetry(undefined, result, control))) {
        if (attempt >= maxAttempts) {
          throw new Error(`Failing retriable action due to no more remaining attempts.`);
        } else {
          await Promise.resolve(betweenAttempts(undefined, result, control));
        }
      } else {
        break;
      }
    } catch (error) {
      if (error instanceof DontRetryError) {
        throw error.innerError;
      } else if (control.shouldRetry === false || attempt >= maxAttempts) {
        throw error;
      } else if (!await Promise.resolve(shouldRetry(error, undefined, control))) {
        throw error;
      } else {
        await Promise.resolve(betweenAttempts(error, undefined, control));
        errors.push(error);
      }
    }
  }
  return result;
}
