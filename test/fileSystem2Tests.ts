import { assert } from "chai";
import { assertEx, copyFile, createFolder, deleteFile, deleteFolder, folderExists, findFileInPath, fileExists } from "../lib";
import { joinPath } from "../lib/path";

describe("fileSystem2.ts", function () {
  describe("createFolder()", function () {
    it("with folder that doesn't exist", async function () {
      const folderPath: string = joinPath(process.cwd(), "folderthatwontexistbeforethis");
      assert.strictEqual(await createFolder(folderPath), true);
      deleteFolder(folderPath);
    });

    it("with deep folder that doesn't exist", async function () {
      const folderPath: string = joinPath(process.cwd(), "a/b/c/d");
      assert.strictEqual(await createFolder(folderPath), true);
      try {
        assert.strictEqual(await folderExists(folderPath), true);
      } finally {
        deleteFolder(joinPath(process.cwd(), "a"));
      }
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

  describe("findFileInPath()", function () {
    it("with file that exists", async function () {
      const filePath: string | undefined = await findFileInPath("package.json");
      assertEx.defined(filePath, "packageJsonFilePath");
      assertEx.contains(filePath, "package.json");
    });

    it("with file that doesn't exist", async function () {
      const filePath: string | undefined = await findFileInPath("packages.jsdon");
      assert.strictEqual(filePath, undefined);
    });
  });

  describe("copyFile()", function () {
    it("with source file that doesn't exist", async function () {
      const sourceFilePath = `./idontexist.txt`;
      const destFilePath = `./ialsodontexist.txt`;
      const error: Error = await assertEx.throwsAsync(copyFile(sourceFilePath, destFilePath));
      assertEx.containsAll(error.message, [
        `ENOENT: no such file or directory, copyfile`,
        `idontexist.txt`,
        ` -> `,
        `ialsodontexist.txt`
      ]);
    });

    it("with destination file that doesn't exist", async function () {
      const sourceFilePath = `./package.json`;
      const destFilePath = `./my.new.package.json`;
      assert.strictEqual(await fileExists(destFilePath), false);
      await copyFile(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await fileExists(destFilePath), true);
      } finally {
        deleteFile(destFilePath);
      }
    });

    it("with destination file in folder that doesn't exist", async function () {
      const sourceFilePath = `./package.json`;
      const destFilePath = `./spam/my.new.package.json`;
      assert.strictEqual(await folderExists("./spam"), false);
      assert.strictEqual(await fileExists(destFilePath), false);
      await copyFile(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await fileExists(destFilePath), true);
      } finally {
        deleteFolder("./spam");
      }
    });
  });
});
