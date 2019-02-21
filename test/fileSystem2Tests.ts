import { assert } from "chai";
import { map } from "../lib";
import { assertEx } from "../lib/assertEx";
import { copyEntry, copyFile, copyFolder, createFolder, deleteEntry, deleteFolder, entryExists, fileExists, findFileInPath, folderExists, getChildEntryPaths, readFileContents, symbolicLinkExists, writeFileContents, findFolderInPath } from "../lib/fileSystem2";
import { joinPath, pathRelativeTo, resolvePath } from "../lib/path";

describe("fileSystem2.ts", function () {
  describe("entryExists()", function () {
    it("with path that doesn't exist", async function () {
      assert.strictEqual(await entryExists(joinPath(__dirname, "i/dont/exist")), false);
    });

    it("with a file that exists", async function () {
      assert.strictEqual(await entryExists(__filename), true);
    });

    it("with a folder that exists", async function () {
      assert.strictEqual(await entryExists(__dirname), true);
    });
  });

  describe("symbolicLinkExists()", function () {
    it("with path that doesn't exist", async function () {
      assert.strictEqual(await symbolicLinkExists(joinPath(__dirname, "i/dont/exist")), false);
    });

    it("with a file that exists", async function () {
      assert.strictEqual(await symbolicLinkExists(__filename), false);
    });

    it("with a folder that exists", async function () {
      assert.strictEqual(await symbolicLinkExists(__dirname), false);
    });
  });

  describe("fileExists()", function () {
    it("with path that doesn't exist", async function () {
      assert.strictEqual(await fileExists(joinPath(__dirname, "i/dont/exist")), false);
    });

    it("with a file that exists", async function () {
      assert.strictEqual(await fileExists(__filename), true);
    });

    it("with a folder that exists", async function () {
      assert.strictEqual(await fileExists(__dirname), false);
    });
  });

  describe("folderExists()", function () {
    it("with path that doesn't exist", async function () {
      assert.strictEqual(await folderExists(joinPath(__dirname, "i/dont/exist")), false);
    });

    it("with a file that exists", async function () {
      assert.strictEqual(await folderExists(__filename), false);
    });

    it("with a folder that exists", async function () {
      assert.strictEqual(await folderExists(__dirname), true);
    });
  });

  describe("createFolder()", function () {
    it("with folder that doesn't exist", async function () {
      const folderPath: string = joinPath(process.cwd(), "folderthatwontexistbeforethis");
      assert.strictEqual(await folderExists(folderPath), false);
      assert.strictEqual(await createFolder(folderPath), true);
      try {
        assert.strictEqual(await folderExists(folderPath), true);
      } finally {
        assert.strictEqual(await deleteFolder(folderPath), true, "Should be able to delete folder after checks.");
      }
    });

    it("with folder with parent folder that doesn't exist", async function () {
      const parentFolderPath: string = joinPath(process.cwd(), "a");
      const folderPath: string = joinPath(parentFolderPath, "folderthatwontexistbeforethis");
      assert.strictEqual(await folderExists(parentFolderPath), false, "The parent folder should not exist before createFolder() is called.");
      assert.strictEqual(await folderExists(folderPath), false, "The folder should not exist before createFolder() is called.");
      assert.strictEqual(await createFolder(folderPath), true);
      try {
        assert.strictEqual(await folderExists(parentFolderPath), true);
        assert.strictEqual(await folderExists(folderPath), true);
      } finally {
        assert.strictEqual(await deleteFolder(parentFolderPath), true, "Should be able to delete folder after checks.");
      }
    });

    it("with folder with grandparent folder that doesn't exist", async function () {
      const grandparentFolderPath: string = joinPath(process.cwd(), "a");
      const parentFolderPath: string = joinPath(grandparentFolderPath, "b");
      const folderPath: string = joinPath(parentFolderPath, "c");
      assert.strictEqual(await folderExists(grandparentFolderPath), false);
      assert.strictEqual(await folderExists(parentFolderPath), false);
      assert.strictEqual(await folderExists(folderPath), false);
      assert.strictEqual(await createFolder(folderPath), true);
      try {
        assert.strictEqual(await folderExists(grandparentFolderPath), true);
        assert.strictEqual(await folderExists(parentFolderPath), true);
        assert.strictEqual(await folderExists(folderPath), true);
      } finally {
        assert.strictEqual(await deleteFolder(grandparentFolderPath), true, "Should be able to delete folder after checks.");
      }
    });

    it("with folder that already exists", async function () {
      const folderPath: string = joinPath(process.cwd(), "folderthatwontexistbeforethis");
      assert.strictEqual(await folderExists(folderPath), false);
      await createFolder(folderPath);
      try {
        assert.strictEqual(await folderExists(folderPath), true);
        assert.strictEqual(await createFolder(folderPath), false);
        assert.strictEqual(await folderExists(folderPath), true);
      } finally {
        assert.strictEqual(await deleteFolder(folderPath), true, "Should be able to delete folder after checks.");
      }
    });
  });

  describe("copyEntry()", function () {
    it("from entry that doesn't exist", async function () {
      const sourceFilePath = `./idontexist.txt`;
      const destFilePath = `./ialsodontexist.txt`;
      const error: NodeJS.ErrnoException = await assertEx.throwsAsync(copyEntry(sourceFilePath, destFilePath));
      assert.strictEqual(error.message, `ENOENT: no such file or directory: ./idontexist.txt`);
      assert.strictEqual(error.code, "ENOENT");
    });

    it("from file entry that exists to file that doesn't exist", async function () {
      const sourceFilePath: string = __filename;
      const destFilePath = `./idontexist.txt`;
      await copyEntry(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destFilePath), true);
      }
    });

    it("from file entry that exists to file with parent folder that doesn't exist", async function () {
      const sourceFilePath: string = __filename;
      const destParentFolderPath = `./i/`;
      const destFilePath: string = joinPath(destParentFolderPath, `dontexist.txt`);
      await copyEntry(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destParentFolderPath), true);
      }
    });

    it("from file entry that exists to file with grandparent folder that doesn't exist", async function () {
      const sourceFilePath: string = __filename;
      const destGrandparentFolderPath = `./i/`;
      const destParentFolderPath: string = joinPath(destGrandparentFolderPath, "dont");
      const destFilePath: string = joinPath(destParentFolderPath, `exist.txt`);
      await copyEntry(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await folderExists(destGrandparentFolderPath), true);
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destGrandparentFolderPath), true);
      }
    });

    it("from file entry that exists to file that already exists", async function () {
      const sourceFilePath: string = __filename;
      const destFilePath = `./idontexist.txt`;
      await writeFileContents(destFilePath, "hello");
      try {
        await copyEntry(sourceFilePath, destFilePath);
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destFilePath), true);
      }
    });

    it("from folder entry that exists to folder that doesn't exist", async function () {
      const sourceFolderPath: string = __dirname;
      const destFolderPath: string = resolvePath("idontexist");
      await copyEntry(sourceFolderPath, destFolderPath);
      try {
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destFolderPath), true);
      }
    });

    it("from folder entry that exists to folder with parent folder that doesn't exist", async function () {
      const sourceFolderPath: string = __dirname;
      const destParentFolderPath: string = resolvePath("i");
      const destFolderPath: string = joinPath(destParentFolderPath, `dontexist`);
      await copyEntry(sourceFolderPath, destFolderPath);
      try {
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destParentFolderPath), true);
      }
    });

    it("from folder entry that exists to folder with grandparent folder that doesn't exist", async function () {
      const sourceFolderPath: string = __dirname;
      const destGrandparentFolderPath: string = resolvePath("i");
      const destParentFolderPath: string = joinPath(destGrandparentFolderPath, "dont");
      const destFolderPath: string = joinPath(destParentFolderPath, `exist`);
      await copyEntry(sourceFolderPath, destFolderPath);
      try {
        assert.strictEqual(await folderExists(destGrandparentFolderPath), true);
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destGrandparentFolderPath), true);
      }
    });

    it("from folder entry that exists to folder that already exists", async function () {
      const sourceFolderPath: string = __dirname;
      const destFolderPath: string = resolvePath("idontexist");
      assert.strictEqual(await createFolder(destFolderPath), true);
      try {
        await copyEntry(sourceFolderPath, destFolderPath);
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destFolderPath), true);
      }
    });
  });

  describe("copyFile()", function () {
    it("from file entry that exists to file that doesn't exist", async function () {
      const sourceFilePath: string = __filename;
      const destFilePath = `./idontexist.txt`;
      await copyFile(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destFilePath), true);
      }
    });

    it("from file entry that exists to file with parent folder that doesn't exist", async function () {
      const sourceFilePath: string = __filename;
      const destParentFolderPath = `./i/`;
      const destFilePath: string = joinPath(destParentFolderPath, `dontexist.txt`);
      await copyFile(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destParentFolderPath), true);
      }
    });

    it("from file entry that exists to file with grandparent folder that doesn't exist", async function () {
      const sourceFilePath: string = __filename;
      const destGrandparentFolderPath = `./i/`;
      const destParentFolderPath: string = joinPath(destGrandparentFolderPath, "dont");
      const destFilePath: string = joinPath(destParentFolderPath, `exist.txt`);
      await copyFile(sourceFilePath, destFilePath);
      try {
        assert.strictEqual(await folderExists(destGrandparentFolderPath), true);
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destGrandparentFolderPath), true);
      }
    });

    it("from file entry that exists to file that already exists", async function () {
      const sourceFilePath: string = __filename;
      const destFilePath = `./idontexist.txt`;
      await writeFileContents(destFilePath, "hello");
      try {
        await copyFile(sourceFilePath, destFilePath);
        assert.strictEqual(await fileExists(destFilePath), true);
        assert.strictEqual(await readFileContents(destFilePath), await readFileContents(sourceFilePath));
      } finally {
        assert.strictEqual(await deleteEntry(destFilePath), true);
      }
    });
  });

  describe("copyFolder()", function () {
    it("from folder that doesn't exist", async function () {
      const sourceFilePath = `./idontexist`;
      const destFilePath = `./ialsodontexist`;
      const error: NodeJS.ErrnoException = await assertEx.throwsAsync(copyFolder(sourceFilePath, destFilePath));
      assert.strictEqual(error.message, `ENOENT: no such file or directory: ./idontexist`);
      assert.strictEqual(error.code, "ENOENT");
    });

    it("from folder entry that exists to folder that doesn't exist", async function () {
      const sourceFolderPath: string = __dirname;
      const destFolderPath: string = resolvePath("idontexist");
      await copyFolder(sourceFolderPath, destFolderPath);
      try {
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destFolderPath), true);
      }
    });

    it("from folder entry that exists to folder with parent folder that doesn't exist", async function () {
      const sourceFolderPath: string = __dirname;
      const destParentFolderPath: string = resolvePath("i");
      const destFolderPath: string = joinPath(destParentFolderPath, `dontexist`);
      await copyFolder(sourceFolderPath, destFolderPath);
      try {
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destParentFolderPath), true);
      }
    });

    it("from folder entry that exists to folder with grandparent folder that doesn't exist", async function () {
      const sourceFolderPath: string = __dirname;
      const destGrandparentFolderPath: string = resolvePath("i");
      const destParentFolderPath: string = joinPath(destGrandparentFolderPath, "dont");
      const destFolderPath: string = joinPath(destParentFolderPath, `exist`);
      await copyFolder(sourceFolderPath, destFolderPath);
      try {
        assert.strictEqual(await folderExists(destGrandparentFolderPath), true);
        assert.strictEqual(await folderExists(destParentFolderPath), true);
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destGrandparentFolderPath), true);
      }
    });

    it("from folder entry that exists to folder that already exists", async function () {
      const sourceFolderPath: string = __dirname;
      const destFolderPath: string = resolvePath("idontexist");
      assert.strictEqual(await createFolder(destFolderPath), true);
      try {
        await copyFolder(sourceFolderPath, destFolderPath);
        assert.strictEqual(await folderExists(destFolderPath), true);
        await assertEqualChildEntryPaths(destFolderPath, sourceFolderPath);
      } finally {
        assert.strictEqual(await deleteEntry(destFolderPath), true);
      }
    });
  });

  describe("findFileInPath()", function () {
    it("with file that exists", async function () {
      const filePath: string | undefined = await findFileInPath("package.json");
      assertEx.defined(filePath, "filePath");
      assertEx.contains(filePath, "package.json");
    });

    it("with file that doesn't exist", async function () {
      const filePath: string | undefined = await findFileInPath("packages.jsdon");
      assert.strictEqual(filePath, undefined);
    });
  });

  describe("findFolderInPath()", function () {
    it("with folder that exists", async function () {
      const folderPath: string | undefined = await findFolderInPath("node_modules");
      assertEx.defined(folderPath, "folderPath");
      assertEx.contains(folderPath, "node_modules");
    });

    it("with folder that doesn't exist", async function () {
      const folderPath: string | undefined = await findFolderInPath("my_fake_node_modules");
      assert.strictEqual(folderPath, undefined);
    });
  });
});

async function assertEqualChildEntryPaths(actualFolderPath: string, expectedFolderPath: string): Promise<void> {
  assert.deepEqual(
    map(await getChildEntryPaths(actualFolderPath, { recursive: true }), (path: string) => pathRelativeTo(path, actualFolderPath)),
    map(await getChildEntryPaths(expectedFolderPath, { recursive: true }), (path: string) => pathRelativeTo(path, expectedFolderPath)));
}
