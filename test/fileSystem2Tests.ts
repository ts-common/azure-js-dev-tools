import { assert } from "chai";
import { map, findPackageJsonFileSync } from "../lib";
import { assertEx } from "../lib/assertEx";
import { copyEntry, copyFile, copyFolder, createFolder, deleteEntry, deleteFolder, entryExists, fileExists, findFileInPath, folderExists, getChildEntryPaths, readFileContents, symbolicLinkExists, writeFileContents, findFolderInPath } from "../lib/fileSystem2";
import { joinPath, pathRelativeTo, resolvePath, getParentFolderPath, normalizePath, getPathName } from "../lib/path";

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
    this.timeout(10000);

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

    it("with file name and start folder path that treats an existing file as a folder", async function () {
      const filePath: string | undefined = await findFileInPath("package.json", joinPath(__filename, "blah.txt"));
      assertEx.defined(filePath, "filePath");
      assertEx.contains(filePath, "package.json");
    });

    it("with file name pattern that exists", async function () {
      const filePath: string | undefined = await findFileInPath(/package\.json/);
      assertEx.defined(filePath, "filePath");
      assertEx.contains(filePath, "package.json");
    });

    it("with file name pattern that matches a folder", async function () {
      const filePath: string | undefined = await findFileInPath(/test/);
      assert.strictEqual(filePath, undefined);
    });

    it("with file name pattern that matches more than just the file name", async function () {
      const filePath: string | undefined = await findFileInPath(/.*\/test\/fileSystem2Tests\..*/, __dirname);
      assertEx.defined(filePath, "filePath");
      assertEx.contains(filePath, "/dist/test/fileSystem2Tests.d.ts");
    });

    it("with file name pattern that doesn't exist", async function () {
      const filePath: string | undefined = await findFileInPath(/abcdef\.txt/);
      assert.strictEqual(filePath, undefined);
    });

    it("with file name pattern that matches an existing folder", async function () {
      const filePath: string | undefined = await findFileInPath(/test/, __dirname);
      assert.strictEqual(filePath, undefined);
    });

    it("with file name pattern and start folder path that treats an existing file as a folder", async function () {
      const filePath: string | undefined = await findFileInPath(/package\.json/, joinPath(__filename, "blah.txt"));
      assertEx.defined(filePath, "filePath");
      assertEx.contains(filePath, "package.json");
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

  describe("getChildEntryPaths()", function () {
    this.timeout(10000);

    describe("with no options", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/"), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exists", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath);
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, ".git"),
          joinPath(packageFolderPath, ".scripts"),
          joinPath(packageFolderPath, "dist"),
          joinPath(packageFolderPath, "lib"),
          joinPath(packageFolderPath, "node_modules"),
          joinPath(packageFolderPath, "test"),
          joinPath(packageFolderPath, ".gitignore"),
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "LICENSE"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "README.md"),
        ]);
        assertEx.doesNotContainAny(childEntryPaths, [
          joinPath(packageFolderPath, ".git", "hooks"),
          joinPath(packageFolderPath, ".scripts", "checkEverything.ts"),
        ]);
      });
    });

    describe("with empty options", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", {}), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, {}), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exists", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, {});
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, ".git"),
          joinPath(packageFolderPath, ".scripts"),
          joinPath(packageFolderPath, "dist"),
          joinPath(packageFolderPath, "lib"),
          joinPath(packageFolderPath, "node_modules"),
          joinPath(packageFolderPath, "test"),
          joinPath(packageFolderPath, ".gitignore"),
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "LICENSE"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "README.md"),
        ]);
        assertEx.doesNotContainAny(childEntryPaths, [
          joinPath(packageFolderPath, ".git", "hooks"),
          joinPath(packageFolderPath, ".scripts", "checkEverything.ts"),
        ]);
      });
    });

    describe("with true recursive", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { recursive: true }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { recursive: true }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { recursive: true });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "LICENSE"),
          joinPath(packageFolderPath, "tsconfig.json"),
          joinPath(packageFolderPath, "dist"),
          joinPath(packageFolderPath, "lib"),
          joinPath(packageFolderPath, "test"),
          joinPath(packageFolderPath, "node_modules"),
          normalizePath(__dirname),
          normalizePath(__filename),
        ]);
      });
    });

    describe("with fileExists condition", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { condition: fileExists }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { condition: fileExists }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { condition: fileExists });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, ".gitignore"),
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "LICENSE"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "README.md"),
        ]);
        assertEx.doesNotContainAny(childEntryPaths, [
          joinPath(packageFolderPath, ".git"),
          joinPath(packageFolderPath, "node_modules"),
          joinPath(packageFolderPath, ".git", "hooks"),
          joinPath(packageFolderPath, ".scripts", "checkEverything.ts"),
        ]);
      });
    });

    describe("with fileExists condition and true recursive", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { condition: fileExists, recursive: true }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { condition: fileExists, recursive: true }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { condition: fileExists, recursive: true });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "LICENSE"),
          joinPath(packageFolderPath, "tsconfig.json"),
          normalizePath(__filename),
          joinPath(packageFolderPath, "node_modules", "@azure", "logger-js", "package.json"),
          joinPath(packageFolderPath, "node_modules", "nyc", "package.json"),
        ]);
      });
    });

    describe("with fileExists condition and function recursive", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(
          await getChildEntryPaths("idont/exist/", {
            condition: fileExists,
            recursive: (folderPath: string) => getPathName(folderPath) !== "node_modules"
          }),
          undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(
            await getChildEntryPaths(tempFolderPath, {
              condition: fileExists,
              recursive: (folderPath: string) => getPathName(folderPath) !== "node_modules"
            }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, {
          condition: fileExists,
          recursive: (folderPath: string) => getPathName(folderPath) !== "node_modules"
        });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "LICENSE"),
          joinPath(packageFolderPath, "tsconfig.json"),
          normalizePath(__filename),
        ]);
        assertEx.doesNotContainAny(childEntryPaths, [
          joinPath(packageFolderPath, "node_modules", ".bin", "_mocha"),
          joinPath(packageFolderPath, "node_modules", ".bin", "autorest"),
        ]);
      });
    });

    describe("with contains 'a' condition", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { condition: (entryPath: string) => entryPath.includes("a") }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { condition: (entryPath: string) => entryPath.includes("a") }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { condition: (entryPath: string) => entryPath.includes("a") });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
        ]);
      });
    });

    describe("with contains 'a' condition and true recursive", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { condition: (entryPath: string) => entryPath.includes("a"), recursive: true }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { condition: (entryPath: string) => entryPath.includes("a"), recursive: true }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { condition: (entryPath: string) => entryPath.includes("a"), recursive: true });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "lib", "arrays.ts"),
          joinPath(packageFolderPath, "dist", "lib", "arrays.js"),
        ]);
      });
    });

    describe("with contains 'a' fileCondition", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { fileCondition: (entryPath: string) => entryPath.includes("a") }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { fileCondition: (entryPath: string) => entryPath.includes("a") }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { fileCondition: (entryPath: string) => entryPath.includes("a") });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
        ]);
      });
    });

    describe("with contains 'a' fileCondition and true recursive", function () {
      it("with folderPath that doesn't exist", async function () {
        assert.strictEqual(await getChildEntryPaths("idont/exist/", { fileCondition: (entryPath: string) => entryPath.includes("a"), recursive: true }), undefined);
      });

      it("with folderPath to existing but empty folder", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const tempFolderPath: string = joinPath(packageFolderPath, "tempTestFolder");
        await createFolder(tempFolderPath);
        try {
          assert.deepEqual(await getChildEntryPaths(tempFolderPath, { fileCondition: (entryPath: string) => entryPath.includes("a"), recursive: true }), []);
        } finally {
          await deleteFolder(tempFolderPath);
        }
      });

      it("with folderPath that exist", async function () {
        const packageJsonFilePath: string = findPackageJsonFileSync(__dirname)!;
        const packageFolderPath: string = getParentFolderPath(packageJsonFilePath);
        const childEntryPaths: string[] | undefined = await getChildEntryPaths(packageFolderPath, { fileCondition: (entryPath: string) => entryPath.includes("a"), recursive: true });
        assertEx.defined(childEntryPaths, "childEntryPaths");
        assertEx.containsAll(childEntryPaths, [
          joinPath(packageFolderPath, "azure-pipelines.yml"),
          joinPath(packageFolderPath, "mocha.config.json"),
          joinPath(packageFolderPath, "package.json"),
          joinPath(packageFolderPath, "lib", "arrays.ts"),
          joinPath(packageFolderPath, "dist", "lib", "arrays.js"),
          joinPath(packageFolderPath, "node_modules", "@azure"),
        ]);
      });
    });
  });

  describe("deleteFolder()", function () {
    it("with folder that doesn't exist", async function () {
      assert.strictEqual(await deleteFolder("i/dont/exist"), false);
    });
  });
});

async function assertEqualChildEntryPaths(actualFolderPath: string, expectedFolderPath: string): Promise<void> {
  assert.deepEqual(
    map(await getChildEntryPaths(actualFolderPath, { recursive: true }), (path: string) => pathRelativeTo(path, actualFolderPath)),
    map(await getChildEntryPaths(expectedFolderPath, { recursive: true }), (path: string) => pathRelativeTo(path, expectedFolderPath)));
}
