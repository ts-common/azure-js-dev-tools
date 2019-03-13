/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import * as azure from "@azure/storage-blob";
import * as fs from "fs";
import { map } from "./arrays";
import { readEntireString, StringMap, replaceAll } from "./common";
import { URLBuilder } from "./url";

/**
 * The type of anonymous access allowed for a container. "blob" means that individual blobs are
 * accessible from anonymous requests, but the container and container-level operations (such as
 * list blobs) are not allowed. "container" means that the container and all of its contents
 * and settings are publicly readable. If no value is provided then the container and its blobs are
 * not accessible from anonymous requests.
 * See https://docs.microsoft.com/en-us/azure/storage/blobs/storage-manage-access-to-resources for
 * more information.
 */
export type ContainerAccessPolicy = "private" | "blob" | "container";

/**
 * The options that can be used when creating a container.
 */
export interface CreateContainerOptions {
  /**
   * The type of anonymous access allowed for a container. "blob" means that individual blobs are
   * accessible from anonymous requests, but the container and container-level operations (such as
   * list blobs) are not allowed. "container" means that the container and all of its contents
   * and settings are publicly readable. If no value is provided then the container and its blobs are
   * not accessible from anonymous requests.
   * See https://docs.microsoft.com/en-us/azure/storage/blobs/storage-manage-access-to-resources for
   * more information.
   */
  accessPolicy?: ContainerAccessPolicy;
}

/**
 * Get the number of bytes in the provided file.
 * @param filePath The path to the file.
 */
export function getFileLengthInBytes(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.lstat(filePath, (error: NodeJS.ErrnoException, stats: fs.Stats) => {
      if (error) {
        reject(error);
      } else {
        resolve(stats.size);
      }
    });
  });
}

/**
 * A path to a blob.
 */
export class BlobPath {
  /**
   * The name of the container that the blob is in.
   */
  public readonly containerName: string;
  /**
   * The name of the blob. The name is the path to the blob relative to the container.
   */
  public readonly blobName: string;

  constructor(containerName: string, blobName: string) {
    this.containerName = containerName;
    this.blobName = blobName;
  }

  /**
   * Get the string representation of this BlobPath object.
   */
  public toString(): string {
    return `${this.containerName}/${this.blobName}`;
  }

  /**
   * Parse a BlobPath object from the provided blobPath. The blobPath string must contain a forward
   * slash.
   * @param blobPath The blob path to parse.
   */
  public static parse(blobPath: string | BlobPath): BlobPath {
    let result: BlobPath;
    if (blobPath instanceof BlobPath) {
      result = blobPath;
    } else {
      const firstSlashIndex: number = blobPath.indexOf("/");
      result = new BlobPath(blobPath.substring(0, firstSlashIndex), blobPath.substring(firstSlashIndex + 1));
    }
    return result;
  }
}

export class BlobStorageContainer {
  /**
   * The BlobStorage system that this blob came from.
   */
  public readonly storage: BlobStorage;
  /**
   * The name of this container.
   */
  public readonly name: string;

  /**
   * Create a new reference to a container within the provided BlobStorage system.
   * @param storage The BlobStorage system that this container belongs to.
   * @param name The name of the container.
   */
  constructor(storage: BlobStorage, name: string) {
    this.storage = storage;
    this.name = name;
  }

  /**
   * Get the URL for this container.
   */
  public getURL(options: GetURLOptions = {}): string {
    return this.storage.getContainerURL(this.name, options);
  }

  /**
   * Get a reference to a blob from the context of this container.
   * @param blobName The name of the blob.
   */
  public getBlob(blobName: string): BlobStorageBlob {
    return this.storage.getBlob(new BlobPath(this.name, blobName));
  }

  /**
   * Get a reference to a block blob from the context of this container.
   * @param blockBlobName The name of the block blob.
   */
  public getBlockBlob(blockBlobName: string): BlobStorageBlockBlob {
    return this.storage.getBlockBlob(new BlobPath(this.name, blockBlobName));
  }

  /**
   * Get a reference to an append blob from the context of this container.
   * @param appendBlobName The name of the append blob.
   */
  public getAppendBlob(appendBlobName: string): BlobStorageAppendBlob {
    return this.storage.getAppendBlob(new BlobPath(this.name, appendBlobName));
  }

  /**
   * Get a prefix that can be used to perform blob operations relative to the provided path.
   * @param path The path to the prefix.
   */
  public getPrefix(path: string): BlobStoragePrefix {
    return this.storage.getPrefix(new BlobPath(this.name, path));
  }

  /**
   * Create this container. This method will return false when the container already exists.
   */
  public create(options: CreateContainerOptions = {}): Promise<boolean> {
    return this.storage.createContainer(this.name, options);
  }

  /**
   * Get whether or not this container exists.
   */
  public exists(): Promise<boolean> {
    return this.storage.containerExists(this.name);
  }

  /**
   * Get the access policy for this container.
   */
  public getAccessPolicy(): Promise<ContainerAccessPolicy> {
    return this.storage.getContainerAccessPolicy(this.name);
  }

  /**
   * Set the access policy for this container.
   * @param policy The new access policy for this container.
   */
  public setAccessPolicy(policy: ContainerAccessPolicy): Promise<unknown> {
    return this.storage.setContainerAccessPolicy(this.name, policy);
  }

