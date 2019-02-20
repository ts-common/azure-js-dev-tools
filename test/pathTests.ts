import { assert } from "chai";
import { getRootPath, isRooted, joinPath, normalize, resolvePath, getName, getPathName } from "../lib/path";

describe("path.ts", function () {
  describe("joinPath(...string[])", function () {
    it("with no arguments", function () {
      assert.strictEqual(joinPath(), ".");
    });

    it(`with ""`, function () {
      assert.strictEqual(joinPath(""), ".");
    });

    it(`with "", ""`, function () {
      assert.strictEqual(joinPath("", ""), ".");
    });

    it(`with "a", "b"`, function () {
      assert.strictEqual(joinPath("a", "b"), "a/b");
    });

    it(`with "a", "b/c", "d\\e\\f"`, function () {
      assert.strictEqual(joinPath("a", "b/c", "d\\e\\f"), "a/b/c/d/e/f");
    });

    it(`with "C:/", "apples", "oranges"`, function () {
      assert.strictEqual(joinPath("C:/", "apples", "oranges"), "C:/apples/oranges");
    });
  });

  describe("resolvePath(...string[])", function () {
    it("with no arguments", function () {
      const resolvedPath: string = resolvePath();
      assert(isRooted(resolvedPath));
    });

    it(`with ""`, function () {
      const resolvedPath: string = resolvePath("");
      assert(isRooted(resolvedPath));
    });

    it(`with "", ""`, function () {
      const resolvedPath: string = resolvePath("", "");
      assert(isRooted(resolvedPath));
    });

    it(`with "a", "b"`, function () {
      const resolvedPath: string = resolvePath("a", "b");
      assert(isRooted(resolvedPath));
      assert(resolvedPath.endsWith("/a/b"));
    });

    it(`with "a", "b/c", "d\\e\\f"`, function () {
      const resolvedPath: string = resolvePath("a", "b/c", "d\\e\\f");
      assert(isRooted(resolvedPath));
      assert(resolvedPath.endsWith("/a/b/c/d/e/f"));
    });

    it(`with "C:/", "apples", "oranges"`, function () {
      const resolvedPath: string = resolvePath("C:/", "apples", "oranges");
      assert(isRooted(resolvedPath));
      assert(resolvedPath.endsWith("/C:/apples/oranges"));
    });
  });

  describe("normalize(string)", function () {
    it(`with ""`, function () {
      assert.strictEqual(normalize(""), "");
    });

    it(`with "abc"`, function () {
      assert.strictEqual(normalize("abc"), "abc");
    });

    it(`with "C:\\a\\b.txt"`, function () {
      assert.strictEqual(normalize("C:\\a\\b.txt"), "C:/a/b.txt");
    });

    it(`with "/folder/file"`, function () {
      assert.strictEqual(normalize("/folder/file"), "/folder/file");
    });

    it(`with "" and "win32" osPlatform`, function () {
      assert.strictEqual(normalize("", "win32"), "");
    });

    it(`with "abc" and "win32" osPlatform`, function () {
      assert.strictEqual(normalize("abc", "win32"), "abc");
    });

    it(`with "C:\\a\\b.txt" and "win32" osPlatform`, function () {
      assert.strictEqual(normalize("C:\\a\\b.txt", "win32"), "C:\\a\\b.txt");
    });

    it(`with "/folder/file" and "win32" osPlatform`, function () {
      assert.strictEqual(normalize("/folder/file", "win32"), "\\folder\\file");
    });
  });

  describe("getRootPath(string)", function () {
    it(`with undefined`, function () {
      assert.strictEqual(getRootPath(undefined as any), undefined);
    });

    it(`with null`, function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getRootPath(null as any), undefined);
    });

    it(`with ""`, function () {
      assert.strictEqual(getRootPath(""), undefined);
    });

    it(`with "apples"`, function () {
      assert.strictEqual(getRootPath("apples"), undefined);
    });

    it(`with "apples/kiwi"`, function () {
      assert.strictEqual(getRootPath("apples/kiwi"), undefined);
    });

    it(`with "/apples/kiwi"`, function () {
      assert.strictEqual(getRootPath("/apples/kiwi"), "/");
    });

    it(`with "\\apples\\kiwi"`, function () {
      assert.strictEqual(getRootPath("\\apples\\kiwi"), "\\");
    });

    it(`with "Z:/bananas"`, function () {
      assert.strictEqual(getRootPath("Z:/bananas"), "Z:/");
    });

    it(`with "X:/bananas\\oranges"`, function () {
      assert.strictEqual(getRootPath("X:/bananas\\oranges"), "X:/");
    });

    it(`with "X:\\bananas\\oranges"`, function () {
      assert.strictEqual(getRootPath("X:\\bananas\\oranges"), "X:\\");
    });
  });

  describe("isRooted(string)", function () {
    it(`with ""`, function () {
      assert(!isRooted(""));
    });

    it(`with "abc"`, function () {
      assert(!isRooted("abc"));
    });

    it(`with "/"`, function () {
      assert(isRooted("/"));
    });

    it(`with "\\"`, function () {
      assert(isRooted("\\"));
    });

    it(`with "C:/"`, function () {
      assert(isRooted("C:/"));
    });

    it(`with "Z:\\"`, function () {
      assert(isRooted("Z:\\"));
    });

    it(`with "Z:\\a/b\\c"`, function () {
      assert(isRooted("Z:\\a/b\\c"));
    });

    it(`with "/folder/a"`, function () {
      assert(isRooted("/folder/a"));
    });
  });

  describe("getName()", function () {
    it(`with "some/path.txt"`, function () {
      assert.strictEqual(getName("some/path.txt"), "path.txt");
    });

    it(`with "path.txt"`, function () {
      assert.strictEqual(getName("path.txt"), "path.txt");
    });

    it(`with "./path.txt"`, function () {
      assert.strictEqual(getName("./path.txt"), "path.txt");
    });

    it(`with "/path.txt"`, function () {
      assert.strictEqual(getName("/path.txt"), "path.txt");
    });

    it(`with "C:/path.txt"`, function () {
      assert.strictEqual(getName("C:/path.txt"), "path.txt");
    });

    it(`with "C:\\path.txt"`, function () {
      assert.strictEqual(getName("C:\\path.txt"), "path.txt");
    });
  });

  describe("getPathName()", function () {
    it(`with "some/path.txt"`, function () {
      assert.strictEqual(getPathName("some/path.txt"), "path.txt");
    });

    it(`with "path.txt"`, function () {
      assert.strictEqual(getPathName("path.txt"), "path.txt");
    });

    it(`with "./path.txt"`, function () {
      assert.strictEqual(getPathName("./path.txt"), "path.txt");
    });

    it(`with "/path.txt"`, function () {
      assert.strictEqual(getPathName("/path.txt"), "path.txt");
    });

    it(`with "C:/path.txt"`, function () {
      assert.strictEqual(getPathName("C:/path.txt"), "path.txt");
    });

    it(`with "C:\\path.txt"`, function () {
      assert.strictEqual(getPathName("C:\\path.txt"), "path.txt");
    });
  });
});
