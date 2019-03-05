/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import * as archiver from "archiver";
import * as fs from "fs";
import { writeFileContents } from "./fileSystem2";

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
   * Zip the provided folder.
   * @param folderPath The path to the folder to zip.
   * @param outputFilePath The file path where the zipped file will go.
   */
  zip(folderPath: string, outputFilePath: string): Promise<CompressionResult>;
}

/**
 * A fake Compressor.
 */
export class FakeCompressor implements Compressor {
  public readonly errors: Error[] = [];
  public readonly warnings: Error[] = [];

  zip(folderPath: string, outputFilePath: string): Promise<CompressionResult> {
    let zipFileContents = "";
    zipFileContents += `folder: ${folderPath}`;
    return writeFileContents(outputFilePath, zipFileContents)
      .then(() => {
        return {
          errors: this.errors,
          warnings: this.warnings
        };
      });
  }
}

/**
 * A Compressor that uses the archiver NPM package to do compression.
 */
export class ArchiverCompressor implements Compressor {
  zip(folderPath: string, outputFilePath: string): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      try {
        const arc: archiver.Archiver = archiver.create("zip");

        arc.directory(folderPath, false);

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
}
