import { assert } from "chai";
import { assertEx } from "../lib/assertEx";
import { AzureBlobStorage, BlobStorage, BlobStorageContainer, BlobPath, BlobStorageBlob, InMemoryBlobStorage } from "../lib/blobStorage";

describe("blobStorage.ts", function () {
  function blobStorageTests(createBlobStorage: () => BlobStorage): Mocha.Suite {
    return describe("BlobStorage", function () {
      const defaultContainerNamePrefix = "abc";
      let containerCount = 0;
      const defaultBlobNamePrefix = "xyz";
      let blobCount = 0;

      function getContainerName(): string {
        return `${defaultContainerNamePrefix}${++containerCount}`;
      }

      function getBlobName(): string {
        return `${defaultBlobNamePrefix}${++blobCount}`;
      }

      it("getContainer()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const container: BlobStorageContainer = blobStorage.getContainer("xyz");
        assert.strictEqual(container.name, "xyz");
        assert.strictEqual(container.storage, blobStorage);
      });

      it("getBlob()", function () {
        const blobStorage: BlobStorage = createBlobStorage();
        const blob: BlobStorageBlob = blobStorage.getBlob("abcd/efghi");
        assert.strictEqual(blob.path.containerName, "abcd");
        assert.strictEqual(blob.path.blobName, "efghi");
        assert.strictEqual(blob.storage, blobStorage);
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
            await blobStorage.createBlob(new BlobPath(containerName, blobName));
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
          const error: Error = await assertEx.throwsAsync(blobStorage.createBlob(new BlobPath(containerName, blobName)));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            assert.strictEqual(await blobStorage.createBlob(new BlobPath(containerName, blobName)), true);
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
            assert.strictEqual(await blobStorage.createBlob(new BlobPath(containerName, blobName)), true);
            assert.strictEqual(await blobStorage.createBlob(new BlobPath(containerName, blobName)), false);
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
            await blobStorage.createBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.deleteBlob(new BlobPath(containerName, blobName)), true);
            assert.strictEqual(await blobStorage.blobExists(new BlobPath(containerName, blobName)), false);
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });

      describe("setBlobContentsFromString()", function () {
        it("when container doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          const blobName: string = getBlobName();
          const error: Error = await assertEx.throwsAsync(blobStorage.setBlobContentsFromString(new BlobPath(containerName, blobName), "hello"));
          assertEx.contains(error.message, "ContainerNotFound");
          assertEx.contains(error.message, "The specified container does not exist.");
        });

        it("when blob doesn't exist", async function () {
          const blobStorage: BlobStorage = createBlobStorage();
          const containerName: string = getContainerName();
          await blobStorage.createContainer(containerName);
          try {
            const blobName: string = getBlobName();
            await blobStorage.setBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
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
            await blobStorage.createBlob(new BlobPath(containerName, blobName));
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "");

            await blobStorage.setBlobContentsFromString(new BlobPath(containerName, blobName), "hello");
            assert.strictEqual(await blobStorage.getBlobContentsAsString(new BlobPath(containerName, blobName)), "hello");
          } finally {
            await blobStorage.deleteContainer(containerName);
          }
        });
      });
    });
  }

  describe.skip("AzureBlobStorage", function () {
    const blobStorageUrl = "add SAS Token URL here";

    blobStorageTests(() => new AzureBlobStorage(blobStorageUrl));

    describe("constructor()", function () {
      it("with empty storageAccountUrl", function () {
        const blobStorage = new AzureBlobStorage("");
        assert.strictEqual(blobStorage.url, "");
      });

      it("with valid storageAccountUrl", function () {
        const blobStorage = new AzureBlobStorage(blobStorageUrl);
        assert.strictEqual(blobStorage.url, blobStorageUrl);
      });
    });
  });

  describe("InMemoryBlobStorage", function () {
    blobStorageTests(() => new InMemoryBlobStorage());
  });
});
