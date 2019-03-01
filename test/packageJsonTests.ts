import { assert } from "chai";
import { isPackageJsonPublished, PackageJson } from "../lib";

describe("packageJson.ts", function () {
  describe("isPackageJsonPublished(PackageJson)", function () {
    this.timeout(10000);

    it("with no package name", async function () {
      const packageJson: PackageJson = {
        version: "1.2.3"
      };
      assert.strictEqual(await isPackageJsonPublished(packageJson), false);
    });

    it("with no package version", async function () {
      const packageJson: PackageJson = {
        name: "@azure/ms-rest-js"
      };
      assert.strictEqual(await isPackageJsonPublished(packageJson), false);
    });

    it("with package name and version", async function () {
      const packageJson: PackageJson = {
        name: "@azure/ms-rest-js",
        version: "1.1.1"
      };
      assert.strictEqual(await isPackageJsonPublished(packageJson), true);
    });

    it("with package name and version that doesn't exist", async function () {
      const packageJson: PackageJson = {
        name: "@azure/ms-rest-js",
        version: "0.9.7"
      };
      assert.strictEqual(await isPackageJsonPublished(packageJson), false);
    });
  });
});