  /**
   * Delete this container. This method returns whether or not the container was deleted. Returning
   * false means that the container didn't exist before this method was called.
   */
  public delete(): Promise<boolean> {
    return this.storage.deleteContainer(this.name);
  }

  /**
   * Create a block blob relative to this container with the provided name.
   * @param blockBlobName The name of the blob relative to this container.
   */
  public createBlockBlob(blockBlobName: string, options: BlobContentOptions = {}): Promise<boolean> {
    return this.storage.createBlockBlob(new BlobPath(this.name, blockBlobName), options);
  }

  /**
   * Create an append blob relative to this container with the provided name.
   * @param appendBlobName The name of the append blob relative to this container.
   */
  public createAppendBlob(appendBlobName: string, options: BlobContentOptions = {}): Promise<boolean> {
    return this.storage.createAppendBlob(new BlobPath(this.name, appendBlobName), options);
  }

  /**
   * Get whether or not a blob exists with the provided name relative to this container.
   * @param blobName The name of the blob relative to this container.
   */
  public blobExists(blobName: string): Promise<boolean> {
    return this.storage.blobExists(new BlobPath(this.name, blobName));
  }

  /**
   * Get the content type that has been assigned to the provided blob.
   * @param blobName The name of to the blob.
   */
  public getBlobContentType(blobName: string): Promise<string | undefined> {
    return this.storage.getBlobContentType(new BlobPath(this.name, blobName));
  }

  /**
   * Assign the provided content type to the provided blob.
   * @param blobName The name of the blob.
   * @param contentType The content type to assign to the provided blob.
   */
  public setBlobContentType(blobName: string, contentType: string): Promise<unknown> {
    return this.storage.setBlobContentType(new BlobPath(this.name, blobName), contentType);
  }

  /**
   * Get the contents of the blob with the provided name relative to this container.
   * @param blobName The name of the blob relative to this container.
   */
  public getBlobContentsAsString(blobName: string): Promise<string | undefined> {
    return this.storage.getBlobContentsAsString(new BlobPath(this.name, blobName));
  }

  /**
   * Set the contents of the blob with the provided name relative to this container.
   * @param blockBlobName The name of the blob relative to this container.
   * @param blobContents The contents to set.
   */
  public setBlockBlobContentsFromString(blockBlobName: string, blobContents: string): Promise<unknown> {
    return this.storage.setBlockBlobContentsFromString(new BlobPath(this.name, blockBlobName), blobContents);
  }

  /**
   * Add the provided blob contents to append to the append blob with the provided name relative to
   * this container.
   * @param appendBlobName The name of the append blob relative to this container.
   * @param blobContentsToAppend The contents to add the append blob.
   */
  public addToAppendBlobContentsFromString(appendBlobName: string, blobContentsToAppend: string): Promise<unknown> {
    return this.storage.addToAppendBlobContentsFromString(new BlobPath(this.name, appendBlobName), blobContentsToAppend);
  }

  /**
   * Delete the blob with the provided name relative to this container. This method returns whether
   * or not the blob was deleted. Returning false means that the blob didn't exist before this
   * method was called.
   * @param blobPath The path to the blob to delete relative to this container.
   */
  public deleteBlob(blobName: string): Promise<boolean> {
    return this.storage.deleteBlob(new BlobPath(this.name, blobName));
  }
}

/**
 * A prefix to other BlobStorageBlobs.
 */
export class BlobStoragePrefix {
  /**
   * The BlobStorage system that this prefix is targeting.
   */
  public readonly storage: BlobStorage;
  /**
   * The path of this prefix.
   */
  public readonly path: BlobPath;

  /**
   * Create a new prefix within the provided BlobStorage system.
   * @param storage The BlobStorage system that this prefix targets.
   * @param path The path of this prefix.
   */
  constructor(storage: BlobStorage, path: string | BlobPath) {
    this.storage = storage;
    this.path = typeof path === "string" ? BlobPath.parse(path) : path;
  }

  /**
   * Get the URL for this prefix.
   */
  public getURL(options: GetURLOptions = {}): string {
    return this.storage.getBlobURL(this.path, options);
  }

  /**
   * Get the container that this prefix belongs to.
   */
  public getContainer(): BlobStorageContainer {
    return this.storage.getContainer(this.path.containerName);
  }

  /**
   * Get a blob with the provided name relative to this prefix.
   * @param blobName The name to append to this prefix.
   */
  public getBlob(blobName: string): BlobStorageBlob {
    return this.getContainer().getBlob(this.path.blobName + blobName);
  }

  /**
   * Get a block blob with the provided name relative to this prefix.
   * @param blockBlobName The name to append to this prefix.
   */
  public getBlockBlob(blockBlobName: string): BlobStorageBlockBlob {
    return this.getContainer().getBlockBlob(this.path.blobName + blockBlobName);
  }

  /**
   * Get an append blob with the provided name relative to this prefix.
   * @param appendBlobName The name to append to this prefix.
   */
  public getAppendBlob(appendBlobName: string): BlobStorageAppendBlob {
    return this.getContainer().getAppendBlob(this.path.blobName + appendBlobName);
  }

