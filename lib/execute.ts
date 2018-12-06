/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { execSync } from "child_process";
import * as fssync from "fs";

export function execute(command: string, packageFolderPath: string): void {
    if (fssync.existsSync(packageFolderPath)) {
        execSync(command, { cwd: packageFolderPath, stdio: "inherit" });
    }
}

export function npmRunBuild(packageFolderPath: string): void {
    execute("npm run build", packageFolderPath);
}

export function npmInstall(packageFolderPath: string): void {
    execute("npm install", packageFolderPath);
}
