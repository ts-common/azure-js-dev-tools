/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import * as yargs from "yargs";

export interface GetArgumentOptions {
  checkEnvironmentVariables?: boolean;
  environmentVariableName?: string;
  defaultValue?: string;
}

export function getArgument(argumentName: string, options: GetArgumentOptions = {}): string | undefined {
  let result: string | undefined;

  let rawArgument: unknown = yargs.argv[argumentName];
  if (rawArgument == undefined) {
    if (options.checkEnvironmentVariables) {
      const environmentVariableName: string = options.environmentVariableName || argumentName;
      rawArgument = process.env[environmentVariableName];
    }
    if (rawArgument == undefined) {
      rawArgument = options.defaultValue;
    }
  }

  if (typeof rawArgument === "boolean") {
    result = rawArgument ? "true" : "false";
  } else if (typeof rawArgument === "string") {
    result = rawArgument;
  } else if (Array.isArray(rawArgument) && rawArgument.length > 0) {
    result = rawArgument[rawArgument.length - 1];
  }

  return result;
}

export interface GetBooleanArgumentOptions {
  checkEnvironmentVariables?: boolean;
  environmentVariableName?: string;
  defaultValue?: boolean;
}

export function getBooleanArgument(argumentName: string, options: GetBooleanArgumentOptions = {}): boolean | undefined {
  const rawArgument: string | undefined = getArgument(argumentName, {
    checkEnvironmentVariables: options.checkEnvironmentVariables,
    environmentVariableName: options.environmentVariableName
  });

  let result: boolean | undefined;
  if (rawArgument === "true") {
    result = true;
  } else if (rawArgument === "false") {
    result = false;
  } else {
    result = options.defaultValue;
  }

  return result;
}
