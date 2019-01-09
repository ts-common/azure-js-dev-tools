// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import assert from "assert";
import { Version } from "./version";

/**
 * A collection of additional assertion checks on top of the standard assert checks.
 */
export namespace assertEx {
  /**
   * Check that the provided text contains the provided substring.
   * @param text The text to look in.
   * @param substring The substring to look for.
   */
  export function contains(text: string, substring: string): void {
    assert(text && substring && text.indexOf(substring) !== -1, `Expected "${text}" to contain "${substring}".`);
  }

  /**
   * Check that the two errors are equal (except for their stack property).
   * @param actualError The actual error.
   * @param expectedError The expected error.
   * @param message The optional message to output if this check fails.
   */
  export function equalErrors(actualError: Error, expectedError: Error, message?: string): void {
    actualError.stack = undefined;
    expectedError.stack = undefined;
    let processVersion: string = process.version;
    if (processVersion.startsWith("v")) {
      processVersion = processVersion.substr(1);
    }
    const nodeVersion = new Version(processVersion);
    if (nodeVersion.major >= 10) {
      assert.deepStrictEqual(actualError, expectedError, message);
    } else {
      assert.strictEqual(actualError.message, expectedError.message);
      assert.strictEqual(actualError.name, expectedError.name);
    }
  }

  /**
   * Assert that the provided syncFunction throws an Error. If the expectedError is undefined, then
   * this function will just assert that an Error was thrown. If the expectedError is defined, then
   * this function will assert that the Error that was thrown is equal to the provided expectedError.
   * @param syncFunction The synchronous function that is expected to thrown an Error.
   * @param expectedError The Error that is expected to be thrown.
   */
  export function throws<TError extends Error>(syncFunction: () => void, expectedError?: ((error: TError) => void) | TError): TError {
    let thrownError: TError | undefined;

    try {
      syncFunction();
    } catch (error) {
      thrownError = error;
    }

    if (!thrownError) {
      assert.throws(() => { });
    } else if (expectedError instanceof Error) {
      equalErrors(thrownError, expectedError);
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
  export async function throwsAsync<T, TError extends Error>(asyncFunction: (() => Promise<T>) | Promise<T>, expectedError?: ((error: TError) => void) | TError): Promise<TError> {
    let thrownError: TError | undefined;

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