/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { getBooleanArgument } from "./commandLine";
import { LoggerOptions, Logger } from "@azure/logger-js";
import * as LoggerJs from "@azure/logger-js";

/**
 * Get the default Logger based on the command line arguments.
 * @returns The default Logger based on the command line arguments.
 */
export function getDefaultLogger(options: LoggerOptions = {}): Logger {
    if (options.logVerbose == undefined) {
        options.logVerbose = getBooleanArgument("verbose");
    }

    if (options.type == undefined) {
        const isAzureDevopsLogger = getBooleanArgument("azure-devops");
        options.type = isAzureDevopsLogger ? "devops" : "console";
    }

    return LoggerJs.getDefaultLogger(options);
}
