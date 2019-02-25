import { assert } from "chai";
import { getParentFolderPath, findPackageJsonFileSync, findPackage, ClonedPackage, joinPath } from "../lib";

describe("dependencies.ts", function () {
  describe("findPackage()", function () {
    it(`with "@ts-common/azure-js-dev-tools" and this file path`, async function () {
      this.timeout(5000);

      const expectedPackageFolderPath: ClonedPackage = { path: getParentFolderPath(findPackageJsonFileSync(__dirname)!) };
      const actualPackageFolderPath: ClonedPackage = (await findPackage("@ts-common/azure-js-dev-tools", __filename))!;
      assert.deepEqual(actualPackageFolderPath, expectedPackageFolderPath);
    });

    it(`with "@ts-common/azure-js-dev-tools" and this folder path`, async function () {
      const expectedPackageFolderPath: ClonedPackage = { path: getParentFolderPath(findPackageJsonFileSync(__dirname)!) };
      const actualPackageFolderPath: ClonedPackage = (await findPackage("@ts-common/azure-js-dev-tools", __dirname))!;
      assert.deepEqual(actualPackageFolderPath, expectedPackageFolderPath);
    });

    it(`with "@ts-common/azure-js-dev-tools" and non-existing folder path`, async function () {
      assert.strictEqual(await findPackage("@ts-common/azure-js-dev-tools", joinPath(__dirname, "fake", "folder")), undefined);
    });
  });
});
