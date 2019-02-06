import { joinPath } from "../lib/path";
import { assert } from "chai";
import { createFolder, deleteFolder, findFileInPathSync, assertEx } from "../lib";

describe("fileSystem2.ts", function () {
  describe("createFolder()", function () {
    it("with folder that doesn't exist", async function () {
      const folderPath: string = joinPath(process.cwd(), "folderthatwontexistbeforethis");
      assert.strictEqual(await createFolder(folderPath), true);
      deleteFolder(folderPath);
    });

    it("with folder that already exists", async function () {
      const folderPath: string = joinPath(process.cwd(), "folderthatwontexistbeforethis");
      await createFolder(folderPath);

      try {
        assert.strictEqual(await createFolder(folderPath), false);
      } finally {
        deleteFolder(folderPath);
      }
    });
  });

  describe("findFileInPathSync()", function () {
    it("with file that exists", function () {
      const filePath: string | undefined = findFileInPathSync("package.json");
      assertEx.defined(filePath, "packageJsonFilePath");
      assertEx.contains(filePath, "package.json");
    });

    it("with file that doesn't exist", function () {
      const filePath: string | undefined = findFileInPathSync("packages.jsdon");
      assert.strictEqual(filePath, undefined);
    });
  });
});
