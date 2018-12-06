/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import * as dependencies from "./dependencies";
import * as repository from "./repository";

dependencies.updateLocalDependencies(repository.packageFolders, "local", dependencies.getLocalDependencyVersion);
