import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { AzureBlobStorage, BlobPath, BlobStorage, BlobStorageAppendBlob, BlobStorageBlockBlob, BlobStorageContainer, BlobStoragePrefix, getFileLengthInBytes, InMemoryBlobStorage, BlobStorageBlob } from "../lib/blobStorage";
import { joinPath } from "../lib/path";
import { URLBuilder } from "../lib/url";

const realStorageUrl = "https://sdkautomationdev.blob.core.windows.net/?sv=2018-03-28&ss=bfqt&srt=sco&sp=rwdlacup&se=2019-03-14T00:45:18Z&st=2019-03-13T16:45:18Z&spr=https&sig=EmkSatw8JfVyv58hQmoYZD9qE0AwZaATSKMqoERIdos%3D";

const containerNameBase = "abc";
let containerNameCount = 0;
function getContainerName(): string {
  return `${containerNameBase}${++containerNameCount}`;
}

const blobNameBase = "xyz";
let blobNameCount = 0;
function getBlobName(): string {
  return `${blobNameBase}${++blobNameCount}`;
}

describe.only("blobStorage.ts", function () {
  describe("getFileLengthInBytes()", function () {
    it("with file that doesn't exist", async function () {
      await assertEx.throwsAsync(getFileLengthInBytes("idontexist.jpg"));
    });

    it("with file that exists", async function () {
      const fileLength: number = await getFileLengthInBytes(joinPath(__dirname, "../LICENSE"));
      assert.strictEqual(fileLength, 1077);
    });
  });

  describe("BlobPath", function () {
    it("constructor()", function () {
      const blobPath = new BlobPath("a", "b");
      assert.strictEqual(blobPath.containerName, "a");
      assert.strictEqual(blobPath.blobName, "b");
      assert.strictEqual(blobPath.toString(), "a/b");
    });
  });

  function blobStorageTests(createBlobStorage: () => BlobStorage): void {
    describe("BlobStorageContainer", function () {
      function getContainer(containerName?: string, blobStorage?: BlobStorage): BlobStorageContainer {
        return (blobStorage || createBlobStorage()).getContainer(containerName || getContainerName());
      }

      it("getURL()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const container: BlobStorageContainer = getContainer(getContainerName(), blobStorage);
        const expectedURL: URLBuilder = URLBuilder.parse(blobStorage.getURL())
          .setPath(container.name)
          .removeQuery();
        assert.strictEqual(container.getURL({ sasToken: false }), expectedURL.toString());
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

      it("getPrefix()", function () {
        const container: BlobStorageContainer = getContainer();
        const prefix: BlobStoragePrefix = container.getPrefix("def");
        assertEx.defined(prefix, "prefix");
        assert.deepEqual(prefix.path, BlobPath.parse(`${container.name}/def`));
        assert.strictEqual(prefix.storage, container.storage);
      });

      describe.skip("create()", function () {
        it("with non-existing container and no options", async function () {
          const container: BlobStorageContainer = getContainer();
          assert.strictEqual(await container.create(), true);
          try {
            assert.strictEqual(await container.exists(), true);
            assert.deepEqual(await container.getAccessPolicy(), "private");
          } finally {
            await container.delete();
          }
        });

        it("with non-existing container and empty options", async function () {
          const container: BlobStorageContainer = getContainer();
          assert.strictEqual(await container.create({}), true);
          try {
            assert.strictEqual(await container.exists(), true);
            assert.deepEqual(await container.getAccessPolicy(), "private");
          } finally {
            await container.delete();
          }
        });

        it("with non-existing container and accessPolicy options", async function () {
          const container: BlobStorageContainer = getContainer();
          assert.strictEqual(await container.create({ accessPolicy: "blob" }), true);
          try {
            assert.strictEqual(await container.exists(), true);
            assert.deepEqual(await container.getAccessPolicy(), "blob");
          } finally {
            await container.delete();
          }
        });

        it("when container already exists", async function () {
          const container: BlobStorageContainer = getContainer();
          assert.strictEqual(await container.create(), true);
          try {
            assert.strictEqual(await container.create(), false);
            assert.strictEqual(await container.exists(), true);
            assert.deepEqual(await container.getAccessPolicy(), "blob");
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
            assertEx.contains(error.message, "ContainerNotFound");
            assertEx.contains(error.message, "container does not exist");
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
    });

    describe("BlobStorage", function () {
      it("getContainer()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const container: BlobStorageContainer = blobStorage.getContainer("xyz");
        assert.strictEqual(container.name, "xyz");
        assert.strictEqual(container.storage, blobStorage);
      });

      describe("getBlockBlob()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const blockBlob: BlobStorageBlockBlob = blobStorage.getBlockBlob("abcd/efghi");
        assert.strictEqual(blockBlob.path.containerName, "abcd");
        assert.strictEqual(blockBlob.path.blobName, "efghi");
        assert.strictEqual(blockBlob.storage, blobStorage);
      });

      describe("getAppendBlob()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const appendBlob: BlobStorageAppendBlob = blobStorage.getAppendBlob("abcd/efghi");
        assert.strictEqual(appendBlob.path.containerName, "abcd");
        assert.strictEqual(appendBlob.path.blobName, "efghi");
        assert.strictEqual(appendBlob.storage, blobStorage);
      });

      it("getPrefix()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const prefix: BlobStoragePrefix = blobStorage.getPrefix("abc/xyz");
        assert.strictEqual(prefix.path.containerName, "abc");
        assert.strictEqual(prefix.path.blobName, "xyz");
        assert.strictEqual(prefix.storage, blobStorage);
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
            assertEx.contains(error.message, "ContainerNotFound");
            assertEx.contains(error.message, "The specified container does not exist.");
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
      });

      describe("createBlob()", function () {
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
            assert.strictEqual(await blobStorage.createBlockBlob(new BlobPath(containerName, blobName)), true);
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
            assert.strictEqual(await blobStorage.createBlockBlob(new BlobPath(containerName, blobName)), true);
            assert.strictEqual(await blobStorage.createBlockBlob(new BlobPath(containerName, blobName)), false);
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
            assert.strictEqual(await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "application/html" }), true);
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "application/html");
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
            await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
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
            await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "apples" });
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
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
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

            await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "text" });
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
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
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
            await blobStorage.createBlockBlob(new BlobPath(containerName, blobName), { contentType: "abc" });
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");
            assert.strictEqual(await blobStorage.getBlobContentType(new BlobPath(containerName, blobName)), "abc");

            await blobStorage.setBlockBlobContentsFromString(new BlobPath(containerName, blobName), "hello", { contentType: "xyz" });
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
      });
    });
  }

  (URLBuilder.parse(realStorageUrl).getQuery() ? describe : describe.skip)("AzureBlobStorage", function () {
    const createBlobStorage = () => new AzureBlobStorage(realStorageUrl);

    blobStorageTests(createBlobStorage);

    describe("constructor()", function () {
      it("with empty storageAccountUrl", function () {
        const blobStorage = new AzureBlobStorage("");
        assert.strictEqual(blobStorage.getURL(), "");
      });

      it("with valid storageAccountUrl", function () {
        const blobStorage = new AzureBlobStorage(realStorageUrl);
        assert.strictEqual(blobStorage.getURL(), realStorageUrl);
      });
    });

    it("getURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      assert.strictEqual(blobStorage.getURL(), realStorageUrl);
    });

    it("getContainerURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      const url: URLBuilder = URLBuilder.parse(realStorageUrl)
        .setPath("spam")
        .removeQuery();
      assert.strictEqual(blobStorage.getContainerURL("spam"), url.toString());
    });

    it("getBlobURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      const url: URLBuilder = URLBuilder.parse(realStorageUrl)
        .setPath("spam/apples/tomatoes")
        .removeQuery();
      const actualBlobUrl: string = blobStorage.getBlobURL("spam/apples/tomatoes");
      const expectedBlobUrl: string = url.toString();
      assert.strictEqual(actualBlobUrl, expectedBlobUrl);
    });
  });

  describe("InMemoryBlobStorage", function () {
    const createBlobStorage = () => new InMemoryBlobStorage();

    blobStorageTests(createBlobStorage);

    it("getURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      assert.strictEqual(blobStorage.getURL(), "https://fake.storage.com/");
    });

    it("getContainerURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      assert.strictEqual(blobStorage.getContainerURL("spam"), "https://fake.storage.com/spam");
    });

    it("getBlobURL()", function () {
      const blobStorage: BlobStorage = createBlobStorage();
      assert.strictEqual(blobStorage.getBlobURL("spam/apples/tomatoes"), "https://fake.storage.com/spam/apples/tomatoes");
    });
  });
});
