import { assert } from "chai";
import { getRootPath, isRooted, joinPath, normalizePath, resolvePath, getName, getPathName, pathRelativeTo, pathWithoutFileExtension } from "../lib/path";

describe("path.ts", function () {
  describe("pathRelativeTo(string,string)", function () {
    it(`with "/my/path" and "/"`, function () {
      assert.strictEqual(pathRelativeTo("/my/path", "/"), "my/path");
    });

    it(`with "/" and "/my/path"`, function () {
      assert.strictEqual(pathRelativeTo("/", "/my/path"), "../..");
    });

    it(`with "/a/b" and "/my/path"`, function () {
      assert.strictEqual(pathRelativeTo("/a/b", "/my/path"), "../../a/b");
    });
  });

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

  describe("normalizePath(string)", function () {
    it(`with ""`, function () {
      assert.strictEqual(normalizePath(""), "");
    });

    it(`with "abc"`, function () {
      assert.strictEqual(normalizePath("abc"), "abc");
    });

    it(`with "/"`, function () {
      assert.strictEqual(normalizePath("/"), "/");
    });

    it(`with "\\"`, function () {
      assert.strictEqual(normalizePath("\\"), "/");
    });

    it(`with "C:/"`, function () {
      assert.strictEqual(normalizePath("C:/"), "C:/");
    });

    it(`with "C:\\"`, function () {
      assert.strictEqual(normalizePath("C:\\"), "C:/");
    });

    it(`with "C:\\a\\b.txt"`, function () {
      assert.strictEqual(normalizePath("C:\\a\\b.txt"), "C:/a/b.txt");
    });

    it(`with "/folder/file"`, function () {
      assert.strictEqual(normalizePath("/folder/file"), "/folder/file");
    });

    it(`with "" and "win32" osPlatform`, function () {
      assert.strictEqual(normalizePath("", "win32"), "");
    });

    it(`with "abc" and "win32" osPlatform`, function () {
      assert.strictEqual(normalizePath("abc", "win32"), "abc");
    });

    it(`with "C:\\a\\b.txt" and "win32" osPlatform`, function () {
      assert.strictEqual(normalizePath("C:\\a\\b.txt", "win32"), "C:\\a\\b.txt");
    });

    it(`with "/folder/file" and "win32" osPlatform`, function () {
      assert.strictEqual(normalizePath("/folder/file", "win32"), "\\folder\\file");
    });
  });

  describe("pathWithoutFileExtension(string)", function () {
    it(`with ""`, function () {
      assert.strictEqual(pathWithoutFileExtension(""), "");
    });

    it(`with "spam"`, function () {
      assert.strictEqual(pathWithoutFileExtension("spam"), "spam");
    });

    it(`with "/my/file.txt"`, function () {
      assert.strictEqual(pathWithoutFileExtension("/my/file.txt"), "/my/file");
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

    it(`with "/"`, function () {
      assert.strictEqual(getRootPath("/"), "/");
    });

    it(`with "\\"`, function () {
      assert.strictEqual(getRootPath("\\"), "\\");
    });

    it(`with "/apples/kiwi"`, function () {
      assert.strictEqual(getRootPath("/apples/kiwi"), "/");
    });

    it(`with "\\apples\\kiwi"`, function () {
      assert.strictEqual(getRootPath("\\apples\\kiwi"), "\\");
    });

    it(`with "Z:/"`, function () {
      assert.strictEqual(getRootPath("Z:/"), "Z:/");
    });

    it(`with "Z:\\"`, function () {
      assert.strictEqual(getRootPath("Z:\\"), "Z:\\");
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
      assert.strictEqual(isRooted(""), false);
    });

    it(`with "abc"`, function () {
      assert.strictEqual(isRooted("abc"), false);
    });

    it(`with "/"`, function () {
      assert.strictEqual(isRooted("/"), true);
    });

    it(`with "\\"`, function () {
      assert.strictEqual(isRooted("\\"), true);
    });

    it(`with "C:/"`, function () {
      assert.strictEqual(isRooted("C:/"), true);
    });

    it(`with "Z:\\"`, function () {
      assert.strictEqual(isRooted("Z:\\"), true);
    });

    it(`with "Z:\\a/b\\c"`, function () {
      assert.strictEqual(isRooted("Z:\\a/b\\c"), true);
    });

    it(`with "/folder/a"`, function () {
      assert.strictEqual(isRooted("/folder/a"), true);
    });

    it(`with "\\folder\\a"`, function () {
      assert.strictEqual(isRooted("\\folder\\a"), true);
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
