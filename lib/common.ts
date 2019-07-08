/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

export function arrayContains<T>(array: T[], el: T): boolean {
  return array.indexOf(el) !== -1;
}

export function startsWith(value: string, prefix: string): boolean {
  return !!(value && prefix && value.indexOf(prefix) === 0);
}

export function endsWith(value: string, suffix: string): boolean {
  return !!(value && suffix && value.length >= suffix.length && value.lastIndexOf(suffix) === value.length - suffix.length);
}

export function contains(values: string[], searchString: string): boolean {
  return arrayContains(values, searchString);
}

/**
 * Pad the left side of the provided value to the targetLength using the provided padding.
 * @param value The value to pad.
 * @param targetLength The length to pad to.
 * @param padding The string to use to pad the value. Defaults to " ".
 * @returns The padded value.
 */
export function padLeft(value: string | number, targetLength: number, padding?: string): string {
  if (!padding) {
    padding = " ";
  }
  if (typeof value === "number") {
    value = value.toString();
  }
  if (!value) {
    value = "";
  }
  while (value.length < targetLength) {
    value = padding + value;
  }
  return value;
}

/**
 * A map/dictionary that maps strings to a generic type of value.
 */
export type StringMap<TValue> = { [key: string]: TValue };

/**
 * Get the lines of the provided text.
 * @param text The text to get the lines of.
 */
export function getLines(text: string | undefined): string[] {
  return text == undefined ? [] : text.split(/\r?\n/);
}

/**
 * Capture and return the text from the provided readableStream.
 * @param readableStream The stream to read from.
 */
export function readEntireString(readableStream?: NodeJS.ReadableStream): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    if (!readableStream) {
      resolve(undefined);
    } else {
      let result = "";
      readableStream.on("data", (data: string) => result += data.toString());
      readableStream.on("error", (error: Error) => reject(error));

      let closed = false;
      const onClose = () => {
        if (!closed) {
          closed = true;
          resolve(result);
        }
      };
      readableStream.on("close", onClose);
      readableStream.on("end", onClose);
    }
  });
}

export function main(mainFunction: Promise<any> | (() => (any | Promise<any>))): Promise<any> {
  return Promise.resolve(typeof mainFunction === "function" ? mainFunction() : mainFunction);
}

/**
 * Replace all of the instances of searchValue in value with the provided replaceValue.
 * @param {string | undefined} value The value to search and replace in.
 * @param {string} searchValue The value to search for in the value argument.
 * @param {string} replaceValue The value to replace searchValue with in the value argument.
 * @returns {string | undefined} The value where each instance of searchValue was replaced with replacedValue.
 */
export function replaceAll(value: string | undefined, searchValue: string, replaceValue: string): string | undefined {
  return !value || !searchValue ? value : value.split(searchValue).join(replaceValue || "");
}
