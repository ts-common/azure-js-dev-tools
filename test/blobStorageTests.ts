import { Credential, SharedKeyCredential } from "@azure/storage-blob";
import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { AzureBlobStorage, BlobPath, BlobStorage, BlobStorageAppendBlob, BlobStorageBlob, BlobStorageBlockBlob, BlobStorageContainer, BlobStoragePrefix, CreateBlobResult, ETagResult, getFileLengthInBytes, InMemoryBlobStorage } from "../lib/blobStorage";
import { Duration } from "../lib/duration";
import { findFileInPath } from "../lib/fileSystem2";
import { joinPath } from "../lib/path";
import { URLBuilder } from "../lib/url";

const blobStorageUrl = "https://sdkautomationdev.blob.core.windows.net/";

const containerNameBase = "abc";
let containerNameCount = 0;
function getContainerName(): string {
  return `${containerNameBase}${++containerNameCount}`;
}

const prefixNameBase = "def";
let prefixNameCount = 0;
function getPrefixName(): string {
  return `${prefixNameBase}${++prefixNameCount}`;
}

function getPrefixPath(): string {
  return `${getContainerName()}/${getPrefixName()}`;
}

const blobNameBase = "xyz";
let blobNameCount = 0;
function getBlobName(): string {
  return `${blobNameBase}${++blobNameCount}`;
}

function getBlobPath(): BlobPath {
  return new BlobPath(getContainerName(), getBlobName());
}

const timeout = 20000;

