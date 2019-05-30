import { assert } from "chai";
import { deleteFile, fileExists, joinPath, readFileContents } from "../lib";
import { ArchiverCompressor, CompressionResult, FakeCompressor } from "../lib/compressor";

describe("compressor.ts", function () {
  describe("FakeCompressor", function () {
    it("zipFiles()", async function () {
      const compressor = new FakeCompressor();
      const filePath: string = __filename;
      const zipFilePath: string = joinPath(__dirname, "../test.zip");
      const result: CompressionResult = await compressor.zipFiles(filePath, zipFilePath);
      try {
        assert.deepEqual(result, {
          errors: [],
          warnings: []
        });
        assert.strictEqual(await readFileContents(zipFilePath), `files:\n${filePath}\n`);
      } finally {
        deleteFile(zipFilePath);
      }
    });

    it("zipFolder()", async function () {
      const compressor = new FakeCompressor();
      const folderPath: string = __dirname;
      const zipFilePath: string = joinPath(__dirname, "../test.zip");
      const result: CompressionResult = await compressor.zipFolder(folderPath, zipFilePath);
      try {
        assert.deepEqual(result, {
          errors: [],
          warnings: []
        });
        assert.strictEqual(await readFileContents(zipFilePath), `folder: ${folderPath}`);
      } finally {
        deleteFile(zipFilePath);
      }
    });
  });

  describe("ArchiverCompressor", function () {
    it("zipFiles()", async function () {
      const compressor = new ArchiverCompressor();
      const filePath: string = __filename;
      const zipFilePath: string = joinPath(__dirname, "../test.zip");
      const result: CompressionResult = await compressor.zipFiles(filePath, zipFilePath);
      try {
        assert.deepEqual(result, {
          errors: [],
          warnings: []
        });
        assert.strictEqual(await fileExists(zipFilePath), true);
      } finally {
        deleteFile(zipFilePath);
      }
    });

    it("zipFolder()", async function () {
      const compressor = new ArchiverCompressor();
      const folderPath: string = __dirname;
      const zipFilePath: string = joinPath(__dirname, "../test.zip");
      const result: CompressionResult = await compressor.zipFolder(folderPath, zipFilePath);
      try {
        assert.deepEqual(result, {
          errors: [],
          warnings: []
        });
        assert.strictEqual(await fileExists(zipFilePath), true);
      } finally {
        deleteFile(zipFilePath);
      }
    });
  });
});