  /**
   * Get a prefix that can be used to perform blob operations relative to the provided path.
   * @param path The path to the prefix.
   */
  public getPrefix(path: string): BlobStoragePrefix {
    return this.getContainer().getPrefix(this.path.blobName + path);
  }

  /**
   * Create a block blob relative to this prefix with the provided name.
   * @param blockBlobName The name of the block blob relative to this prefix.
   */
  public createBlockBlob(blockBlobName: string): Promise<boolean> {
    return this.getContainer().createBlockBlob(this.path.blobName + blockBlobName);
  }

  /**
   * Create a append blob relative to this prefix with the provided name.
   * @param appendBlobName The name of the append blob relative to this prefix.
   */
  public createAppendBlob(appendBlobName: string): Promise<boolean> {
    return this.getContainer().createAppendBlob(this.path.blobName + appendBlobName);
  }

  /**
   * Get whether or not a blob exists with the provided name relative to this prefix.
   * @param blobName The name of the blob relative to this prefix.
   */
  public blobExists(blobName: string): Promise<boolean> {
    return this.getContainer().blobExists(this.path.blobName + blobName);
  }

  /**
   * Get the contents of the blob with the provided name relative to this prefix.
   * @param blobName The name of the blob relative to this prefix.
   */
  public getBlobContentsAsString(blobName: string): Promise<string | undefined> {
    return this.getContainer().getBlobContentsAsString(this.path.blobName + blobName);
  }

  /**
   * Set the contents of the blob with the provided name relative to this prefix.
   * @param blockBlobName The name of the blob relative to this prefix.
   * @param blobContents The contents to set.
   */
  public setBlockBlobContentsFromString(blockBlobName: string, blobContents: string): Promise<unknown> {
    return this.getContainer().setBlockBlobContentsFromString(this.path.blobName + blockBlobName, blobContents);
  }

  /**
   * Add the provided blob contents to append to the append blob with the provided name relative to
   * this container.
   * @param appendBlobName The name of the append blob relative to this container.
   * @param blobContentsToAppend The contents to add the append blob.
   */
  public addToAppendBlobContentsFromString(appendBlobName: string, blobContentsToAppend: string): Promise<unknown> {
    return this.getContainer().addToAppendBlobContentsFromString(this.path.blobName + appendBlobName, blobContentsToAppend);
  }

  /**
   * Delete the blob with the provided name relative to this prefix. This method returns whether or
   * not the blob was deleted. Returning false means that the blob didn't exist before this method
   * was called.
   * @param blobPath The path to the blob to delete relative to this prefix.
   */
  public deleteBlob(blobName: string): Promise<boolean> {
    return this.getContainer().deleteBlob(this.path.blobName + blobName);
  }
}

/**
 * Options that can be applied when updating a blob's contents.
 */
export interface BlobContentOptions {
  /**
   * The MIME content type that will be associated with this blob's content.
   */
  contentType?: string;
}

/**
 * An class that describes the common functions between the different types of blobs in a
 * BlobStorage system.
 */
export class BlobStorageBlob {
  /**
   * The BlobStorage system that this blob came from.
   */
  public readonly storage: BlobStorage;
  /**
   * The path to this blob.
   */
  public readonly path: BlobPath;

  /**
   * Create a new reference to a block blob within the provided BlobStorage system.
   * @param storage The BlobStorage system that this blob belongs to.
   * @param path The path to this block blob.
   */
  constructor(storage: BlobStorage, path: string | BlobPath) {
    this.storage = storage;
    this.path = typeof path === "string" ? BlobPath.parse(path) : path;
  }

  /**
   * Get the URL for this blob.
   */
  public getURL(options: GetURLOptions = {}): string {
    return this.storage.getBlobURL(this.path, options);
  }

  /**
   * Get whether or not this blob exists.
   */
  public exists(): Promise<boolean> {
    return this.storage.blobExists(this.path);
  }

  /**
   * Delete this blob. This method returns whether or not the blob was deleted. Returning false
   * means that the blob didn't exist before this method was called.
   */
  public delete(): Promise<boolean> {
    return this.storage.deleteBlob(this.path);
  }

  /**
   * Get the contents of this blob as a UTF-8 decoded string.
   */
  public getContentsAsString(): Promise<string | undefined> {
    return this.storage.getBlobContentsAsString(this.path);
  }

  /**
   * Get the content type that has been assigned to this blob.
   */
  public getContentType(): Promise<string | undefined> {
    return this.storage.getBlobContentType(this.path);
  }

  /**
   * Assign the provided content type to this blob.
   * @param contentType The content type to assign to this blob.
   */
  public setContentType(contentType: string): Promise<unknown> {
    return this.storage.setBlobContentType(this.path, contentType);
  }
}

/**
 * A class that can be used to interact with a block blob in a BlobStorage system.
 */
export class BlobStorageBlockBlob extends BlobStorageBlob {
  /**
   * Create this block blob. This method will return false when the block blob already exists.
   */
  public create(options: BlobContentOptions = {}): Promise<boolean> {
    return this.storage.createBlockBlob(this.path, options);
  }

  /**
   * Set the contents of this block blob to be the provided UTF-8 encoded string.
   * @param blockBlobContents The contents to set. This will be UTF-8 encoded.
   */
  public setContentsFromString(blockBlobContents: string, options: BlobContentOptions = {}): Promise<unknown> {
    return this.storage.setBlockBlobContentsFromString(this.path, blockBlobContents, options);
  }

