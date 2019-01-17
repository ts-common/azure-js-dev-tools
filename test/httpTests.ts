import { assert } from "chai";
import { assertEx } from "../lib";
import { getHeaderKey, HttpHeaders, NodeHttpClient, HttpResponse, HttpRequest, HttpClient, getDefaultHttpClient } from "../lib/http";

describe("http.ts", function () {
  this.timeout(5000);
  
  describe("getHeaderKey()", function () {
    it("with undefined", function () {
      assertEx.throws(() => getHeaderKey(undefined as any));
    });

    it("with null", function () {
      // tslint:disable-next-line:no-null-keyword
      assertEx.throws(() => getHeaderKey(null as any));
    });

    it(`with ""`, function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getHeaderKey(""), "");
    });

    it(`with "abc"`, function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getHeaderKey("abc"), "abc");
    });

    it(`with "ABC"`, function () {
      // tslint:disable-next-line:no-null-keyword
      assert.strictEqual(getHeaderKey("ABC"), "abc");
    });
  });

  describe("HttpHeaders", function () {
    describe("constructor()", function () {
      it("with no arguments", function () {
        const httpHeaders = new HttpHeaders();
        assert.deepEqual(httpHeaders.rawHeaders(), {});
      });

      it("with undefined rawHeaders", function () {
        const httpHeaders = new HttpHeaders(undefined);
        assert.deepEqual(httpHeaders.rawHeaders(), {});
      });

      it("with null rawHeaders", function () {
        // tslint:disable-next-line:no-null-keyword
        const httpHeaders = new HttpHeaders(null as any);
        assert.deepEqual(httpHeaders.rawHeaders(), {});
      });

      it("with empty rawHeaders", function () {
        const httpHeaders = new HttpHeaders({});
        assert.deepEqual(httpHeaders.rawHeaders(), {});
      });

      it("with non-empty rawHeaders", function () {
        const httpHeaders = new HttpHeaders({
          "A": "apples",
          "b": "bananas",
          "Cats": "DOGS"
        });
        assert.deepEqual(httpHeaders.rawHeaders(), {
          "a": "apples",
          "b": "bananas",
          "cats": "DOGS"
        });
      });
    });

    describe("get()", function () {
      it("with undefined", function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assertEx.throws(() => httpHeaders.get(undefined as any));
      });

      it("with null", function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        // tslint:disable-next-line:no-null-keyword
        assertEx.throws(() => httpHeaders.get(null as any));
      });

      it(`with ""`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.get(""), undefined);
      });

      it(`with non-existing header`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.get("x"), undefined);
      });

      it(`with existing header`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.get("a"), "b");
      });

      it(`with existing header with different case`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.get("C"), "d");
      });
    });

    describe("contains()", function () {
      it("with undefined", function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assertEx.throws(() => httpHeaders.contains(undefined as any));
      });

      it("with null", function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        // tslint:disable-next-line:no-null-keyword
        assertEx.throws(() => httpHeaders.contains(null as any));
      });

      it(`with ""`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.contains(""), false);
      });

      it(`with non-existing header`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.contains("x"), false);
      });

      it(`with existing header`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.contains("a"), true);
      });

      it(`with existing header with different case`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.contains("C"), true);
      });
    });

    describe("remove()", function () {
      it("with undefined", function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assertEx.throws(() => httpHeaders.remove(undefined as any));
        assert.deepEqual(httpHeaders.rawHeaders(), { "a": "b", "c": "d" });
      });

      it("with null", function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        // tslint:disable-next-line:no-null-keyword
        assertEx.throws(() => httpHeaders.remove(null as any));
        assert.deepEqual(httpHeaders.rawHeaders(), { "a": "b", "c": "d" });
      });

      it(`with ""`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.remove(""), false);
        assert.deepEqual(httpHeaders.rawHeaders(), { "a": "b", "c": "d" });
      });

      it(`with non-existing header`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.remove("x"), false);
        assert.deepEqual(httpHeaders.rawHeaders(), { "a": "b", "c": "d" });
      });

      it(`with existing header`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.remove("a"), true);
        assert.deepEqual(httpHeaders.rawHeaders(), { "c": "d" });
      });

      it(`with existing header with different case`, function () {
        const httpHeaders = new HttpHeaders({ "a": "b", "c": "d" });
        assert.strictEqual(httpHeaders.remove("C"), true);
        assert.deepEqual(httpHeaders.rawHeaders(), { "a": "b" });
      });
    });

    describe("headersArray()", function () {
      it("with no headers", function () {
        assert.deepEqual(new HttpHeaders({}).headersArray(), []);
      });

      it("with one header", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b" }).headersArray(), [{ name: "A", value: "b" }]);
      });

      it("with multiple headers", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b", "c": "D" }).headersArray(), [{ name: "A", value: "b" }, { name: "c", value: "D" }]);
      });
    });

    describe("headerNames()", function () {
      it("with no headers", function () {
        assert.deepEqual(new HttpHeaders({}).headerNames(), []);
      });

      it("with one header", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b" }).headerNames(), ["A"]);
      });

      it("with multiple headers", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b", "c": "D" }).headerNames(), ["A", "c"]);
      });
    });

    describe("headerValues()", function () {
      it("with no headers", function () {
        assert.deepEqual(new HttpHeaders({}).headerValues(), []);
      });

      it("with one header", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b" }).headerValues(), ["b"]);
      });

      it("with multiple headers", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b", "c": "D" }).headerValues(), ["b", "D"]);
      });
    });

    describe("toJson()", function () {
      it("with no headers", function () {
        assert.deepEqual(new HttpHeaders({}).toJson(), {});
      });

      it("with one header", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b" }).toJson(), { "a": "b" });
      });

      it("with multiple headers", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b", "c": "D" }).toJson(), { "a": "b", "c": "D" });
      });
    });

    describe("toString()", function () {
      it("with no headers", function () {
        assert.deepEqual(new HttpHeaders({}).toString(), `{}`);
      });

      it("with one header", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b" }).toString(), `{"a":"b"}`);
      });

      it("with multiple headers", function () {
        assert.deepEqual(new HttpHeaders({ "A": "b", "c": "D" }).toString(), `{"a":"b","c":"D"}`);
      });
    });

    describe("clone()", function () {
      it("with no headers", function () {
        const headers = new HttpHeaders({});
        const clonedHeaders: HttpHeaders = headers.clone();
        assert.notStrictEqual(clonedHeaders, headers);
        assert.deepEqual(clonedHeaders, headers);
      });

      it("with one header", function () {
        const headers = new HttpHeaders({ "A": "b" });
        const clonedHeaders: HttpHeaders = headers.clone();
        assert.notStrictEqual(clonedHeaders, headers);
        assert.strictEqual(clonedHeaders.get("a"), headers.get("a"));
      });

      it("with multiple headers", function () {
        const headers = new HttpHeaders({ "A": "b", "c": "D" });
        const clonedHeaders: HttpHeaders = headers.clone();
        assert.notStrictEqual(clonedHeaders, headers);
        assert.strictEqual(clonedHeaders.get("a"), headers.get("a"));
        assert.strictEqual(clonedHeaders.get("c"), headers.get("c"));
      });
    });
  });

  it("getDefaultHttpClient()", function () {
    const httpClient: HttpClient = getDefaultHttpClient();
    assert(httpClient instanceof NodeHttpClient);
  });

  describe("NodeHttpClient", function () {
    it("with http host that doesn't exist", async function () {
      const httpClient = new NodeHttpClient();
      const error: Error = await assertEx.throwsAsync(httpClient.sendRequest({ method: "GET", url: "http://idont.exist.com/" }));
      assert.strictEqual(error.message, "getaddrinfo ENOTFOUND idont.exist.com idont.exist.com:80");
    });

    it("with http path that doesn't exist", async function () {
      const httpClient = new NodeHttpClient();
      const request: HttpRequest = { method: "GET", url: "http://www.bing.com/this/isnt/a/valid/path" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.request, request);
    });

    it("with http url that exists", async function () {
      const httpClient = new NodeHttpClient();
      const request: HttpRequest = { method: "GET", url: "http://example.org/" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.request, request);
    });

    it("with http url that redirects with handleRedirects set to false", async function () {
      const httpClient = new NodeHttpClient({ handleRedirects: false });
      const request: HttpRequest = { method: "GET", url: "http://github.com/Azure/azure-rest-api-specs/pull/5040.diff" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 301);
      assert.strictEqual(response.body, "");
      assert.strictEqual(response.headers.get("location"), "https://github.com/Azure/azure-rest-api-specs/pull/5040.diff");
    });

    it("with http url that redirects with handleRedirects set to true", async function () {
      const httpClient = new NodeHttpClient({ handleRedirects: true });
      const request: HttpRequest = { method: "GET", url: "http://github.com/Azure/azure-rest-api-specs/pull/5040.diff" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 200);
      assertEx.contains(response.body, `diff --git a/specification/network/resource-manager/readme.go.md b/specification/network/resource-manager/readme.go.md`);
      assert.strictEqual(response.headers.get("location"), undefined);
    });

    it("with http url that redirects with handleRedirects undefined", async function () {
      const httpClient = new NodeHttpClient({ handleRedirects: undefined });
      const request: HttpRequest = { method: "GET", url: "http://github.com/Azure/azure-rest-api-specs/pull/5040.diff" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 200);
      assertEx.contains(response.body, `diff --git a/specification/network/resource-manager/readme.go.md b/specification/network/resource-manager/readme.go.md`);
      assert.strictEqual(response.headers.get("location"), undefined);
    });

    it("with https host that doesn't exist", async function () {
      const httpClient = new NodeHttpClient();
      const error: Error = await assertEx.throwsAsync(httpClient.sendRequest({ method: "GET", url: "https://idont.exist.com/" }));
      assert.strictEqual(error.message, "getaddrinfo ENOTFOUND idont.exist.com idont.exist.com:443");
    });

    it("with https path that doesn't exist", async function () {
      const httpClient = new NodeHttpClient();
      const request: HttpRequest = { method: "GET", url: "https://www.bing.com/this/isnt/a/valid/path" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.request, request);
    });

    it("with https url that exists", async function () {
      const httpClient = new NodeHttpClient();
      const request: HttpRequest = { method: "GET", url: "https://example.org/" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.request, request);
    });

    it("with https url that redirects with handleRedirects set to false", async function () {
      const httpClient = new NodeHttpClient({ handleRedirects: false });
      const request: HttpRequest = { method: "GET", url: "https://github.com/Azure/azure-rest-api-specs/pull/5040.diff" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 302);
      assert.strictEqual(response.headers.get("location"), "https://patch-diff.githubusercontent.com/raw/Azure/azure-rest-api-specs/pull/5040.diff");
      assert.strictEqual(response.body, `<html><body>You are being <a href="https://patch-diff.githubusercontent.com/raw/Azure/azure-rest-api-specs/pull/5040.diff">redirected</a>.</body></html>`);
    });

    it("with https url that redirects with handleRedirects set to true", async function () {
      const httpClient = new NodeHttpClient({ handleRedirects: true });
      const request: HttpRequest = { method: "GET", url: "https://github.com/Azure/azure-rest-api-specs/pull/5040.diff" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers.get("location"), undefined);
      assertEx.contains(response.body, `diff --git a/specification/network/resource-manager/readme.go.md b/specification/network/resource-manager/readme.go.md`);
    });

    it("with https url that redirects with handleRedirects undefined", async function () {
      const httpClient = new NodeHttpClient({ handleRedirects: undefined });
      const request: HttpRequest = { method: "GET", url: "https://github.com/Azure/azure-rest-api-specs/pull/5040.diff" };
      const response: HttpResponse = await httpClient.sendRequest(request);
      assert(response);
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers.get("location"), undefined);
      assertEx.contains(response.body, `diff --git a/specification/network/resource-manager/readme.go.md b/specification/network/resource-manager/readme.go.md`);
    });
  });
});
