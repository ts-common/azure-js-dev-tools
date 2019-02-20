import { assert } from "chai";
import { deleteFile, fileExists, joinPath, readFileContents } from "../lib";
import { ArchiverCompressor, CompressionResult, FakeCompressor } from "../lib/compressor";

describe("compressor.ts", function () {
  it("FakeCompressor", async function () {
    const compressor = new FakeCompressor();
    const folderPath: string = __dirname;
    const zipFilePath: string = joinPath(__dirname, "../test.zip");
    const result: CompressionResult = await compressor.zip(folderPath, zipFilePath);
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

  it("ArchiverCompressor", async function () {
    const compressor = new ArchiverCompressor();
    const folderPath: string = __dirname;
    const zipFilePath: string = joinPath(__dirname, "../test.zip");
    const result: CompressionResult = await compressor.zip(folderPath, zipFilePath);
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
