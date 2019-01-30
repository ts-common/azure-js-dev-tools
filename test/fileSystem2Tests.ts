import { joinPath } from "../lib/path";
import { assert } from "chai";
import { createFolder, deleteFolder } from "../lib";

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
});
