/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import * as archiver from "archiver";
import * as fs from "fs";
import { writeFileContents } from "./fileSystem2";
import { toArray } from "./arrays";

/**
 * The result of doing a compression.
 */
export interface CompressionResult {
  errors: Error[];
  warnings: Error[];
}

/**
 * An object that can compress files and folders.
 */
export interface Compressor {
  /**
   * Zip the provided files.
   * @param filePaths The files to zip.
   * @param outputFilePath The file path where the zipped file will go.
   */
  zipFiles(filePaths: string | string[], outputFilePath: string): Promise<CompressionResult>;
  /**
   * Zip the provided folder.
   * @param folderPath The path to the folder to zip.
   * @param outputFilePath The file path where the zipped file will go.
   */
  zipFolder(folderPath: string, outputFilePath: string): Promise<CompressionResult>;
}

/**
 * A fake Compressor.
 */
export class FakeCompressor implements Compressor {
  public readonly errors: Error[] = [];
  public readonly warnings: Error[] = [];

  public async zipFiles(filePaths: string | string[], outputFilePath: string): Promise<CompressionResult> {
    let zipFileContents = `files:\n`;
    for (const filePath of toArray(filePaths)) {
      zipFileContents += `${filePath}\n`;
    }
    await writeFileContents(outputFilePath, zipFileContents);
    const result: CompressionResult = {
      errors: this.errors,
      warnings: this.warnings,
    };
    return result;
  }

  public async zipFolder(folderPath: string, outputFilePath: string): Promise<CompressionResult> {
    const zipFileContents = `folder: ${folderPath}`;
    await writeFileContents(outputFilePath, zipFileContents);
    const result: CompressionResult = {
      errors: this.errors,
      warnings: this.warnings,
    };
    return result;
  }
}

/**
 * A Compressor that uses the archiver NPM package to do compression.
 */
export class ArchiverCompressor implements Compressor {
  private zip(outputFilePath: string, addContents: (arc: archiver.Archiver) => void): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      try {
        const arc: archiver.Archiver = archiver.create("zip");

        addContents(arc);

        const output = fs.createWriteStream(outputFilePath);
        arc.pipe(output);

        const errors: Error[] = [];
        arc.on("error", (error: archiver.ArchiverError) => errors.push(error));

        const warnings: Error[] = [];
        arc.on("warning", (warning: archiver.ArchiverError) => warnings.push(warning));

        arc.on("finish", () => {
          const result: CompressionResult = {
            errors,
            warnings
          };
          resolve(result);
        });

        arc.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }

  public zipFiles(filePaths: string | string[], outputFilePath: string): Promise<CompressionResult> {
    return this.zip(outputFilePath, (arc: archiver.Archiver) => {
      for (const filePath of toArray(filePaths)) {
        arc.file(filePath, {});
      }
    });
  }

  public zipFolder(folderPath: string, outputFilePath: string): Promise<CompressionResult> {
    return this.zip(outputFilePath, (arc: archiver.Archiver) => {
      arc.directory(folderPath, false);
    });
  }
}
