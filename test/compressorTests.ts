import { assert } from "chai";
import { deleteFile, joinPath, readFileContents, fileExistsSync } from "../lib";
import { ArchiverCompressor, CompressionResult, FakeCompressor } from "../lib/compressor";

describe("compressor.ts", function () {
  it("FakeCompressor", async function () {
    const compressor = new FakeCompressor();
    const folderPath: string = __dirname;
    const zipFilePath: string = joinPath(__dirname, "../test.zip");
    const result: CompressionResult = await compressor.zip(folderPath, zipFilePath);
    assert.deepEqual(result, {
      errors: [],
      warnings: []
    });
    assert.strictEqual(readFileContents(zipFilePath), `folder: ${folderPath}`);
    deleteFile(zipFilePath);
  });

  it("ArchiverCompressor", async function () {
    const compressor = new ArchiverCompressor();
    const folderPath: string = __dirname;
    const zipFilePath: string = joinPath(__dirname, "../test.zip");
    const result: CompressionResult = await compressor.zip(folderPath, zipFilePath);
    assert.deepEqual(result, {
      errors: [],
      warnings: []
    });
    assert.strictEqual(fileExistsSync(zipFilePath), true);
    deleteFile(zipFilePath);
  });
});