describe("blobStorage.ts", function () {
  this.timeout(timeout);

  describe("getFileLengthInBytes()", function () {
    it("with file that doesn't exist", async function () {
      await assertEx.throwsAsync(getFileLengthInBytes("idontexist.jpg"));
    });

    it("with file that exists", async function () {
      const fileLength: number = await getFileLengthInBytes((await findFileInPath("LICENSE"))!);
      assert(fileLength === 1056 || fileLength === 1077, `Expected fileLength (${fileLength}) to be either 1056 or 1077.`);
    });
  });

  describe("BlobPath", function () {
    it("constructor()", function () {
      const blobPath = new BlobPath("a", "b");
      assert.strictEqual(blobPath.containerName, "a");
      assert.strictEqual(blobPath.blobName, "b");
      assert.strictEqual(blobPath.toString(), "a/b");
    });

    describe("parse()", function () {
      it(`with BlobPath`, function () {
        const blobPath: BlobPath = new BlobPath("abc", "def");
        assert.strictEqual(BlobPath.parse(blobPath), blobPath);
      });

      it(`with ""`, function () {
        const blobPath: BlobPath = BlobPath.parse("");
        assert.strictEqual(blobPath.containerName, "");
        assert.strictEqual(blobPath.blobName, "");
      });

      it(`with "abc"`, function () {
        const blobPath: BlobPath = BlobPath.parse("abc");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "");
      });

      it(`with "abc/"`, function () {
        const blobPath: BlobPath = BlobPath.parse("abc/");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "");
      });

      it(`with "abc/def"`, function () {
        const blobPath: BlobPath = BlobPath.parse("abc/def");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "def");
      });

      it(`with "abc/def/"`, function () {
        const blobPath: BlobPath = BlobPath.parse("abc/def/");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "def/");
      });

      it(`with "abc/def/g"`, function () {
        const blobPath: BlobPath = BlobPath.parse("abc/def/g");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "def/g");
      });

      it(`with "/"`, function () {
        const blobPath: BlobPath = BlobPath.parse("/");
        assert.strictEqual(blobPath.containerName, "");
        assert.strictEqual(blobPath.blobName, "");
      });

      it(`with "/abc"`, function () {
        const blobPath: BlobPath = BlobPath.parse("/abc");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "");
      });

      it(`with "/abc/"`, function () {
        const blobPath: BlobPath = BlobPath.parse("/abc/");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "");
      });

      it(`with "/abc/def"`, function () {
        const blobPath: BlobPath = BlobPath.parse("/abc/def");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "def");
      });

      it(`with "/abc/def/"`, function () {
        const blobPath: BlobPath = BlobPath.parse("/abc/def/");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "def/");
      });

      it(`with "/abc/def/g"`, function () {
        const blobPath: BlobPath = BlobPath.parse("/abc/def/g");
        assert.strictEqual(blobPath.containerName, "abc");
        assert.strictEqual(blobPath.blobName, "def/g");
      });
    });

    describe("concatenate()", function () {
      it(`with "a" and ""`, function () {
        const path1: BlobPath = BlobPath.parse("a");
        const path2: BlobPath = path1.concatenate("");
        assert.strictEqual(path2, path1);
      });

      it(`with "a/b" and ""`, function () {
        const path1: BlobPath = BlobPath.parse("a/b");
        const path2: BlobPath = path1.concatenate("");
        assert.strictEqual(path2, path1);
      });

      it(`with "a" and "b"`, function () {
        const path1: BlobPath = BlobPath.parse("a");
        const path2: BlobPath = path1.concatenate("b");
        assert.deepEqual(path2, new BlobPath("a", "b"));
      });

      it(`with "a" and "b/"`, function () {
        const path1: BlobPath = BlobPath.parse("a");
        const path2: BlobPath = path1.concatenate("b/");
        assert.deepEqual(path2, new BlobPath("a", "b/"));
      });

      it(`with "a" and "b/c"`, function () {
        const path1: BlobPath = BlobPath.parse("a");
        const path2: BlobPath = path1.concatenate("b/c");
        assert.deepEqual(path2, new BlobPath("a", "b/c"));
      });
    });
  });

  function blobStorageTests(createBlobStorage: (credential?: Credential) => BlobStorage): void {
    describe("BlobStoragePrefix", function () {
      function getPrefix(prefixPath?: string | BlobPath, blobStorage?: BlobStorage): BlobStoragePrefix {
        return (blobStorage || createBlobStorage()).getPrefix(prefixPath || getPrefixPath());
      }

      describe("getURL()", function () {
        it("with regular path and no options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(getPrefixPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL(), expectedURL);
        });

        it("with regular path and {} options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(getPrefixPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({}), expectedURL);
        });

        it("with regular path and { sasToken: false } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(getPrefixPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({ sasToken: false }), expectedURL);
        });

        it("with regular path and { sasToken: true } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(getPrefixPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({ sasToken: true }), expectedURL);
        });

        it("with deep path and no options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL(), expectedURL);
        });

        it("with deep path and {} options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({}), expectedURL);
        });

        it("with deep path and { sasToken: false } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({ sasToken: false }), expectedURL);
        });

        it("with deep path and { sasToken: true } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({ sasToken: true }), expectedURL);
        });

        it("with @ path and no options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL(), expectedURL);
        });

        it("with @ path and {} options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({}), expectedURL);
        });

        it("with @ path and { sasToken: false } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({ sasToken: false }), expectedURL);
        });

        it("with @ path and { sasToken: true } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = getPrefix(`${getPrefixPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(`${prefix.path.containerName}/${prefix.path.blobName}`)
            .toString();
          assert.strictEqual(prefix.getURL({ sasToken: true }), expectedURL);
        });
      });

      it("getContainer()", function () {
        const prefix: BlobStoragePrefix = getPrefix();
        const container: BlobStorageContainer = prefix.getContainer();
        assert.strictEqual(container.name, prefix.path.containerName);
        assert.strictEqual(container.storage, prefix.storage);
      });
    });

    describe("BlobStorageContainer", function () {
      this.timeout(timeout);

      function getContainer(containerName?: string, blobStorage?: BlobStorage, credential?: Credential): BlobStorageContainer {
        return (blobStorage || createBlobStorage(credential)).getContainer(containerName || getContainerName());
      }

      it("getContainer()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
        assert.strictEqual(container.getContainer(), container);
      });

      describe("getURL()", function () {
        it("with no options argument", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const expectedContainerUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL())
            .setPath(container.name);
          assert.strictEqual(container.getURL(), expectedContainerUrl.toString());
        });

        it("with undefined options argument", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const expectedContainerUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL())
            .setPath(container.name);
          assert.strictEqual(container.getURL(undefined), expectedContainerUrl.toString());
        });

        it("with sasToken: false", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const expectedContainerUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL({ sasToken: false }))
            .setPath(container.name);
          assert.strictEqual(container.getURL({ sasToken: false }), expectedContainerUrl.toString());
        });

        it("with sasToken: true", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const expectedContainerUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(container.name);
          assert.strictEqual(container.getURL({ sasToken: true }), expectedContainerUrl.toString());
        });

        it("with endTime and AnonymousCredential", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const error: Error = assertEx.throws(() => container.getURL({ sasToken: { endTime: new Date() } }));
          assert.strictEqual(error.message, "Cannot create a new SAS token if the BlobStorage credentials are not a SharedKeyCredential.");
        });

        it("with endTime and SharedKeyCredential", function () {
          const blobStorage: BlobStorage = createBlobStorage(new SharedKeyCredential("fake-account-name", "fake-account-key"));
          const blobStorageUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL());
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const containerSasUrl: string = container.getURL({
            sasToken: {
              endTime: new Date()
            }
          });
          const containerUrl: URLBuilder = URLBuilder.parse(containerSasUrl);
          assert.strictEqual(containerUrl.getScheme(), blobStorageUrl.getScheme());
          assert.strictEqual(containerUrl.getHost(), blobStorageUrl.getHost());
          assert.strictEqual(containerUrl.getPort(), undefined);
          assert.strictEqual(containerUrl.getPath(), `/${container.name}`);
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("se") as string, "se");
          assert.strictEqual(containerUrl.getQueryParameterValue("sr") as string, "c");
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("sv") as string, "sv");
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("sig") as string, "sig");
          assert.strictEqual(containerUrl.getQueryParameterValue("st"), undefined);
          assert.strictEqual(containerUrl.getQueryParameterValue("sp"), "r");
        });

        it("with startTime, endTime, and SharedKeyCredential", function () {
          const blobStorage: BlobStorage = createBlobStorage(new SharedKeyCredential("fake-account-name", "fake-account-key"));
          const blobStorageUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL());
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          const containerSasUrl: string = container.getURL({
            sasToken: {
              startTime: Duration.minutes(-1).fromNow(),
              endTime: Duration.minutes(10).fromNow(),
            }
          });
          const containerUrl: URLBuilder = URLBuilder.parse(containerSasUrl);
          assert.strictEqual(containerUrl.getScheme(), blobStorageUrl.getScheme());
          assert.strictEqual(containerUrl.getHost(), blobStorageUrl.getHost());
          assert.strictEqual(containerUrl.getPort(), undefined);
          assert.strictEqual(containerUrl.getPath(), `/${container.name}`);
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("se") as string, "se");
          assert.strictEqual(containerUrl.getQueryParameterValue("sr") as string, "c");
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("sv") as string, "sv");
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("sig") as string, "sig");
          assertEx.definedAndNotEmpty(containerUrl.getQueryParameterValue("st") as string, "st");
          assert.strictEqual(containerUrl.getQueryParameterValue("sp"), "r");
        });
      });

      it("getBlob()", function () {
        const container: BlobStorageContainer = getContainer();
        const blob: BlobStorageBlob = container.getBlob("x/y.txt");
        assertEx.defined(blob, "blob");
        assert.deepEqual(blob.path, BlobPath.parse(`${container.name}/x/y.txt`));
        assert.strictEqual(blob.storage, container.storage);
      });

      it("getBlockBlob()", function () {
        const container: BlobStorageContainer = getContainer();
        const blockBlob: BlobStorageBlockBlob = container.getBlockBlob("x/y/z.txt");
        assertEx.defined(blockBlob, "blockBlob");
        assert.deepEqual(blockBlob.path, BlobPath.parse(`${container.name}/x/y/z.txt`));
        assert.strictEqual(blockBlob.storage, container.storage);
      });

      it("getAppendBlob()", function () {
        const container: BlobStorageContainer = getContainer();
        const appendBlob: BlobStorageAppendBlob = container.getAppendBlob("x/y/z.txt");
        assertEx.defined(appendBlob, "appendBlob");
        assert.deepEqual(appendBlob.path, BlobPath.parse(`${container.name}/x/y/z.txt`));
        assert.strictEqual(appendBlob.storage, container.storage);
      });

      describe("getPrefix()", function () {
        it(`with ""`, function () {
          const container: BlobStorageContainer = getContainer();
          const prefix: BlobStoragePrefix = container.getPrefix("");
          assert.strictEqual(prefix, container);
        });

        it(`with "a"`, function () {
          const container: BlobStorageContainer = getContainer();
          const prefix: BlobStoragePrefix = container.getPrefix("a");
          assert.deepEqual(prefix.path, new BlobPath(container.name, "a"));
          assert.strictEqual(prefix.storage, container.storage);
        });

        it(`with "a/"`, function () {
          const container: BlobStorageContainer = getContainer();
          const prefix: BlobStoragePrefix = container.getPrefix("a/");
          assert.deepEqual(prefix.path, new BlobPath(container.name, "a/"));
          assert.strictEqual(prefix.storage, container.storage);
        });

        it(`with "a/b"`, function () {
          const container: BlobStorageContainer = getContainer();
          const prefix: BlobStoragePrefix = container.getPrefix("a/b");
          assert.deepEqual(prefix.path, new BlobPath(container.name, "a/b"));
          assert.strictEqual(prefix.storage, container.storage);
        });

        it(`with "a/b/"`, function () {
          const container: BlobStorageContainer = getContainer();
          const prefix: BlobStoragePrefix = container.getPrefix("a/b/");
          assert.deepEqual(prefix.path, new BlobPath(container.name, "a/b/"));
          assert.strictEqual(prefix.storage, container.storage);
        });

        it(`with "a/b/c"`, function () {
          const container: BlobStorageContainer = getContainer();
          const prefix: BlobStoragePrefix = container.getPrefix("a/b/c");
          assert.deepEqual(prefix.path, new BlobPath(container.name, "a/b/c"));
          assert.strictEqual(prefix.storage, container.storage);
        });
      });

      describe("create()", function () {
        it("with non-existing container and no options", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          assert.strictEqual(await container.create(), true);
          try {
            assert.strictEqual(await container.exists(), true);
            if (!(blobStorage instanceof AzureBlobStorage)) {
              assert.strictEqual(await container.getAccessPolicy(), "private");
            }
          } finally {
            await container.delete();
          }
        });

        it("with non-existing container and empty options", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          assert.strictEqual(await container.create({}), true);
          try {
            assert.strictEqual(await container.exists(), true);
            if (!(blobStorage instanceof AzureBlobStorage)) {
              assert.strictEqual(await container.getAccessPolicy(), "private");
            }
          } finally {
            await container.delete();
          }
        });

        it("with non-existing container and accessPolicy options", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          assert.strictEqual(await container.create({ accessPolicy: "blob" }), true);
          try {
            assert.strictEqual(await container.exists(), true);
            if (!(blobStorage instanceof AzureBlobStorage)) {
              assert.strictEqual(await container.getAccessPolicy(), "blob");
            }
          } finally {
            await container.delete();
          }
        });

        it("when container already exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
          assert.strictEqual(await container.create(), true);
          try {
            assert.strictEqual(await container.create(), false);
            assert.strictEqual(await container.exists(), true);
            if (!(blobStorage instanceof AzureBlobStorage)) {
              assert.strictEqual(await container.getAccessPolicy(), "private");
            }
          } finally {
            await container.delete();
          }
        });
      });

      describe("setAccessPolicy()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // setAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
            const error: Error = await assertEx.throwsAsync(container.setAccessPolicy("container"));
            assertEx.containsAll(error.message, [
              "ContainerNotFound",
              "The specified container does not exist."
            ]);
          }
        });

        it("when container exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // setAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
            await container.create();
            try {
              await container.setAccessPolicy("container");
              assert.strictEqual(await container.getAccessPolicy(), "container");
            } finally {
              await container.delete();
            }
          }
        });
      });

      describe("createBlockBlob()", function () {
        it("when container doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          const error: Error = await assertEx.throwsAsync(container.createBlockBlob(getBlobName()));
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist."
          ]);
        });

        it("with undefined blockBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.createBlockBlob(undefined as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with null blockBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            // tslint:disable-next-line:no-null-keyword
            const error: Error = await assertEx.throwsAsync(container.createBlockBlob(null as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with empty blockBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.createBlockBlob(""));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with non-empty blockBlobName that doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const blockBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createBlockBlob(blockBlobName);
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.deepEqual(await container.blobExists(blockBlobName), true);
          } finally {
            await container.delete();
          }
        });

        it("with non-empty blockBlobName that already exists", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const blockBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createBlockBlob(blockBlobName);
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.deepEqual(await container.blobExists(blockBlobName), true);

            assert.deepEqual(await container.createBlockBlob(blockBlobName), { created: false });
            assert.deepEqual(await container.blobExists(blockBlobName), true);
          } finally {
            await container.delete();
          }
        });

        it("with contentType when blob doesn't already exist", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const blockBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createBlockBlob(blockBlobName, { contentType: "spam" });
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.strictEqual(await container.blobExists(blockBlobName), true);
            assert.strictEqual(await container.getBlobContentType(blockBlobName), "spam");
          } finally {
            await container.delete();
          }
        });

        it("with contentType when blob already exists", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const blockBlobName: string = getBlobName();

            const createResult: CreateBlobResult = await container.createBlockBlob(blockBlobName, { contentType: "spam" });
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.strictEqual(await container.blobExists(blockBlobName), true);

            assert.deepEqual(await container.createBlockBlob(blockBlobName, { contentType: "spam2" }), { created: false });
            assert.strictEqual(await container.blobExists(blockBlobName), true);
            assert.strictEqual(await container.getBlobContentType(blockBlobName), "spam");
          } finally {
            await container.delete();
          }
        });
      });

      describe("createAppendBlob()", function () {
        it("when container doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          const error: Error = await assertEx.throwsAsync(container.createAppendBlob(getBlobName()));
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist."
          ]);
        });

        it("with undefined appendBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.createAppendBlob(undefined as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with null appendBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            // tslint:disable-next-line:no-null-keyword
            const error: Error = await assertEx.throwsAsync(container.createAppendBlob(null as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with empty appendBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.createAppendBlob(""));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with non-empty appendBlobName that doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const appendBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createAppendBlob(appendBlobName);
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.strictEqual(await container.blobExists(appendBlobName), true);
          } finally {
            await container.delete();
          }
        });

        it("with non-empty appendBlobName that already exists", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const appendBlobName: string = getBlobName();

            const createResult: CreateBlobResult = await container.createAppendBlob(appendBlobName);
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.strictEqual(await container.blobExists(appendBlobName), true);

            assert.deepEqual(await container.createAppendBlob(appendBlobName), { created: false });
            assert.strictEqual(await container.blobExists(appendBlobName), true);
          } finally {
            await container.delete();
          }
        });

        it("with contentType when blob doesn't already exist", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const appendBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createAppendBlob(appendBlobName, { contentType: "spam" });
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.strictEqual(await container.blobExists(appendBlobName), true);
            assert.strictEqual(await container.getBlobContentType(appendBlobName), "spam");
          } finally {
            await container.delete();
          }
        });

        it("with contentType when blob already exists", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const appendBlobName: string = getBlobName();

            const createResult: CreateBlobResult = await container.createAppendBlob(appendBlobName, { contentType: "spam" });
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");
            assert.strictEqual(await container.blobExists(appendBlobName), true);

            assert.deepEqual(await container.createAppendBlob(appendBlobName, { contentType: "spam2" }), { created: false });
            assert.strictEqual(await container.blobExists(appendBlobName), true);
            assert.strictEqual(await container.getBlobContentType(appendBlobName), "spam");
          } finally {
            await container.delete();
          }
        });
      });

      describe("setBlobContentType()", function () {
        it("when container doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          const error: Error = await assertEx.throwsAsync(container.setBlobContentType(getBlobName(), "spam"));
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist."
          ]);
        });

        it("with undefined appendBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.setBlobContentType(undefined as any, "spam"));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with null appendBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            // tslint:disable-next-line:no-null-keyword
            const error: Error = await assertEx.throwsAsync(container.setBlobContentType(null as any, "spam"));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with empty appendBlobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.setBlobContentType("", "spam"));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });
      });

      describe("getBlobContentsAsString()", function () {
        it("when container doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          const error: Error = await assertEx.throwsAsync(container.getBlobContentsAsString(getBlobName()));
          assertEx.containsAll(error.message, [
            "BlobNotFound",
            "The specified blob does not exist."
          ]);
        });

        it("with undefined blobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.getBlobContentsAsString(undefined as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with null blobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            // tslint:disable-next-line:no-null-keyword
            const error: Error = await assertEx.throwsAsync(container.getBlobContentsAsString(null as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with empty blobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.getBlobContentsAsString(""));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with non-empty blobName that doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.getBlobContentsAsString(getBlobName()));
            assertEx.containsAll(error.message, [
              "BlobNotFound",
              "The specified blob does not exist."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with existing BlockBlob", async function () {
          this.timeout(2000);

          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const blockBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createBlockBlob(blockBlobName);
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag);
            const updateResult: ETagResult = await container.setBlockBlobContentsFromString(blockBlobName, "hello world");
            assert.notStrictEqual(updateResult.etag, createResult.etag);

            assert.strictEqual(await container.getBlobContentsAsString(blockBlobName), "hello world");
          } finally {
            await container.delete();
          }
        });

        it("with existing AppendBlob", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const appendBlobName: string = getBlobName();
            const createResult: CreateBlobResult = await container.createAppendBlob(appendBlobName);
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag);
            const appendResult: ETagResult = await container.addToAppendBlobContentsFromString(appendBlobName, "hello world");
            assertEx.definedAndNotStrictEqual(appendResult.etag, createResult.etag);

            assert.strictEqual(await container.getBlobContentsAsString(appendBlobName), "hello world");
          } finally {
            await container.delete();
          }
        });
      });

      describe("deleteBlob()", function () {
        it("when container doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          const error: Error = await assertEx.throwsAsync(container.deleteBlob(getBlobName()));
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist."
          ]);
        });

        it("with undefined blobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.deleteBlob(undefined as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with null blobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            // tslint:disable-next-line:no-null-keyword
            const error: Error = await assertEx.throwsAsync(container.deleteBlob(null as any));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with empty blobName", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(container.deleteBlob(""));
            assertEx.containsAll(error.message, [
              "InvalidUri",
              "The requested URI does not represent any resource on the server."
            ]);
          } finally {
            await container.delete();
          }
        });

        it("with non-empty blobName that doesn't exist", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            assert.strictEqual(await container.deleteBlob(getBlobName()), false);
          } finally {
            await container.delete();
          }
        });

        it("with existing BlockBlob", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const blockBlobName: string = getBlobName();
            await container.createBlockBlob(blockBlobName);
            assert.strictEqual(await container.deleteBlob(blockBlobName), true);
          } finally {
            await container.delete();
          }
        });

        it("with existing AppendBlob", async function () {
          const container: BlobStorageContainer = getContainer();
          await container.create();
          try {
            const appendBlobName: string = getBlobName();
            await container.createAppendBlob(appendBlobName);
            assert.strictEqual(await container.deleteBlob(appendBlobName), true);
          } finally {
            await container.delete();
          }
        });
      });
    });

    describe("BlobStorageBlob", function () {
      function getBlob(blobPath?: string | BlobPath, blobStorage?: BlobStorage, credential?: Credential): BlobStorageBlob {
        if (!blobPath) {
          blobPath = new BlobPath(getContainerName(), getBlobName());
        }
        blobPath = BlobPath.parse(blobPath);

        if (!blobStorage) {
          blobStorage = createBlobStorage(credential);
        }

        const container: BlobStorageContainer = blobStorage.getContainer(blobPath.containerName);
        return container.getBlob(blobPath.blobName);
      }

      describe("getURL()", function () {
        it("with regular path and no options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL(), expectedURL);
        });

        it("with regular path and {} options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({}), expectedURL);
        });

        it("with regular path and { sasToken: false } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({ sasToken: false }), expectedURL);
        });

        it("with regular path and { sasToken: true } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({ sasToken: true }), expectedURL);
        });

        it("with regular path and { sasToken: { endTime } } } options with AnonymousCredential", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const error: Error = assertEx.throws(() => blob.getURL({ sasToken: { endTime: Duration.minutes(10).fromNow() } }));
          assert.strictEqual(error.message, "Cannot create a new SAS token if the BlobStorage credentials are not a SharedKeyCredential.");
        });

        it("with regular path and { sasToken: { endTime } } } options with SharedKeyCredential", function () {
          const blobStorage: BlobStorage = createBlobStorage(new SharedKeyCredential("fake-account-name", "fake-account-key"));
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const blobStorageUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL());
          const blobSasUrl: URLBuilder = URLBuilder.parse(blob.getURL({
            sasToken: {
              endTime: Duration.minutes(10).fromNow(),
            }
          }));
          assert.strictEqual(blobSasUrl.getScheme(), blobStorageUrl.getScheme());
          assert.strictEqual(blobSasUrl.getHost(), blobStorageUrl.getHost());
          assert.strictEqual(blobSasUrl.getPort(), blobStorageUrl.getPort());
          assert.strictEqual(blobSasUrl.getPath(), `/${blob.path.containerName}/${blob.path.blobName}`);
          assert.strictEqual(blobSasUrl.getQueryParameterValue("st"), undefined);
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("se") as string, "se");
          assert.strictEqual(blobSasUrl.getQueryParameterValue("sr"), "b");
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("sig") as string, "sig");
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("sv") as string, "sv");
          assert.strictEqual(blobSasUrl.getQueryParameterValue("sp"), "r");
        });

        it("with regular path and { sasToken: { startTime, endTime } } } options with SharedKeyCredential", function () {
          const blobStorage: BlobStorage = createBlobStorage(new SharedKeyCredential("fake-account-name", "fake-account-key"));
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const blobStorageUrl: URLBuilder = URLBuilder.parse(blobStorage.getURL());
          const blobSasUrl: URLBuilder = URLBuilder.parse(blob.getURL({
            sasToken: {
              startTime: Duration.minutes(-5).fromNow(),
              endTime: Duration.minutes(10).fromNow(),
            }
          }));
          assert.strictEqual(blobSasUrl.getScheme(), blobStorageUrl.getScheme());
          assert.strictEqual(blobSasUrl.getHost(), blobStorageUrl.getHost());
          assert.strictEqual(blobSasUrl.getPort(), blobStorageUrl.getPort());
          assert.strictEqual(blobSasUrl.getPath(), `/${blob.path.containerName}/${blob.path.blobName}`);
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("st") as string, "st");
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("se") as string, "se");
          assert.strictEqual(blobSasUrl.getQueryParameterValue("sr"), "b");
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("sig") as string, "sig");
          assertEx.definedAndNotEmpty(blobSasUrl.getQueryParameterValue("sv") as string, "sv");
          assert.strictEqual(blobSasUrl.getQueryParameterValue("sp"), "r");
        });

        it("with deep path and no options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL(), expectedURL);
        });

        it("with deep path and {} options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({}), expectedURL);
        });

        it("with deep path and { sasToken: false } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({ sasToken: false }), expectedURL);
        });

        it("with deep path and { sasToken: true } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}/a/deep/path`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({ sasToken: true }), expectedURL);
        });

        it("with @ path and no options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL(), expectedURL);
        });

        it("with @ path and {} options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({}), expectedURL);
        });

        it("with @ path and { sasToken: false } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL())
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({ sasToken: false }), expectedURL);
        });

        it("with @ path and { sasToken: true } options", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(`${getBlobPath()}@`, blobStorage);
          const expectedURL: string = URLBuilder.parse(blobStorage.getURL({ sasToken: true }))
            .setPath(`${blob.path.containerName}/${blob.path.blobName}`)
            .toString();
          assert.strictEqual(blob.getURL({ sasToken: true }), expectedURL);
        });
      });

      describe("exists()", function () {
        it("when container doesn't exist", async function () {
          const blob: BlobStorageBlob = getBlob();
          assert.strictEqual(await blob.exists(), false);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            assert.strictEqual(await blob.exists(), false);
          } finally {
            await container.delete();
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.createBlockBlob(blob.path);
            assert.strictEqual(await blob.exists(), true);
          } finally {
            await container.delete();
          }
        });
      });

      describe("delete()", function () {
        it("when container doesn't exist", async function () {
          const blob: BlobStorageBlob = getBlob();
          const error: Error = await assertEx.throwsAsync(blob.delete());
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist."
          ]);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            assert.strictEqual(await blob.delete(), false);
          } finally {
            await container.delete();
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.createBlockBlob(blob.path);
            assert.strictEqual(await blob.delete(), true);
          } finally {
            await container.delete();
          }
        });
      });

      describe("getContentsAsString()", function () {
        it("when container doesn't exist", async function () {
          const blob: BlobStorageBlob = getBlob();
          const error: Error = await assertEx.throwsAsync(blob.getContentsAsString());
          assertEx.containsAll(error.message, [
            "BlobNotFound",
            "The specified blob does not exist.",
          ]);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(blob.getContentsAsString());
            assertEx.containsAll(error.message, [
              "BlobNotFound",
              "The specified blob does not exist.",
            ]);
          } finally {
            await container.delete();
          }
        });

        it("when blob exists with empty content", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.createBlockBlob(blob.path);
            assert.strictEqual(await blob.getContentsAsString(), "");
          } finally {
            await container.delete();
          }
        });

        it("when blob exists with non-empty content", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            const result: ETagResult = await blobStorage.setBlockBlobContentsFromString(blob.path, "non-empty");
            assertEx.definedAndNotEmpty(result.etag);
            assert.strictEqual(await blob.getContentsAsString(), "non-empty");
          } finally {
            await container.delete();
          }
        });
      });

      describe("getContentType()", function () {
        it("when container doesn't exist", async function () {
          const blob: BlobStorageBlob = getBlob();
          const error: Error = await assertEx.throwsAsync(blob.getContentType());
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist.",
          ]);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(blob.getContentType());
            assertEx.containsAll(error.message, [
              "BlobNotFound",
              "The specified blob does not exist.",
            ]);
          } finally {
            await container.delete();
          }
        });

        it("when blob exists with no content type specified", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.createBlockBlob(blob.path);
            assert.strictEqual(await blob.getContentType(), "application/octet-stream");
          } finally {
            await container.delete();
          }
        });

        it("when blob exists with content type specified", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.setBlockBlobContentsFromString(blob.path, "non-empty", { contentType: "spam" });
            assert.strictEqual(await blob.getContentType(), "spam");
          } finally {
            await container.delete();
          }
        });
      });

      describe("setContentType()", function () {
        it("when container doesn't exist", async function () {
          const blob: BlobStorageBlob = getBlob();
          const error: Error = await assertEx.throwsAsync(blob.setContentType("spam"));
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist.",
          ]);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            const error: Error = await assertEx.throwsAsync(blob.setContentType("spam"));
            assertEx.containsAll(error.message, [
              "BlobNotFound",
              "The specified blob does not exist.",
            ]);
          } finally {
            await container.delete();
          }
        });

        it("when blob exists with default content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.createBlockBlob(blob.path);
            await blob.setContentType("spam");
            assert.strictEqual(await blob.getContentType(), "spam");
          } finally {
            await container.delete();
          }
        });

        it("when blob exists with content type specified", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const blob: BlobStorageBlob = getBlob(getBlobPath(), blobStorage);
          const container: BlobStorageContainer = blobStorage.getContainer(blob.path.containerName);
          await container.create();
          try {
            await blobStorage.setBlockBlobContentsFromString(blob.path, "non-empty", { contentType: "spam" });
            await blob.setContentType("grapes");
            assert.strictEqual(await blob.getContentType(), "grapes");
          } finally {
            await container.delete();
          }
        });
      });
    });

    describe("BlobStorage", function () {
      describe("getURL()", function () {
        it("with no arguments", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          assert.strictEqual(blobStorage.getURL(), URLBuilder.removeQuery(blobStorageUrl).toString());
        });

        it("with {}", function () {
          const blobStorage: BlobStorage = createBlobStorage();
          assert.strictEqual(blobStorage.getURL({}), URLBuilder.removeQuery(blobStorageUrl).toString());
        });

        it(`with { sasToken: undefined }`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          assert.strictEqual(blobStorage.getURL({ sasToken: undefined }), URLBuilder.removeQuery(blobStorageUrl).toString());
        });

        it(`with { sasToken: false }`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          assert.strictEqual(blobStorage.getURL({ sasToken: false }), URLBuilder.removeQuery(blobStorageUrl).toString());
        });

        it(`with { sasToken: true }`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          assert.strictEqual(blobStorage.getURL({ sasToken: true }), blobStorageUrl);
        });
      });

      it("getContainer()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const container: BlobStorageContainer = blobStorage.getContainer("xyz");
        assert.strictEqual(container.name, "xyz");
        assert.strictEqual(container.storage, blobStorage);
      });

      it("getBlockBlob()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const blockBlob: BlobStorageBlockBlob = blobStorage.getBlockBlob("abcd/efghi");
        assert.strictEqual(blockBlob.path.containerName, "abcd");
        assert.strictEqual(blockBlob.path.blobName, "efghi");
        assert.strictEqual(blockBlob.storage, blobStorage);
      });

      it("getAppendBlob()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const appendBlob: BlobStorageAppendBlob = blobStorage.getAppendBlob("abcd/efghi");
        assert.strictEqual(appendBlob.path.containerName, "abcd");
        assert.strictEqual(appendBlob.path.blobName, "efghi");
        assert.strictEqual(appendBlob.storage, blobStorage);
      });

      describe("getPrefix()", function () {
        it(`with ""`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = blobStorage.getPrefix("");
          assert.strictEqual(prefix.path.containerName, "");
          assert.strictEqual(prefix.path.blobName, "");
          assert.strictEqual(prefix.storage, blobStorage);
        });

        it(`with "abc"`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = blobStorage.getPrefix("abc");
          assert.strictEqual(prefix.path.containerName, "abc");
          assert.strictEqual(prefix.path.blobName, "");
          assert.strictEqual(prefix.storage, blobStorage);
        });

        it(`with "abc/"`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = blobStorage.getPrefix("abc/");
          assert.strictEqual(prefix.path.containerName, "abc");
          assert.strictEqual(prefix.path.blobName, "");
          assert.strictEqual(prefix.storage, blobStorage);
        });

        it(`with "abc/def"`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = blobStorage.getPrefix("abc/def");
          assert.strictEqual(prefix.path.containerName, "abc");
          assert.strictEqual(prefix.path.blobName, "def");
          assert.strictEqual(prefix.storage, blobStorage);
        });

        it(`with "abc/def/"`, function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const prefix: BlobStoragePrefix = blobStorage.getPrefix("abc/def/");
          assert.strictEqual(prefix.path.containerName, "abc");
          assert.strictEqual(prefix.path.blobName, "def/");
          assert.strictEqual(prefix.storage, blobStorage);
        });
      });

      describe("containerExists()", function () {
        it("with empty container name", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const error: Error = await assertEx.throwsAsync(blobStorage.containerExists(""));
          assertEx.contains(error.message, "InvalidResourceName");
          assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
        });

        it("with container name with uppercased letters", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const error: Error = await assertEx.throwsAsync(blobStorage.containerExists("ABCDEF"));
          assertEx.contains(error.message, "InvalidResourceName");
          assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
        });

        it("with container name that doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          assert.strictEqual(await blobStorage.containerExists(getContainerName()), false);
        });

        it("with container name that does exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            assert.strictEqual(await blobStorage.containerExists(containerName), true);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("getContainerAccessPolicy()", function () {
        it("with empty container name", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // getContainerAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const error: Error = await assertEx.throwsAsync(blobStorage.getContainerAccessPolicy(""));
            assertEx.contains(error.message, "InvalidResourceName");
            assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
          }
        });

        it("with container name with uppercased letters", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // getContainerAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const error: Error = await assertEx.throwsAsync(blobStorage.getContainerAccessPolicy("ABCDEF"));
            assertEx.contains(error.message, "InvalidResourceName");
            assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
          }
        });

        it("with container name that doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // getContainerAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const error: Error = await assertEx.throwsAsync(blobStorage.getContainerAccessPolicy(getContainerName()));
            assertEx.containsAll(error.message, [
              "ContainerNotFound",
              "The specified container does not exist"
            ]);
          }
        });

        it("with container name that exists but doesn't have an access policy explicitly set", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // getContainerAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const containerName: string = getContainerName();
            await blobStorage.createContainer(containerName);
            try {
              assert.strictEqual(await blobStorage.getContainerAccessPolicy(containerName), "private");
            } finally {
              await blobStorage.deleteContainer(containerName);
            }
          }
        });

        it("with container name that exists and has an access policy explicitly set", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          if (blobStorage instanceof AzureBlobStorage) {
            // getContainerAccessPolicy() fails for Azure Storage Accounts, even when the SAS url
            // gives permissions for everything. Not sure what this is about.
            this.skip();
          } else {
            const containerName: string = getContainerName();
            await blobStorage.createContainer(containerName, { accessPolicy: "blob" });
            try {
              assert.strictEqual(await blobStorage.getContainerAccessPolicy(containerName), "blob");
            } finally {
              await blobStorage.deleteContainer(containerName);
            }
          }
        });
      });

      describe("createContainer()", function () {
        it("with empty container name", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const error: Error = await assertEx.throwsAsync(blobStorage.createContainer(""));
          assertEx.contains(error.message, "InvalidResourceName");
          assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
        });

        it("with container name with uppercased letters", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const error: Error = await assertEx.throwsAsync(blobStorage.createContainer("ABCDEF"));
          assertEx.contains(error.message, "InvalidResourceName");
          assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
        });

        it("with valid container name that doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          try {
            assert.strictEqual(await blobStorage.createContainer(containerName), true);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("with valid container name that already exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          try {
            await blobStorage.createContainer(containerName);
            assert.strictEqual(await blobStorage.createContainer(containerName), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("listContainers()", function () {
        it("when no containers exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containers: BlobStorageContainer[] = await blobStorage.listContainers();
          assert.deepEqual(containers, []);
        });

        it("when one container exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const containers: BlobStorageContainer[] = await blobStorage.listContainers();
            assert.deepEqual(containers, [blobStorage.getContainer(containerName)]);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("deleteContainer()", function () {
        it("with empty container name", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const error: Error = await assertEx.throwsAsync(blobStorage.deleteContainer(""));
          assertEx.contains(error.message, "InvalidResourceName");
          assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
        });

        it("with container name with uppercased characters", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const error: Error = await assertEx.throwsAsync(blobStorage.deleteContainer("ABCDEF"));
          assertEx.contains(error.message, "InvalidResourceName");
          assertEx.contains(error.message, "The specifed resource name contains invalid characters.");
        });

        it("with valid container name that doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          assert.strictEqual(await blobStorage.deleteContainer(containerName), false);
        });

        it("with valid container name that does exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          assert.strictEqual(await blobStorage.deleteContainer(containerName), true);
          assert.strictEqual(await blobStorage.containerExists(containerName), false);
        });
      });

      describe("blobExists()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), false);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), true);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("with @ in blob name", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}@`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), true);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("createBlockBlob()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.createBlockBlob(new BlobPath(containerName, blobName)));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const result: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(result.created, true);
            assertEx.definedAndNotEmpty(result.etag, "result.etag");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const createResult: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(createResult.created, true);
            assertEx.definedAndNotEmpty(createResult.etag, "createResult.etag");

            assert.deepEqual(await blobStorage.createBlockBlob(new BlobPath(containerName, blobName)), { created: false });
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("with application/html contentType", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();

            const result: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "application/html" });
            assert.strictEqual(result.created, true);
            assertEx.definedAndNotEmpty(result.etag, "result.etag");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/html");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("with @ in blob name", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}@`;
            const result: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(result.created, true);
            assertEx.definedAndNotEmpty(result.etag, "result.etag");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("getBlobContentType()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.getBlobContentType(new BlobPath(containerName, blobName)));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const error: Error = await assertEx.throwsAsync(blobStorage.getBlobContentType(new BlobPath(containerName, blobName)));
            assertEx.contains(error.message, "BlobNotFound");
            assertEx.contains(error.message, "The specified blob does not exist.");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists but doesn't have an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/octet-stream");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists and has an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob exists but doesn't have an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/octet-stream");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob exists and has an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("setBlobContentType()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.setBlobContentType(new BlobPath(containerName, blobName), "abc"));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const error: Error = await assertEx.throwsAsync(blobStorage.setBlobContentType(new BlobPath(containerName, blobName), "abc"));
            assertEx.contains(error.message, "BlobNotFound");
            assertEx.contains(error.message, "The specified blob does not exist.");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists but doesn't have an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            await blobStorage.setBlobContentType(new BlobPath(containerName, blobName), "abc");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists and has an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            await blobStorage.setBlobContentType(new BlobPath(containerName, blobName), "xyz");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "xyz");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob exists but doesn't have an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            await blobStorage.setBlobContentType(new BlobPath(containerName, blobName), "abc");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob exists and has an assigned content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            await blobStorage.setBlobContentType(new BlobPath(containerName, blobName), "xyz");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "xyz");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("deleteBlob()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.deleteBlob(new BlobPath(containerName, blobName)));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            assert.strictEqual(await blobStorage.deleteBlob(new BlobPath(containerName, blobName)), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.deleteBlob(new BlobPath(containerName, blobName)), true);
            assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            assert.strictEqual(await blobStorage.deleteBlob(new BlobPath(containerName, blobName)), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.deleteBlob(new BlobPath(containerName, blobName)), true);
            assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("setBlockBlobContentsFromString()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello"));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const result: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assertEx.definedAndNotEmpty(result.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob doesn't exist and with content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const result: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "apples" });
            assertEx.definedAndNotEmpty(result.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "apples");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const createResult: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            const setContentsResult: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assert.notStrictEqual(setContentsResult.etag, createResult.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with not matching etag", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            const error: Error = await assertEx.throwsAsync(blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", {
              etag: "foo"
            }));
            assertEx.containsAll(error.message, [
              "ConditionNotMet",
              "The condition specified using HTTP conditional header(s) is not met.",
            ]);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with no content type and the request has content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const createResult: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/octet-stream");

            const setContentsResult: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "text" });
            assert.notStrictEqual(setContentsResult.etag, createResult.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "text");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with content type and the request has no content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const createResult: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            const setContentsResult: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assert.notStrictEqual(setContentsResult.etag, createResult.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/octet-stream");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with content type and the request has content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const createResult: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            const setContentsResult: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "xyz" });
            assert.notStrictEqual(setContentsResult.etag, createResult.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "xyz");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when deep blob exists with content type and the request has content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            const createResult: CreateBlobResult = await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            const setContentsResult: ETagResult = await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "xyz" });
            assert.notStrictEqual(setContentsResult.etag, createResult.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "xyz");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("setBlockBlobContentsFromFile()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename);
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob doesn't exist and file doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const error: Error = await assertEx.throwsAsync(blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), joinPath(__dirname, "idontexist.txt")));
            assertEx.contains(error.message, "ENOENT: no such file or directory");
            assertEx.contains(error.message, "idontexist.txt");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob doesn't exist and with content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename, { contentType: "apples" });
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "apples");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename);
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with not matching etag", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            const error: Error = await assertEx.throwsAsync(blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename, {
              etag: "foo"
            }));
            assertEx.containsAll(error.message, [
              "ConditionNotMet",
              "The condition specified using HTTP conditional header(s) is not met.",
            ]);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with no content type and the request has content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/octet-stream");

            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename, { contentType: "text" });
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "text");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with content type and the request has no content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename);
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/octet-stream");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with content type and the request has content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename, { contentType: "xyz" });
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "xyz");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with content type and the request has content type", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName = `${getBlobName()}/a/deep/path`;
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            await blobStorage.setBlockBlobContentsFromFile(new BlobPath(containerName, blobName), __filename, { contentType: "xyz" });
            assertEx.contains(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), `describe("setBlockBlobContentsFromFile()"`);
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "xyz");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("addToAppendBlobContentsFromString()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.addToAppendBlobContentsFromString(new BlobPath(containerName, blobName), "hello"));
          assertEx.containsAll(error.message, [
            "ContainerNotFound",
            "The specified container does not exist.",
          ]);
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const error: Error = await assertEx.throwsAsync(blobStorage.addToAppendBlobContentsFromString(new BlobPath(containerName, blobName), "hello"));
            assertEx.containsAll(error.message, [
              "BlobNotFound",
              "The specified blob does not exist."
            ]);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            const createResult: CreateBlobResult = await blobStorage.createAppendBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            const setContentsResult: ETagResult = await blobStorage.addToAppendBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assert.notStrictEqual(setContentsResult.etag, createResult.etag);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });

        it("when blob exists with not matching etag", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            const error: Error = await assertEx.throwsAsync(blobStorage.addToAppendBlobContentsFromString(new BlobPath(containerName, blobName), "hello", {
              etag: "foo"
            }));
            assertEx.containsAll(error.message, [
              "ConditionNotMet",
              "The condition specified using HTTP conditional header(s) is not met.",
            ]);
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });
    });
  }

  (URLBuilder.parse(blobStorageUrl).getQuery() ? describe : describe.skip)("AzureBlobStorage", function () {
    const createBlobStorage = (credential?: Credential) => new AzureBlobStorage(blobStorageUrl, credential);

    blobStorageTests(createBlobStorage);

    describe("constructor()", function () {
      it("with empty storageAccountUrl", function () {
        const error: Error = assertEx.throws(() => new AzureBlobStorage(""));
        assert.strictEqual(error.message, "Cannot construct a storage account URL with an empty or undefined storage account name or URL argument.");
      });

      it("with valid storageAccountUrl", function () {
        const blobStorage = new AzureBlobStorage(blobStorageUrl);
        assert.strictEqual(blobStorage.getURL(), URLBuilder.removeQuery(blobStorageUrl).toString());
      });

      it("with storage account name", function () {
        const blobStorage = new AzureBlobStorage("fakestorageaccountname");
        assert.strictEqual(blobStorage.getURL(), "https://fakestorageaccountname.blob.core.windows.net");
      });
    });

    it("getContainerURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      const url: URLBuilder = URLBuilder.parse(blobStorageUrl)
        .setPath("spam")
        .removeQuery();
      assert.strictEqual(blobStorage.getContainerURL("spam"), url.toString());
    });

    describe("getBlobURL()", function () {
      it("with no options argument", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const actualBlobUrl: string = blobStorage.getBlobURL("spam/apples/tomatoes");
        const expectedBlobUrl: string = URLBuilder.parse(blobStorageUrl)
          .setPath("spam/apples/tomatoes")
          .removeQuery()
          .toString();
        assert.strictEqual(actualBlobUrl, expectedBlobUrl);
      });
    });
  });

  describe("InMemoryBlobStorage", function () {
    const createBlobStorage = (credential?: Credential) => new InMemoryBlobStorage(blobStorageUrl, credential);

    blobStorageTests(createBlobStorage);

    describe("constructor()", function () {
      it("with empty storageAccountUrl", function () {
        const error: Error = assertEx.throws(() => new InMemoryBlobStorage(""));
        assert.strictEqual(error.message, "Cannot construct a storage account URL with an empty or undefined storage account name or URL argument.");
      });

      it("with valid storageAccountUrl", function () {
        const blobStorage = new InMemoryBlobStorage(blobStorageUrl);
        assert.strictEqual(blobStorage.getURL(), URLBuilder.removeQuery(blobStorageUrl).toString());
      });

      it("with storage account name", function () {
        const blobStorage = new InMemoryBlobStorage("fakestorageaccountname");
        assert.strictEqual(blobStorage.getURL(), "https://fakestorageaccountname.blob.core.windows.net");
      });
    });

    it("getContainerURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      assert.strictEqual(blobStorage.getContainerURL("spam"), "https://sdkautomationdev.blob.core.windows.net/spam");
    });

    it("getBlobURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      assert.strictEqual(blobStorage.getBlobURL("spam/apples/tomatoes"), "https://sdkautomationdev.blob.core.windows.net/spam/apples/tomatoes");
    });
  });
});
