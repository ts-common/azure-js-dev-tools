/**
 * Get the first value in the provided array of values that matches the provided condition.
 * @param values The array of values to search through.
 * @param condition The condition to use when looking through the array of values.
 */
export function first<T>(values: T[] | undefined, condition: T | ((value: T) => boolean)): T | undefined {
  let result: T | undefined;
  if (values) {
    if (condition instanceof Function) {
      for (const value of values) {
        if (condition(value)) {
          result = value;
          break;
        }
      }
    } else {
      result = first(values, (value: T) => value === condition);
    }
  }
  return result;
}

/**
 * Get whether or not the provided array of values contains a value that matches the provided
 * condition.
 * @param values The array of values to search through.
 * @param condition The condition to look for within the array of values.
 * @returns Whether or not the provided array of values contains a value that matches the provided
 * condition.
 */
export function contains<T>(values: T[] | undefined, condition: T | ((value: T) => boolean)): boolean {
  let result = false;
  if (values) {
    if (condition instanceof Function) {
      for (const value of values) {
        if (condition(value)) {
          result = true;
          break;
        }
      }
    } else {
      result = contains(values, (value: T) => value === condition);
    }
  }
  return result;
}

/**
 * Get all of the values within the provided array of values that match the provided condition.
 * @param values The array of values to filter.
 * @param condition The condition to look for within the array of values.
 * @returns The array of values from the original values that match the provided condition.
 */
export function where<T>(values: T[], condition: (value: T) => boolean): T[] {
  const result: T[] = [];
  for (const value of values) {
    if (condition(value)) {
      result.push(value);
    }
  }
  return result;
}

/**
 * Map the values in the provided array to a new array of values.
 * @param values The values to map to a new array of values.
 * @param conversion The function that will be used to convert the original values into the new
 * ones.
 * @returns The array with converted values.
 */
export function map<T, U>(values: T[] | undefined, conversion: (value: T) => U): U[] {
  const result: U[] = [];
  if (values) {
    for (const value of values) {
      result.push(conversion(value));
    }
  }
  return result;
}

/**
 * Ensure that a value that is either a single value or an array is an array by wrapping single
 * values in an array.
 * @param value The value to ensure is an array.
 * @param conversion The function that will be used to convert the non-array value to an array. This
 * defaults to just creating a new array with the single value.
 * @returns The array value.
 */
export function toArray<T>(value: T | T[], conversion: (valueToConvert: T) => T[] = (valueToConvert: T) => [valueToConvert]): T[] {
  return value instanceof Array ? value : conversion(value);
}