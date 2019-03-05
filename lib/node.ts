/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Version } from "./version";

/**
 * Get the Node.js version that this script is running in.
 */
export function getNodeVersion(): Version {
  return new Version(process.version.substr(1));
}
