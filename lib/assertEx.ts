// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import assert from "assert";

/**
 * A collection of additional assertion checks on top of the standard assert checks.
 */
export namespace assertEx {
  /**
   * Assert that the provided syncFunction throws an Error. If the expectedError is undefined, then
   * this function will just assert that an Error was thrown. If the expectedError is defined, then
   * this function will assert that the Error that was thrown is equal to the provided expectedError.
   * @param syncFunction The synchronous function that is expected to thrown an Error.
   * @param expectedError The Error that is expected to be thrown.
   */
  export function throws(syncFunction: () => void, expectedError?: ((error: Error) => void) | Error): Error {
    let thrownError: Error | undefined;

    try {
      syncFunction();
    } catch (error) {
      thrownError = error;
    }

    if (!thrownError) {
      assert.throws(() => { });
    } else if (expectedError instanceof Error) {
      assert.deepStrictEqual(thrownError, expectedError);
    } else if (expectedError) {
      expectedError(thrownError);
    }

    return thrownError!;
  }

  /**
   * Assert that the provided asyncFunction throws an Error. If the expectedError is undefined, then
   * this function will just assert that an Error was thrown. If the expectedError is defined, then
   * this function will assert that the Error that was thrown is equal to the provided expectedError.
   * @param asyncFunction The asynchronous function that is expected to thrown an Error.
   * @param expectedError The Error that is expected to be thrown.
   */
  export async function throwsAsync<T>(asyncFunction: (() => Promise<T>) | Promise<T>, expectedError?: ((error: Error) => void) | Error): Promise<Error> {
    let thrownError: Error | undefined;

    try {
      await (typeof asyncFunction === "function" ? asyncFunction() : asyncFunction);
    } catch (error) {
      thrownError = error;
    }

    if (!thrownError) {
      assert.throws(() => { });
    } else if (expectedError instanceof Error) {
      assert.deepStrictEqual(thrownError, expectedError);
    } else if (expectedError) {
      expectedError(thrownError);
    }

    return thrownError!;
  }
}