  /**
   * Upload the file at the provided path to this block blob.
   * @param filePath The path to the file that contains the block blob's contents.
   * @param options Options that will be applied to the block blob.
   */
  public setContentsFromFile(filePath: string, options: BlobContentOptions = {}): Promise<unknown> {
    return this.storage.setBlockBlobContentsFromFile(this.path, filePath, options);
  }
}

/**
 * A class that can be used to interact with an append blob in a BlobStorage system.
 */
export class BlobStorageAppendBlob extends BlobStorageBlob {
  /**
   * Create this append blob. This method will return false when the append blob already exists.
   */
  public create(options: BlobContentOptions = {}): Promise<boolean> {
    return this.storage.createAppendBlob(this.path, options);
  }

  /**
   * Append the provided UTF-8 encoded contents to this append blob.
   * @param contentsToAppend The contents to append to this append blob. This will be UTF-8 encoded.
   */
  public addToContents(contentsToAppend: string): Promise<unknown> {
    return this.storage.addToAppendBlobContentsFromString(this.path, contentsToAppend);
  }
}

export interface GetURLOptions {
  /**
   * Whether or not to include the SAS token when getting the URL.
   */
  sasToken?: boolean;
}

/**
 * A class for interacting with a blob storage system.
 */
export abstract class BlobStorage {
  /**
   * Get a reference to a blob at the provided path. This will not modify the BlobStorage system at
   * all. This simply gets a reference to the blob.
   * @param blobPath The path to the blob.
   */
  public getBlob(blobPath: string | BlobPath): BlobStorageBlob {
    return new BlobStorageBlob(this, blobPath);
  }

  /**
   * Get a reference to a block blob at the provided path. This will not modify the BlobStorage
   * system at all. This simply gets a reference to the block blob.
   * @param blockBlobPath The path to the block blob.
   */
  public getBlockBlob(blockBlobPath: string | BlobPath): BlobStorageBlockBlob {
    return new BlobStorageBlockBlob(this, blockBlobPath);
  }

  /**
   * Get a reference to an append blob at the provided path. This will not modify the BlobStorage
   * system at all. This simply gets a reference to the append blob.
   * @param appendBlobPath The path to the blob.
   */
  public getAppendBlob(appendBlobPath: string | BlobPath): BlobStorageAppendBlob {
    return new BlobStorageAppendBlob(this, appendBlobPath);
  }

  /**
   * Get a prefix that can be used to perform blob operations relative to the provided prefix.
   * @param prefix The path to the prefix.
   */
  public getPrefix(prefix: string | BlobPath): BlobStoragePrefix {
    return new BlobStoragePrefix(this, prefix);
  }

  /**
   * Get a reference to a container with the provided name. This will not modify the BlobStorage
   * system at all. This simply gets a reference to the container.
   * @param containerName The name of the container.
   */
  public getContainer(containerName: string): BlobStorageContainer {
    return new BlobStorageContainer(this, containerName);
  }

  /**
   * Get the URL to this storage account.
   */
  public abstract getURL(options?: GetURLOptions): string;

  /**
   * Get the URL to the provided container.
   * @param containerName The name of the container.
   */
  public abstract getContainerURL(containerName: string, options?: GetURLOptions): string;

  /**
   * Get the URL to the provided blob.
   * @param blobPath The path to the blob.
   */
  public abstract getBlobURL(blobPath: string | BlobPath, options?: GetURLOptions): string;

  /**
   * Create a block blob at the provided blockBlobPath. This method will return false when the block
   * blob already exists.
   * @param blockBlobPath The path to the block blob to create.
   */
  public abstract createBlockBlob(blockBlobPath: string | BlobPath, options?: BlobContentOptions): Promise<boolean>;

  /**
   * Create an append blob at the provided appendBlobPath. This method will return false when the
   * append blob already exists.
   * @param appendBlobPath The path to the append blob to create.
   */
  public abstract createAppendBlob(appendBlobPath: string | BlobPath, options?: BlobContentOptions): Promise<boolean>;

  /**
   * Get whether or not the blob at the provided path exists.
   * @param blobPath The path to the blob.
   */
  public abstract blobExists(blobPath: string | BlobPath): Promise<boolean>;

  /**
   * Get the contents of the blob at the provided path as a UTF-8 decoded string.
   * @param blobPath The path to the blob.
   */
  public abstract getBlobContentsAsString(blobPath: string | BlobPath): Promise<string | undefined>;

  /**
   * Set the contents of the block blob at the provided path to be the provided UTF-8 encoded
   * string.
   * @param blockBlobPath The path to the block blob.
   * @param blockBlobContents The contents to set. This will be UTF-8 encoded.
   */
  public abstract setBlockBlobContentsFromString(blockBlobPath: string | BlobPath, blockBlobContents: string, options?: BlobContentOptions): Promise<unknown>;

  /**
   * Upload the file at the provided path to the provided block blob path.
   * @param blockBlobPath The path to the block blob.
   * @param filePath The path to the file that contains the blob's contents.
   * @param options Options that will be applied to the blob.
   */
  public abstract setBlockBlobContentsFromFile(blockBlobPath: string | BlobPath, filePath: string, options?: BlobContentOptions): Promise<unknown>;

