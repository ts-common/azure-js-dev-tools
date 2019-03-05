/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { getBooleanArgument } from "./commandLine";
import { getConsoleLogger, getAzureDevOpsLogger, LoggerOptions, Logger } from "@azure/logger-js";

/**
 * Get the default Logger based on the command line arguments.
 * @returns The default Logger based on the command line arguments.
 */
export function getDefaultLogger(options: LoggerOptions = {}): Logger {
    if (options.logVerbose == undefined) {
        options.logVerbose = getBooleanArgument("verbose");
    }
    return getBooleanArgument("azure-devops") ? getAzureDevOpsLogger(options) : getConsoleLogger(options);
}
