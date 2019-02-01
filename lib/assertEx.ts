// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import assert, { AssertionError } from "assert";
import { getNodeVersion } from "./node";
import { Version } from "./version";

const nodeVersion: Version = getNodeVersion();

function getNode8AndBelowErrorObject(error: Error): Error {
  return {
    message: error.message,
    name: error.name
  };
}

/**
 * A collection of additional assertion checks on top of the standard assert checks.
 */
export namespace assertEx {
  /**
   * Check that the provided text contains the provided substring.
   * @param value The text to look in.
   * @param substring The substring to look for.
   */
  export function contains(value: string | string[] | undefined, substring: string): void {
    assert(value && substring && value.indexOf(substring) !== -1, `Expected ${JSON.stringify(value)} to contain ${JSON.stringify(substring)}.`);
  }

  /**
   * Check that the provided text contains the all of the provided substrings.
   * @param value The text to look in.
   * @param substrings The substring to look for.
   */
  export function containsAll(value: string | string[] | undefined, substrings: string[]): void {
    if (substrings) {
      for (const substring of substrings) {
        contains(value, substring);
      }
    }
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
    if (nodeVersion.major <= 8) {
      actualError = getNode8AndBelowErrorObject(actualError);
      expectedError = getNode8AndBelowErrorObject(expectedError);
    }
    assert.deepEqual(actualError, expectedError, message);
  }

  function validateThrownError<TError extends Error>(thrownError: TError | undefined, expectedError: undefined | TError | ((error: TError) => void)): TError {
    if (!thrownError) {
      throw new AssertionError({ message: "Missing expected exception.", operator: "throws" });
    } else if (expectedError instanceof Error) {
      equalErrors(thrownError, expectedError);
    } else if (expectedError) {
      expectedError(thrownError);
    }
    return thrownError!;
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
    return validateThrownError(thrownError, expectedError);
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
    return validateThrownError(thrownError, expectedError);
  }

  /**
   * Assert that the provided value starts with the provided prefix.
   * @param value The value to check.
   * @param prefix The prefix to look for.
   * @param expressionName The name of the expression that provided the value.
   */
  export function startsWith(value: string, prefix: string, expressionName?: string): void {
    defined(value, expressionName);
    defined(prefix, "prefix");
    assert(value.startsWith(prefix), `${expressionName || "value"} (${value}) must start with the provided prefix (${prefix}).`);
  }

  export function defined(value: any, expressionName?: string): void {
    assert(value != undefined, `${expressionName || "value"} must be defined.`);
  }

  export function definedAndNotEmpty(value: string | undefined, expressionName?: string): void {
    expressionName = expressionName || "value";
    defined(value, expressionName);
    assert(value, `${expressionName} cannot be empty.`);
  }

  export function greaterThan(value: number, expectedLowerBound: number, expressionName?: string): void {
    defined(value, expressionName);
    defined(expectedLowerBound, "expectedLowerBound");
    assert(value > expectedLowerBound, `${expressionName || "value"} (${value}) must be greater than ${expectedLowerBound}.`);
  }
}