  /**
   * Add the provided blob contents to append to the append blob with the provided name relative to
   * this container.
   * @param appendBlobName The name of the append blob relative to this container.
   * @param blobContentsToAppend The contents to add the append blob.
   */
  public abstract addToAppendBlobContentsFromString(appendBlobPath: string | BlobPath, blobContentsToAppend: string): Promise<unknown>;

  /**
   * Get the content type that has been assigned to the provided blob.
   * @param blobPath The path to the blob.
   */
  public abstract getBlobContentType(blobPath: string | BlobPath): Promise<string | undefined>;

  /**
   * Assign the provided content type to the provided blob.
   * @param blobPath The path to the blob.
   * @param contentType The content type to assign to the provided blob.
   */
  public abstract setBlobContentType(blobPath: string | BlobPath, contentType: string): Promise<unknown>;

  /**
   * Delete the blob at the provided blobPath. This method returns whether or not the blob was
   * deleted. Returning false means that the blob didn't exist before this method was called.
   * @param blobPath The path to the blob to delete.
   */
  public abstract deleteBlob(blobPath: string | BlobPath): Promise<boolean>;

  /**
   * Create a container with the provided name.
   * @param containerName The name of the container to create.
   */
  public abstract createContainer(containerName: string, options?: CreateContainerOptions): Promise<boolean>;

  /**
   * Get whether or not a container with the provided name exists.
   * @param containerName The name of the container.
   */
  public abstract containerExists(containerName: string): Promise<boolean>;

  /**
   * Get the access policy for the provided container.
   * @param containerName The name of the container.
   */
  public abstract getContainerAccessPolicy(containerName: string): Promise<ContainerAccessPolicy>;

  /**
   * Set the access permissions for the provided container.
   * @param containerName The name of the container.
   */
  public abstract setContainerAccessPolicy(containerName: string, policy: ContainerAccessPolicy): Promise<unknown>;

  /**
   * Delete the container with the provided name. This method returns whether or not the container
   * was deleted. Returning false means that the container didn't exist before this method was
   * called.
   * @param containerName The name of the container to delete.
   */
  public abstract deleteContainer(containerName: string): Promise<boolean>;

  /**
   * Get all of the containers that exist in this BlobStorage system.
   */
  public abstract listContainers(): Promise<BlobStorageContainer[]>;
}

interface InMemoryContainer {
  name: string;
  blobs: StringMap<InMemoryBlob>;
  accessPolicy: ContainerAccessPolicy;
}

interface InMemoryBlob {
  contents: string;
  contentType?: string;
  blobType: "block" | "append";
}

/**
 * A BlobStorage system that is stored in memory.
 */
export class InMemoryBlobStorage extends BlobStorage {
  private readonly containers: StringMap<InMemoryContainer> = {};

  private getInMemoryContainer(containerName: string | BlobPath): Promise<InMemoryContainer> {
    containerName = typeof containerName === "string" ? containerName : containerName.containerName;

    let result: Promise<InMemoryContainer>;
    if (!containerName || containerName !== containerName.toLowerCase()) {
      result = Promise.reject(new Error("InvalidResourceName: The specifed resource name contains invalid characters."));
    } else {
      const container: InMemoryContainer | undefined = this.containers[containerName];
      if (!container) {
        result = Promise.reject(new Error("ContainerNotFound: The specified container does not exist."));
      } else {
        result = Promise.resolve(container);
      }
    }
    return result;
  }

