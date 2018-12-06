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
