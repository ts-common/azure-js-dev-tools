/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import * as fssync from "fs";
import { promises as fs } from "fs";
import * as path from "path";

export async function getChildDirectories(parent: string): Promise<string[]> {
    console.log(`Reading child directories from ${parent}`);

    if (!(await pathExists(parent))) {
        throw new Error(`"${parent}" directory does not exist`);
    }

    const allChildren = await fs.readdir(parent);
    const childDirectories = [];

    for (const child of allChildren) {
        if (await isDirectory(path.resolve(parent, child))) {
            childDirectories.push(child);
        }
    }

    return childDirectories;
}

export function getChildDirectoriesSync(parent: string): string[] {
    console.log(`Reading child directories from ${parent}`);

    if (!fssync.existsSync(parent)) {
        throw new Error(`"${parent}" directory does not exist`);
    }

    const allChildren = fssync.readdirSync(parent);
    const childDirectories = [];

    for (const child of allChildren) {
        if (isDirectorySync(path.resolve(parent, child))) {
            childDirectories.push(child);
        }
    }

    return childDirectories;
}

export function findAzureRestApiSpecsRepositoryPathSync(): string | undefined {
    const repositoryName = "azure-rest-api-specs";
    let currentDirectory = __dirname;
    const pathData = path.parse(currentDirectory);
    const rootDirectory = pathData.root;

    do {
        currentDirectory = path.resolve(currentDirectory, "..");

        if (containsDirectorySync(repositoryName, currentDirectory)) {
            return path.resolve(currentDirectory, repositoryName);
        }

    } while (currentDirectory !== rootDirectory);

    return undefined;
}

function containsDirectorySync(directoryName: string, parentPath: string): boolean {
    return fssync.existsSync(path.resolve(parentPath, directoryName));
}

export async function isDirectory(directoryPath: string): Promise<boolean> {
    try {
        const stats = await fs.lstat(directoryPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

export function isDirectorySync(directoryPath: string): boolean {
    try {
        const stats = fssync.lstatSync(directoryPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

export async function pathExists(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        fssync.exists(path, exists => {
            resolve(exists);
        });
    });
}