  private getInMemoryBlob(blobPath: string | BlobPath): Promise<InMemoryBlob> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;
    return this.getInMemoryContainer(blobPath.containerName)
      .then((container: InMemoryContainer) => {
        return validateBlobName(blobPath)
          .then(() => blobName in container.blobs
            ? Promise.resolve(container.blobs[blobName])
            : Promise.reject(new Error("BlobNotFound: The specified blob does not exist.")));
      });
  }

  public getURL(): string {
    return "https://fake.storage.com/";
  }

  public getContainerURL(containerName: string): string {
    return `${this.getURL()}${containerName}`;
  }

  public getBlobURL(blobPath: string | BlobPath): string {
    blobPath = BlobPath.parse(blobPath);
    return `${this.getContainerURL(blobPath.containerName)}/${blobPath.blobName}`;
  }

  private createInMemoryBlob(blobPath: string | BlobPath, blobType: "block" | "append", options: BlobContentOptions = {}): Promise<boolean> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;
    return this.getInMemoryContainer(blobPath)
      .then((container: InMemoryContainer) => {
        let result: Promise<boolean>;
        if (!blobName) {
          result = Promise.reject(new Error("InvalidUri: The requested URI does not represent any resource on the server."));
        } else if (blobName in container.blobs) {
          result = Promise.resolve(false);
        } else {
          result = Promise.resolve(true);
          container.blobs[blobName] = {
            contents: "",
            contentType: options.contentType || "application/octet-stream",
            blobType,
          };
        }
        return result;
      });
  }

  public createBlockBlob(blobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<boolean> {
    return this.createInMemoryBlob(blobPath, "block", options);
  }

  public createAppendBlob(appendBlobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<boolean> {
    return this.createInMemoryBlob(appendBlobPath, "append", options);
  }

  public blobExists(blobPath: string | BlobPath): Promise<boolean> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;
    return this.getInMemoryContainer(blobPath)
      .then((container: InMemoryContainer) => {
        return blobName in container.blobs;
      })
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerNotFound", false));
  }

  public getBlobContentsAsString(blobPath: string | BlobPath): Promise<string | undefined> {
    return this.getInMemoryBlob(blobPath)
      .then((blob: InMemoryBlob) => blob.contents.toString())
      .catch((error: Error) => {
        return error.message.includes("ContainerNotFound")
          ? Promise.reject(new Error("BlobNotFound: The specified blob does not exist."))
          : Promise.reject(error);
      });
  }

  public setBlockBlobContentsFromString(blobPath: string | BlobPath, blobContents: string, options: BlobContentOptions = {}): Promise<unknown> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;

    return this.getInMemoryContainer(blobPath)
      .then((container: InMemoryContainer) => {
        const blob: InMemoryBlob | undefined = container.blobs[blobName];
        if (!blob) {
          container.blobs[blobName] = {
            contents: blobContents,
            contentType: options.contentType || "application/octet-stream",
            blobType: "block",
          };
        } else {
          blob.contents = blobContents;
          blob.contentType = options.contentType || "application/octet-stream";
        }
      });
  }

  public setBlockBlobContentsFromFile(blockBlobPath: string | BlobPath, filePath: string, options: BlobContentOptions = {}): Promise<unknown> {
    blockBlobPath = BlobPath.parse(blockBlobPath);
    const blockBlobName: string = blockBlobPath.blobName;

    return this.getInMemoryContainer(blockBlobPath)
      .then((container: InMemoryContainer) => {
        const blockBlob: InMemoryBlob | undefined = container.blobs[blockBlobName];
        if (!blockBlob) {
          container.blobs[blockBlobName] = {
            contents: fs.readFileSync(filePath, "utf8"),
            contentType: options.contentType || "application/octet-stream",
            blobType: "block",
          };
        } else {
          blockBlob.contents = fs.readFileSync(filePath, "utf8");
          blockBlob.contentType = options.contentType || "application/octet-stream";
        }
      });
  }

  public addToAppendBlobContentsFromString(appendBlobPath: string | BlobPath, blobContentsToAppend: string): Promise<unknown> {
    return this.getInMemoryBlob(appendBlobPath)
      .then((appendBlob: InMemoryBlob) => {
        appendBlob.contents += blobContentsToAppend;
      });
  }

  public getBlobContentType(blobPath: string | BlobPath): Promise<string | undefined> {
    return this.getInMemoryBlob(blobPath)
      .then((blob: InMemoryBlob) => blob.contentType);
  }

  public setBlobContentType(blobPath: string | BlobPath, contentType: string): Promise<unknown> {
    return this.getInMemoryBlob(blobPath)
      .then((blob: InMemoryBlob) => {
        blob.contentType = contentType;
      });
  }

  public deleteBlob(blobPath: string | BlobPath): Promise<boolean> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;

    return validateBlobName(blobPath)
      .then(() => {
        return this.getInMemoryContainer(blobPath)
          .then((container: InMemoryContainer) => {
            let result = false;
            if (blobName in container.blobs) {
              result = true;
              delete container.blobs[blobName];
            }
            return result;
          });
      });
  }

  public createContainer(containerName: string, options: CreateContainerOptions = {}): Promise<boolean> {
    return this.getInMemoryContainer(containerName)
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerNotFound", undefined))
      .then(() => {
        const result = !(containerName in this.containers);
        if (result) {
          this.containers[containerName] = {
            name: containerName,
            blobs: {},
            accessPolicy: options.accessPolicy || "private"
          };
        }
        return result;
      });
  }

  public containerExists(containerName: string): Promise<boolean> {
    return this.getInMemoryContainer(containerName)
      .then(() => true)
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerNotFound", false));
  }

  public getContainerAccessPolicy(containerName: string): Promise<ContainerAccessPolicy> {
    return this.getInMemoryContainer(containerName)
      .then((container: InMemoryContainer) => container.accessPolicy);
  }

  public setContainerAccessPolicy(containerName: string, permissions: ContainerAccessPolicy): Promise<unknown> {
    return this.getInMemoryContainer(containerName)
      .then((container: InMemoryContainer) => {
        container.accessPolicy = permissions;
      });
  }

  public deleteContainer(containerName: string): Promise<boolean> {
    return this.getInMemoryContainer(containerName)
      .then(() => {
        delete this.containers[containerName];
        return true;
      })
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerNotFound", false));
  }

  public listContainers(): Promise<BlobStorageContainer[]> {
    const result: BlobStorageContainer[] = [];
    for (const containerName of Object.keys(this.containers)) {
      result.push(this.getContainer(containerName));
    }
    return Promise.resolve(result);
  }
}

/**
 * Validate that the provided BlobPath's blobName is defined and not-empty.
 * @param blobPath The blob path to validate.
 */
export function validateBlobName(blobPath: string | BlobPath): Promise<void> {
  blobPath = BlobPath.parse(blobPath);
  return !blobPath.blobName
    ? Promise.reject(new Error("InvalidUri: The requested URI does not represent any resource on the server."))
    : Promise.resolve();
}

export function getAzureContainerAccessPermissions(permissions?: ContainerAccessPolicy): "container" | "blob" | undefined {
  return permissions && permissions !== "private" ? permissions : undefined;
}

/**
 * A BlobStorage system that uses Azure Blob Storage to store data.
 */
export class AzureBlobStorage extends BlobStorage {
  private readonly url: string;
  private readonly serviceUrl: azure.ServiceURL;

  constructor(storageAccountUrl: string | URLBuilder, credentials?: azure.Credential) {
    super();

    if (!credentials) {
      credentials = new azure.AnonymousCredential();
    }

    this.url = storageAccountUrl.toString();

    const pipeline: azure.Pipeline = azure.StorageURL.newPipeline(credentials);
    this.serviceUrl = new azure.ServiceURL(this.url, pipeline);
  }

  private getAzureContainerURL(containerName: string): azure.ContainerURL {
    return azure.ContainerURL.fromServiceURL(this.serviceUrl, containerName);
  }

  private getBlockBlobURL(blockBlobPath: string | BlobPath): azure.BlockBlobURL {
    blockBlobPath = BlobPath.parse(blockBlobPath);
    const containerUrl: azure.ContainerURL = this.getAzureContainerURL(blockBlobPath.containerName);
    return azure.BlockBlobURL.fromContainerURL(containerUrl, blockBlobPath.blobName);
  }

  private getAppendBlobURL(appendBlobPath: string | BlobPath): azure.AppendBlobURL {
    appendBlobPath = BlobPath.parse(appendBlobPath);
    const containerUrl: azure.ContainerURL = this.getAzureContainerURL(appendBlobPath.containerName);
    return azure.AppendBlobURL.fromContainerURL(containerUrl, appendBlobPath.blobName);
  }

  public getURL(options: GetURLOptions = {}): string {
    let result: string = this.url;
    if (!options.sasToken) {
      result = URLBuilder.removeQuery(result).toString();
    }
    return this.url;
  }

  public getContainerURL(containerName: string, options: GetURLOptions = {}): string {
    const containerUrl: azure.ContainerURL = this.getAzureContainerURL(containerName);
    const url: URLBuilder = URLBuilder.parse(containerUrl.url);
    const path: string | undefined = url.getPath();
    if (path) {
      url.setPath(replaceAll(path, "%2F", "/"));
    }
    if (!options.sasToken) {
      url.removeQuery();
    }
    return url.toString();
  }

  public getBlobURL(blobPath: string | BlobPath, options: GetURLOptions = {}): string {
    const blobUrl: azure.BlockBlobURL = this.getBlockBlobURL(blobPath);
    const url: URLBuilder = URLBuilder.parse(blobUrl.url);
    const path: string | undefined = url.getPath();
    if (path) {
      url.setPath(replaceAll(path, "%2F", "/"));
    }
    if (!options.sasToken) {
      url.removeQuery();
    }
    return url.toString();
  }

  public blobExists(blobPath: string | BlobPath): Promise<boolean> {
    return this.getBlockBlobURL(blobPath)
      .getProperties(azure.Aborter.none)
      .then(() => true)
      .catch((error: Error) => resolveIfErrorStatusCodeEquals(error, 404, false));
  }

  public getBlobContentsAsString(blobPath: string | BlobPath): Promise<string | undefined> {
    return validateBlobName(blobPath)
      .then(() => {
        return this.getBlockBlobURL(blobPath)
          .download(azure.Aborter.none, 0, undefined)
          .then((blobDownloadResponse: azure.Models.BlobDownloadResponse) => {
            return blobDownloadResponse.readableStreamBody;
          })
          .then(readEntireString)
          .catch((error: Error) => resolveIfErrorStatusCodeEquals(error, 404, Promise.reject(new Error("BlobNotFound: The specified blob does not exist."))));
      });
  }

  public setBlockBlobContentsFromString(blockBlobPath: string | BlobPath, blockBlobContents: string, options: BlobContentOptions = {}): Promise<unknown> {
    return this.getBlockBlobURL(blockBlobPath)
      .upload(azure.Aborter.none, blockBlobContents, Buffer.byteLength(blockBlobContents, "utf-8"), {
        blobHTTPHeaders: {
          blobContentType: options.contentType
        }
      });
  }

  public setBlockBlobContentsFromFile(blobPath: string | BlobPath, filePath: string, options?: BlobContentOptions | undefined): Promise<unknown> {
    return getFileLengthInBytes(filePath)
      .then((fileLengthInBytes: number) => {
        return this.getBlockBlobURL(blobPath)
          .upload(azure.Aborter.none, (() => fs.createReadStream(filePath)), fileLengthInBytes, {
            blobHTTPHeaders: {
              blobContentType: options && options.contentType
            }
          });
      });
  }

  public addToAppendBlobContentsFromString(appendBlobPath: string | BlobPath, blobContentsToAppend: string): Promise<unknown> {
    const buffer = new Buffer(blobContentsToAppend, "utf8");
    return this.getAppendBlobURL(appendBlobPath)
      .appendBlock(azure.Aborter.none, buffer, buffer.byteLength);
  }

  public getBlobContentType(blobPath: string | BlobPath): Promise<string | undefined> {
    blobPath = BlobPath.parse(blobPath);
    const containerName: string = blobPath.containerName;
    return this.getBlockBlobURL(blobPath)
      .getProperties(azure.Aborter.none)
      .then((properties: azure.Models.BlobGetPropertiesResponse) => properties.contentType)
      .catch((error: Error) => {
        return (error as any).statusCode !== 404
          ? Promise.reject(error)
          : this.containerExists(containerName)
            .then((exists: boolean) =>
              Promise.reject(new Error(!exists
                ? "ContainerNotFound: The specified container does not exist."
                : "BlobNotFound: The specified blob does not exist.")));
      });
  }

  public setBlobContentType(blobPath: string | BlobPath, contentType: string): Promise<unknown> {
    return validateBlobName(blobPath)
      .then(() => {
        return this.getBlockBlobURL(blobPath)
          .setHTTPHeaders(azure.Aborter.none, {
            blobContentType: contentType
          });
      });
  }

  public containerExists(containerName: string): Promise<boolean> {
    return this.getAzureContainerURL(containerName)
      .getProperties(azure.Aborter.none)
      .then(() => true)
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerNotFound", false));
  }

  public getContainerAccessPolicy(containerName: string): Promise<ContainerAccessPolicy> {
    return this.getAzureContainerURL(containerName)
      .getAccessPolicy(azure.Aborter.none)
      .then((accessPolicy: azure.ContainerGetAccessPolicyResponse) => accessPolicy.blobPublicAccess || "private");
  }

  public setContainerAccessPolicy(containerName: string, permissions: ContainerAccessPolicy): Promise<unknown> {
    return this.getAzureContainerURL(containerName)
      .setAccessPolicy(azure.Aborter.none, getAzureContainerAccessPermissions(permissions));
  }

  public createBlockBlob(blockBlobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<boolean> {
    return validateBlobName(blockBlobPath)
      .then(() => {
        return this.getBlockBlobURL(blockBlobPath)
          .upload(azure.Aborter.none, "", 0, {
            accessConditions: {
              modifiedAccessConditions: {
                ifNoneMatch: "*"
              }
            },
            blobHTTPHeaders: {
              blobContentType: options.contentType
            }
          })
          .then(() => true)
          .catch((error: Error) => resolveIfErrorMessageContains(error, "BlobAlreadyExists", false));
      });
  }

  public createAppendBlob(appendBlobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<boolean> {
    return validateBlobName(appendBlobPath)
      .then(() => {
        return this.getAppendBlobURL(appendBlobPath)
          .create(azure.Aborter.none, {
            accessConditions: {
              modifiedAccessConditions: {
                ifNoneMatch: "*"
              }
            },
            blobHTTPHeaders: {
              blobContentType: options.contentType
            }
          })
          .then(() => true)
          .catch((error: Error) => resolveIfErrorMessageContains(error, "BlobAlreadyExists", false));
      });
  }

  public deleteBlob(blobPath: string | BlobPath): Promise<boolean> {
    return validateBlobName(blobPath)
      .then(() => {
        return this.getBlockBlobURL(blobPath)
          .delete(azure.Aborter.none)
          .then(() => true)
          .catch((error: Error) => resolveIfErrorMessageContains(error, "BlobNotFound", false));
      });
  }

  public createContainer(containerName: string, options?: CreateContainerOptions): Promise<boolean> {
    return this.getAzureContainerURL(containerName)
      .create(azure.Aborter.none, {
        access: getAzureContainerAccessPermissions(options && options.accessPolicy)
      })
      .then(() => true)
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerAlreadyExists", false));
  }

  public deleteContainer(containerName: string): Promise<boolean> {
    return this.getAzureContainerURL(containerName)
      .delete(azure.Aborter.none)
      .then(() => true)
      .catch((error: Error) => resolveIfErrorStatusCodeEquals(error, 404, false));
  }

  public async listContainers(): Promise<BlobStorageContainer[]> {
    const result: BlobStorageContainer[] = [];

    let listContainersResponse: azure.Models.ListContainersSegmentResponse = await this.serviceUrl.listContainersSegment(azure.Aborter.none);
    result.push(...map(listContainersResponse.containerItems, (containerItem: azure.Models.ContainerItem) => new BlobStorageContainer(this, containerItem.name)));

    while (listContainersResponse.nextMarker) {
      listContainersResponse = await this.serviceUrl.listContainersSegment(azure.Aborter.none, listContainersResponse.nextMarker);
      result.push(...map(listContainersResponse.containerItems, (containerItem: azure.Models.ContainerItem) => new BlobStorageContainer(this, containerItem.name)));
    }

    return result;
  }
}

function resolveIfErrorStatusCodeEquals<T>(error: Error, statusCode: number, resolvedValue: T | Promise<T>): Promise<T> {
  const errorAny: any = error;
  return typeof errorAny.statusCode === "number" && errorAny.statusCode === statusCode
    ? Promise.resolve(resolvedValue)
    : Promise.reject(error);
}

function resolveIfErrorMessageContains<T>(error: Error, substring: string, resolvedValue: T | Promise<T>): Promise<T> {
  return error.message.indexOf(substring) !== -1
    ? Promise.resolve(resolvedValue)
    : Promise.reject(error);
}
