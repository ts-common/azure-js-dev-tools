/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Aborter, AnonymousCredential, AppendBlobURL, BlockBlobURL, ContainerGetAccessPolicyResponse, ContainerURL, Credential, generateBlobSASQueryParameters, IBlobSASSignatureValues, Models, Pipeline, SASQueryParameters, ServiceURL, SharedKeyCredential, StorageURL } from "@azure/storage-blob";
import * as fs from "fs";
import { map } from "./arrays";
import { readEntireString, StringMap } from "./common";
import { URLBuilder } from "./url";
import { BlockBlobUploadResponse, AppendBlobAppendBlockResponse } from "@azure/storage-blob/typings/lib/generated/lib/models";

const defaultEncoding = "utf8";

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
    fs.lstat(filePath, (error: NodeJS.ErrnoException | null, stats: fs.Stats) => {
      if (error) {
        reject(error);
      } else {
        resolve(stats.size);
      }
    });
  });
}

/**
 * An optional argument interface that adds an etag to a request.
 */
export interface ETagOptions {
  /**
   * The etag that the request must be matched to in order for the operation to occur.
   */
  etag?: string;
}

/**
 * A result that has an etag property.
 */
export interface ETagResult {
  /**
   * A version identifier for a BlobStorage result.
   */
  etag?: string;
}

/**
 * The result of attempting to create a blob.
 */
export interface CreateBlobResult extends ETagResult {
  /**
   * Whether or not the blob was created.
   */
  created: boolean;
}

/**
 * The result of getting a blob's contents.
 */
export interface BlobContentsResult extends ETagResult {
  /**
   * The contents of the blob.
   */
  contents: string;
}

/**
 * The properties associated with a blob.
 */
export interface BlobPropertiesResult extends ETagResult {
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
   * Concatenate the provided blobName onto this BlobPath.
   * @param blobName The blobName to concatenate to this BlobPath.
   */
  public concatenate(blobName: string): BlobPath {
    return !blobName ? this : new BlobPath(this.containerName, this.blobName + blobName);
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
    } else if (!blobPath) {
      result = new BlobPath("", "");
    } else {
      if (blobPath.startsWith("/")) {
        blobPath = blobPath.substring(1);
      }
      const firstSlashIndex: number = blobPath.indexOf("/");
      if (firstSlashIndex === -1) {
        result = new BlobPath(blobPath, "");
      } else {
        result = new BlobPath(blobPath.substring(0, firstSlashIndex), blobPath.substring(firstSlashIndex + 1));
      }
    }
    return result;
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
  public getURL(options: GetPrefixURLOptions = {}): string {
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
    return this.storage.getBlob(this.path.concatenate(blobName));
  }

  /**
   * Get a block blob with the provided name relative to this prefix.
   * @param blockBlobName The name to append to this prefix.
   */
  public getBlockBlob(blockBlobName: string): BlobStorageBlockBlob {
    return this.storage.getBlockBlob(this.path.concatenate(blockBlobName));
  }

  /**
   * Get an append blob with the provided name relative to this prefix.
   * @param appendBlobName The name to append to this prefix.
   */
  public getAppendBlob(appendBlobName: string): BlobStorageAppendBlob {
    return this.storage.getAppendBlob(this.path.concatenate(appendBlobName));
  }

  /**
   * Get a prefix that can be used to perform blob operations relative to the provided path.
   * @param blobName The path to the prefix.
   */
  public getPrefix(blobName: string): BlobStoragePrefix {
    return !blobName ? this : this.storage.getPrefix(this.path.concatenate(blobName));
  }

  /**
   * Create a block blob relative to this container with the provided name.
   * @param blockBlobName The name of the blob relative to this container.
   */
  public createBlockBlob(blockBlobName: string, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    return this.storage.createBlockBlob(this.path.concatenate(blockBlobName), options);
  }

  /**
   * Create an append blob relative to this container with the provided name.
   * @param appendBlobName The name of the append blob relative to this container.
   */
  public createAppendBlob(appendBlobName: string, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    return this.storage.createAppendBlob(this.path.concatenate(appendBlobName), options);
  }

  /**
   * Get whether or not a blob exists with the provided name relative to this prefix.
   * @param blobName The name of the blob relative to this prefix.
   */
  public blobExists(blobName: string): Promise<boolean> {
    return this.storage.blobExists(this.path.concatenate(blobName));
  }

  /**
   * Get the properties for the blob at the provided path.
   * @param blobPath The path to the blob.
   */
  public getBlobProperties(blobName: string): Promise<BlobPropertiesResult> {
    return this.storage.getBlobProperties(this.path.concatenate(blobName));
  }

  /**
   * Get the content type that has been assigned to the provided blob.
   * @param blobName The name of to the blob.
   */
  public getBlobContentType(blobName: string): Promise<string | undefined> {
    return this.storage.getBlobContentType(this.path.concatenate(blobName));
  }

  /**
   * Assign the provided content type to the provided blob.
   * @param blobName The name of the blob.
   * @param contentType The content type to assign to the provided blob.
   */
  public setBlobContentType(blobName: string, contentType: string): Promise<unknown> {
    return this.storage.setBlobContentType(this.path.concatenate(blobName), contentType);
  }

  /**
   * Get the contents of the blob with the provided name relative to this prefix.
   * @param blobName The name of the blob relative to this prefix.
   */
  public getBlobContentsAsString(blobName: string): Promise<BlobContentsResult> {
    return this.storage.getBlobContentsAsString(this.path.concatenate(blobName));
  }

  /**
   * Set the contents of the blob with the provided name relative to this prefix.
   * @param blockBlobName The name of the blob relative to this prefix.
   * @param blobContents The contents to set.
   */
  public setBlockBlobContentsFromString(blockBlobName: string, blobContents: string, options?: BlobContentOptions): Promise<ETagResult> {
    return this.storage.setBlockBlobContentsFromString(this.path.concatenate(blockBlobName), blobContents, options);
  }

  /**
   * Add the provided blob contents to append to the append blob with the provided name relative to
   * this container.
   * @param appendBlobName The name of the append blob relative to this container.
   * @param blobContentsToAppend The contents to add the append blob.
   */
  public addToAppendBlobContentsFromString(appendBlobName: string, blobContentsToAppend: string, options?: ETagOptions): Promise<ETagResult> {
    return this.storage.addToAppendBlobContentsFromString(this.path.concatenate(appendBlobName), blobContentsToAppend, options);
  }

  /**
   * Delete the blob with the provided name relative to this prefix. This method returns whether or
   * not the blob was deleted. Returning false means that the blob didn't exist before this method
   * was called.
   * @param blobPath The path to the blob to delete relative to this prefix.
   */
  public deleteBlob(blobName: string): Promise<boolean> {
    return this.storage.deleteBlob(this.path.concatenate(blobName));
  }
}

export class BlobStorageContainer extends BlobStoragePrefix {
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
    super(storage, new BlobPath(name, ""));

    this.name = name;
  }

  /**
   * Get the URL for this prefix.
   */
  public getURL(options: GetURLOptions = {}): string {
    return this.storage.getContainerURL(this.name, options);
  }

  /**
   * Get the container that this prefix belongs to.
   */
  public getContainer(): BlobStorageContainer {
    return this;
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
}

/**
 * Options that can be applied when updating a blob's contents.
 */
export interface BlobContentOptions extends ETagOptions {
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
   * Get the container that contains this blob.
   */
  public getContainer(): BlobStorageContainer {
    return this.storage.getContainer(this.path.containerName);
  }

  /**
   * Get whether or not this blob exists.
   */
  public exists(): Promise<boolean> {
    return this.storage.blobExists(this.path);
  }

  /**
   * Get the properties for this blob.
   */
  public getProperties(): Promise<BlobPropertiesResult> {
    return this.storage.getBlobProperties(this.path);
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
  public getContentsAsString(): Promise<BlobContentsResult> {
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
  public create(options: BlobContentOptions = {}): Promise<CreateBlobResult> {
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
  public create(options: BlobContentOptions = {}): Promise<CreateBlobResult> {
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

export interface SASTokenPermissions {
  read?: boolean;
  add?: boolean;
  create?: boolean;
  write?: boolean;
  delete?: boolean;
}

/**
 * Options that can be used to create a SAS token.
 */
export interface CreateSASTokenOptions {
  /**
   * The time that the SAS token will start being valid.
   */
  startTime?: Date;
  /**
   * The time that the SAS token will stop being valid.
   */
  endTime: Date;
  /**
   * The permissions that will be permitted to the SAS token.
   */
  permissions?: SASTokenPermissions;
}

export interface GetURLOptions {
  /**
   * Whether or not to include the SAS token when getting the URL.
   */
  sasToken?: boolean | CreateSASTokenOptions;
  /**
   * Whether or not to encode the blob name in the URL (when there is a blob name).
   */
  encodeBlobName?: boolean;
}

export interface GetPrefixURLOptions extends GetURLOptions {
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
  public abstract createBlockBlob(blockBlobPath: string | BlobPath, options?: BlobContentOptions): Promise<CreateBlobResult>;

  /**
   * Create an append blob at the provided appendBlobPath. This method will return false when the
   * append blob already exists.
   * @param appendBlobPath The path to the append blob to create.
   */
  public abstract createAppendBlob(appendBlobPath: string | BlobPath, options?: BlobContentOptions): Promise<CreateBlobResult>;

  /**
   * Get whether or not the blob at the provided path exists.
   * @param blobPath The path to the blob.
   */
  public abstract blobExists(blobPath: string | BlobPath): Promise<boolean>;

  /**
   * Get the properties for the blob at the provided path.
   * @param blobPath The path to the blob.
   */
  public abstract getBlobProperties(blobPath: string | BlobPath): Promise<BlobPropertiesResult>;

  /**
   * Get the contents of the blob at the provided path as a UTF-8 decoded string.
   * @param blobPath The path to the blob.
   */
  public abstract getBlobContentsAsString(blobPath: string | BlobPath): Promise<BlobContentsResult>;

  /**
   * Set the contents of the block blob at the provided path to be the provided UTF-8 encoded
   * string.
   * @param blockBlobPath The path to the block blob.
   * @param blockBlobContents The contents to set. This will be UTF-8 encoded.
   */
  public abstract setBlockBlobContentsFromString(blockBlobPath: string | BlobPath, blockBlobContents: string, options?: BlobContentOptions): Promise<ETagResult>;

  /**
   * Upload the file at the provided path to the provided block blob path.
   * @param blockBlobPath The path to the block blob.
   * @param filePath The path to the file that contains the blob's contents.
   * @param options Options that will be applied to the blob.
   */
  public abstract setBlockBlobContentsFromFile(blockBlobPath: string | BlobPath, filePath: string, options?: BlobContentOptions): Promise<ETagResult>;

  /**
   * Add the provided blob contents to append to the append blob with the provided name relative to
   * this container.
   * @param appendBlobName The name of the append blob relative to this container.
   * @param blobContentsToAppend The contents to add the append blob.
   * @param options Options that will be applied to the operation.
   */
  public abstract addToAppendBlobContentsFromString(appendBlobPath: string | BlobPath, blobContentsToAppend: string, options?: ETagOptions): Promise<ETagResult>;

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
  /**
   * The unique version identifier for this blob.
   */
  etag: string;
}

function encodeBlobName(blobName: string): string {
  return !blobName ? blobName : encodeURIComponent(blobName);
}

function decodeBlobName(blobName: string): string {
  return !blobName ? blobName : decodeURIComponent(blobName);
}

function processBlobUrl(url: string, options: GetURLOptions, credentials: Credential): string {
  if (options.sasToken !== true || options.encodeBlobName) {
    url = processBlobUrlBuilder(URLBuilder.parse(url), options, credentials);
  }
  return url;
}

function processBlobUrlBuilder(urlBuilder: URLBuilder, options: GetURLOptions, credentials: Credential): string {
  if (options.sasToken !== true) {
    urlBuilder.removeQuery();
    if (options.sasToken && typeof options.sasToken !== "boolean") {
      if (!(credentials instanceof SharedKeyCredential)) {
        throw new Error(`Cannot create a new SAS token if the BlobStorage credentials are not a SharedKeyCredential.`);
      } else {
        const urlPath: string | undefined = urlBuilder.getPath();
        if (!urlPath) {
          throw new Error(`Cannot create a new SAS token when the provided URL does not contain a path.`);
        } else {
          const blobPath: BlobPath = BlobPath.parse(urlPath);
          const sasSignatureValues: IBlobSASSignatureValues = {
            blobName: blobPath.blobName,
            containerName: blobPath.containerName,
            expiryTime: options.sasToken.endTime,
            startTime: options.sasToken.startTime,
            permissions: "r",
          };
          const sasQueryParameters: SASQueryParameters = generateBlobSASQueryParameters(sasSignatureValues, credentials as SharedKeyCredential);
          if (sasQueryParameters.cacheControl) {
            urlBuilder.setQueryParameter("rscc", sasQueryParameters.cacheControl);
          }
          if (sasQueryParameters.contentDisposition) {
            urlBuilder.setQueryParameter("rscd", sasQueryParameters.contentDisposition);
          }
          if (sasQueryParameters.contentEncoding) {
            urlBuilder.setQueryParameter("rsce", sasQueryParameters.contentEncoding);
          }
          if (sasQueryParameters.contentLanguage) {
            urlBuilder.setQueryParameter("rscl", sasQueryParameters.contentLanguage);
          }
          if (sasQueryParameters.contentType) {
            urlBuilder.setQueryParameter("rsct", sasQueryParameters.contentType);
          }
          if (sasQueryParameters.expiryTime) {
            urlBuilder.setQueryParameter("se", sasQueryParameters.expiryTime.toISOString());
          }
          if (sasQueryParameters.identifier) {
            urlBuilder.setQueryParameter("si", sasQueryParameters.identifier);
          }
          if (sasQueryParameters.permissions) {
            urlBuilder.setQueryParameter("sp", sasQueryParameters.permissions);
          }
          if (sasQueryParameters.protocol) {
            urlBuilder.setQueryParameter("spr", sasQueryParameters.protocol);
          }
          if (sasQueryParameters.resource) {
            urlBuilder.setQueryParameter("sr", sasQueryParameters.resource);
          }
          if (sasQueryParameters.services) {
            urlBuilder.setQueryParameter("ss", sasQueryParameters.services);
          }
          if (sasQueryParameters.signature) {
            urlBuilder.setQueryParameter("sig", sasQueryParameters.signature);
          }
          if (sasQueryParameters.startTime) {
            urlBuilder.setQueryParameter("st", sasQueryParameters.startTime.toISOString());
          }
          if (sasQueryParameters.version) {
            urlBuilder.setQueryParameter("sv", sasQueryParameters.version);
          }
        }
      }
    }
  }

  if (options.encodeBlobName) {
    const path: string | undefined = urlBuilder.getPath();
    if (path) {
      const blobPath: BlobPath = BlobPath.parse(path);
      urlBuilder.setPath(`${blobPath.containerName}/${encodeBlobName(blobPath.blobName)}`);
    }
  }

  return urlBuilder.toString();
}

export function constructBlobStorageURL(storageAccountNameOrUrl: string | URLBuilder): string {
  const urlBuilder: URLBuilder = typeof storageAccountNameOrUrl === "string" ? URLBuilder.parse(storageAccountNameOrUrl) : storageAccountNameOrUrl;

  if (!urlBuilder.getScheme()) {
    urlBuilder.setScheme("https");
  }

  const host: string | undefined = urlBuilder.getHost();
  if (!host) {
    throw new Error("Cannot construct a storage account URL with an empty or undefined storage account name or URL argument.");
  }
  const hostDotIndex: number = host.indexOf(".");
  if (hostDotIndex === -1) {
    urlBuilder.setHost(`${host}.blob.core.windows.net`);
  }

  return urlBuilder.toString();
}

export function getStorageAccountName(storageAccountNameOrUrl: string): string {
  const urlBuilder: URLBuilder = URLBuilder.parse(storageAccountNameOrUrl);
  const host: string | undefined = urlBuilder.getHost();
  if (!host) {
    throw new Error("Cannot get a storage account's name with an storage account URL argument with an empty or undefined host.");
  }
  const hostDotIndex: number = host.indexOf(".");
  return host.substring(0, hostDotIndex);
}

export function constructBlobStorageCredentials(storageAccountUrl: string, credentials?: Credential | string): Credential {
  if (!credentials) {
    credentials = new AnonymousCredential();
  } else if (typeof credentials === "string") {
    const storageAccountName: string = getStorageAccountName(storageAccountUrl);
    credentials = new SharedKeyCredential(storageAccountName, credentials);
  }
  return credentials;
}

function bumpETag(etag: string): string {
  return (Number.parseInt(etag) + 1).toString();
}

/**
 * A BlobStorage system that is stored in memory.
 */
export class InMemoryBlobStorage extends BlobStorage {
  private readonly url: string;
  private readonly containers: StringMap<InMemoryContainer> = {};
  private readonly credentials: Credential;

  constructor(storageAccountNameOrUrl = "https://fake.storage.com/", credentials?: Credential) {
    super();

    this.url = constructBlobStorageURL(storageAccountNameOrUrl);
    this.credentials = constructBlobStorageCredentials(this.url, credentials);
  }

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
          .then(() => {
            return blobName in container.blobs
              ? Promise.resolve(container.blobs[blobName])
              : Promise.reject(new Error("BlobNotFound: The specified blob does not exist."));
          });
      });
  }

  public getURL(options: GetURLOptions = {}): string {
    return processBlobUrl(this.url, options, this.credentials);
  }

  public getContainerURL(containerName: string, options: GetURLOptions = {}): string {
    const urlBuilder: URLBuilder = URLBuilder.parse(this.url);
    urlBuilder.setPath(containerName);
    return processBlobUrlBuilder(urlBuilder, options, this.credentials);
  }

  public getBlobURL(blobPath: string | BlobPath, options: GetURLOptions = {}): string {
    blobPath = BlobPath.parse(blobPath);
    const urlBuilder: URLBuilder = URLBuilder.parse(this.url);
    urlBuilder.setPath(blobPath.toString());
    return processBlobUrlBuilder(urlBuilder, options, this.credentials);
  }

  private async createInMemoryBlob(blobPath: string | BlobPath, blobType: "block" | "append", options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;
    const container: InMemoryContainer = await this.getInMemoryContainer(blobPath);

    if (!blobName) {
      throw new Error("InvalidUri: The requested URI does not represent any resource on the server.");
    }

    const blob: InMemoryBlob | undefined = container.blobs[blobName];
    const created: boolean = !blob;
    let etag: string | undefined;
    if (created) {
      etag = "1";
      container.blobs[blobName] = {
        blobType,
        contents: "",
        contentType: options.contentType || "application/octet-stream",
        etag,
      };
    }

    const result: CreateBlobResult = { created };
    if (etag) {
      result.etag = etag;
    }
    return result;
  }

  public createBlockBlob(blobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    return this.createInMemoryBlob(blobPath, "block", options);
  }

  public createAppendBlob(appendBlobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    return this.createInMemoryBlob(appendBlobPath, "append", options);
  }

  public async blobExists(blobPath: string | BlobPath): Promise<boolean> {
    blobPath = BlobPath.parse(blobPath);
    let result: boolean;
    try {
      await this.getBlobProperties(blobPath);
      result = true;
    } catch (error) {
      if (error.message.includes("BlobNotFound")) {
        result = false;
      } else {
        throw error;
      }
    }
    return result;
  }

  public async getBlobProperties(blobPath: string | BlobPath): Promise<BlobPropertiesResult> {
    blobPath = BlobPath.parse(blobPath);
    let result: BlobPropertiesResult;
    try {
      const blob: InMemoryBlob = await this.getInMemoryBlob(blobPath);
      result = {
        etag: blob.etag,
      };
    } catch (error) {
      if (error.message.includes("ContainerNotFound")) {
        throw new Error("BlobNotFound: The specified blob does not exist.");
      } else {
        throw error;
      }
    }
    return result;
  }

  public async getBlobContentsAsString(blobPath: string | BlobPath): Promise<BlobContentsResult> {
    let result: BlobContentsResult;
    try {
      const blob: InMemoryBlob = await this.getInMemoryBlob(blobPath);
      result = {
        contents: blob.contents.toString(),
        etag: blob.etag,
      };
    } catch (error) {
      if (error.message.includes("ContainerNotFound")) {
        throw new Error("BlobNotFound: The specified blob does not exist.");
      } else {
        throw error;
      }
    }
    return result;
  }

  public async setBlockBlobContentsFromString(blobPath: string | BlobPath, blobContents: string, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    blobPath = BlobPath.parse(blobPath);
    const blobName: string = blobPath.blobName;

    const container: InMemoryContainer = await this.getInMemoryContainer(blobPath);
    const blob: InMemoryBlob | undefined = container.blobs[blobName];
    if (options.etag && (!blob || blob.etag !== options.etag)) {
      throw new Error("ConditionNotMet: The condition specified using HTTP conditional header(s) is not met.");
    }

    let etag: string;
    if (!blob) {
      etag = "1";
      container.blobs[blobName] = {
        contents: blobContents,
        contentType: options.contentType || "application/octet-stream",
        blobType: "block",
        etag,
      };
    } else {
      etag = bumpETag(blob.etag);
      blob.contents = blobContents;
      blob.contentType = options.contentType || "application/octet-stream";
      blob.etag = etag;
    }

    const result: CreateBlobResult = {
      created: !blob,
      etag,
    };

    return result;
  }

  public async setBlockBlobContentsFromFile(blockBlobPath: string | BlobPath, filePath: string, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    blockBlobPath = BlobPath.parse(blockBlobPath);
    const blockBlobName: string = blockBlobPath.blobName;

    const container: InMemoryContainer = await this.getInMemoryContainer(blockBlobPath);
    const blockBlob: InMemoryBlob | undefined = container.blobs[blockBlobName];
    if (options.etag && (!blockBlob || blockBlob.etag !== options.etag)) {
      throw new Error("ConditionNotMet: The condition specified using HTTP conditional header(s) is not met.");
    }

    let etag: string;
    if (!blockBlob) {
      etag = "1";
      container.blobs[blockBlobName] = {
        contents: fs.readFileSync(filePath, defaultEncoding),
        contentType: options.contentType || "application/octet-stream",
        blobType: "block",
        etag,
      };
    } else {
      etag = bumpETag(blockBlob.etag);
      blockBlob.contents = fs.readFileSync(filePath, defaultEncoding);
      blockBlob.contentType = options.contentType || "application/octet-stream";
      blockBlob.etag = etag;
    }

    const result: CreateBlobResult = {
      created: !blockBlob,
      etag,
    };

    return result;
  }

  public async addToAppendBlobContentsFromString(appendBlobPath: string | BlobPath, blobContentsToAppend: string, options: ETagOptions = {}): Promise<ETagResult> {
    const appendBlob: InMemoryBlob = await this.getInMemoryBlob(appendBlobPath);
    if (options.etag && appendBlob.etag !== options.etag) {
      throw new Error("ConditionNotMet: The condition specified using HTTP conditional header(s) is not met.");
    }
    appendBlob.contents += blobContentsToAppend;
    appendBlob.etag = bumpETag(appendBlob.etag);
    const result: ETagResult = { etag: appendBlob.etag };
    return result;
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
  private readonly serviceUrl: ServiceURL;
  private readonly credentials: Credential;

  constructor(storageAccountNameOrUrl: string | URLBuilder, credentials?: Credential | string) {
    super();

    this.url = constructBlobStorageURL(storageAccountNameOrUrl);
    this.credentials = constructBlobStorageCredentials(this.url, credentials);

    const pipeline: Pipeline = StorageURL.newPipeline(this.credentials);
    this.serviceUrl = new ServiceURL(this.url, pipeline);
  }

  private getAzureContainerURL(containerName: string): ContainerURL {
    return ContainerURL.fromServiceURL(this.serviceUrl, containerName);
  }

  private getBlockBlobURL(blockBlobPath: string | BlobPath): BlockBlobURL {
    blockBlobPath = BlobPath.parse(blockBlobPath);
    const containerUrl: ContainerURL = this.getAzureContainerURL(blockBlobPath.containerName);
    return BlockBlobURL.fromContainerURL(containerUrl, blockBlobPath.blobName);
  }

  private getAppendBlobURL(appendBlobPath: string | BlobPath): AppendBlobURL {
    appendBlobPath = BlobPath.parse(appendBlobPath);
    const containerUrl: ContainerURL = this.getAzureContainerURL(appendBlobPath.containerName);
    return AppendBlobURL.fromContainerURL(containerUrl, appendBlobPath.blobName);
  }

  public getURL(options: GetURLOptions = {}): string {
    return processBlobUrl(this.url, options, this.credentials);
  }

  public getContainerURL(containerName: string, options: GetURLOptions = {}): string {
    const containerUrl: ContainerURL = this.getAzureContainerURL(containerName);
    return processBlobUrl(containerUrl.url, options, this.credentials);
  }

  public getBlobURL(blobPath: string | BlobPath, options: GetURLOptions = {}): string {
    const blobUrl: BlockBlobURL = this.getBlockBlobURL(blobPath);
    const urlBuilder: URLBuilder = URLBuilder.parse(blobUrl.url);
    const path: string | undefined = urlBuilder.getPath();
    if (path) {
      const blobPath: BlobPath = BlobPath.parse(path);
      if (blobPath.blobName) {
        urlBuilder.setPath(`${blobPath.containerName}/${decodeBlobName(blobPath.blobName)}`);
      }
    }
    return processBlobUrlBuilder(urlBuilder, options, this.credentials);
  }

  public async blobExists(blobPath: string | BlobPath): Promise<boolean> {
    let result: boolean;
    try {
      await this.getBlobProperties(blobPath);
      result = true;
    } catch (error) {
      if (error.message.includes("BlobNotFound")) {
        result = false;
      } else {
        throw error;
      }
    }
    return result;
  }

  public async getBlobProperties(blobPath: string | BlobPath): Promise<BlobPropertiesResult> {
    const blockBlobUrl: BlockBlobURL = this.getBlockBlobURL(blobPath);
    let result: BlobPropertiesResult;
    try {
      const getPropertiesResult: Models.BlobGetPropertiesResponse = await blockBlobUrl.getProperties(Aborter.none);
      result = {
        etag: getPropertiesResult.eTag,
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw new Error("BlobNotFound: The specified blob does not exist.");
      } else {
        throw error;
      }
    }
    return result;
  }

  public async getBlobContentsAsString(blobPath: string | BlobPath): Promise<BlobContentsResult> {
    await validateBlobName(blobPath);

    const blockBlobUrl: BlockBlobURL = this.getBlockBlobURL(blobPath);
    let result: BlobContentsResult;
    try {
      const blobDownloadResponse: Models.BlobDownloadResponse = await blockBlobUrl.download(Aborter.none, 0, undefined);
      result = {
        contents: (await readEntireString(blobDownloadResponse.readableStreamBody))!,
        etag: blobDownloadResponse.eTag,
      };
    } catch (error) {
      if (error.statusCode === 404) {
        throw new Error("BlobNotFound: The specified blob does not exist.");
      } else {
        throw error;
      }
    }
    return result;
  }

  public async setBlockBlobContentsFromString(blockBlobPath: string | BlobPath, blockBlobContents: string, options: BlobContentOptions = {}): Promise<ETagResult> {
    const blockBlobUrl: BlockBlobURL = this.getBlockBlobURL(blockBlobPath);
    const uploadResult = await blockBlobUrl.upload(Aborter.none, blockBlobContents, Buffer.byteLength(blockBlobContents, "utf-8"), {
      blobHTTPHeaders: {
        blobContentType: options.contentType
      },
      accessConditions: {
        modifiedAccessConditions: {
          ifMatch: options.etag,
        }
      }
    });
    const result: ETagResult = { etag: uploadResult.eTag };
    return result;
  }

  public async setBlockBlobContentsFromFile(blobPath: string | BlobPath, filePath: string, options: BlobContentOptions = {}): Promise<ETagResult> {
    const fileLengthInBytes: number = await getFileLengthInBytes(filePath);
    const blockBlobUrl: BlockBlobURL = this.getBlockBlobURL(blobPath);
    const uploadResult: BlockBlobUploadResponse = await blockBlobUrl.upload(Aborter.none, (() => fs.createReadStream(filePath)), fileLengthInBytes, {
      blobHTTPHeaders: {
        blobContentType: options.contentType,
      },
      accessConditions: {
        modifiedAccessConditions: {
          ifMatch: options.etag,
        }
      }
    });
    const result: ETagResult = { etag: uploadResult.eTag };
    return result;
  }

  public async addToAppendBlobContentsFromString(appendBlobPath: string | BlobPath, blobContentsToAppend: string, options: ETagOptions = {}): Promise<ETagResult> {
    const bufferLength: number = Buffer.byteLength(blobContentsToAppend, defaultEncoding);
    const buffer: Buffer = Buffer.alloc(bufferLength, defaultEncoding);
    buffer.write(blobContentsToAppend);
    const appendBlobUrl: AppendBlobURL = this.getAppendBlobURL(appendBlobPath);
    const appendBlockResult: AppendBlobAppendBlockResponse = await appendBlobUrl.appendBlock(Aborter.none, buffer, buffer.length, {
      accessConditions: {
        modifiedAccessConditions: {
          ifMatch: options.etag,
        }
      }
    });
    const result: ETagResult = {
      etag: appendBlockResult.eTag,
    };
    return result;
  }

  public getBlobContentType(blobPath: string | BlobPath): Promise<string | undefined> {
    blobPath = BlobPath.parse(blobPath);
    const containerName: string = blobPath.containerName;
    return this.getBlockBlobURL(blobPath)
      .getProperties(Aborter.none)
      .then((properties: Models.BlobGetPropertiesResponse) => properties.contentType)
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
          .setHTTPHeaders(Aborter.none, {
            blobContentType: contentType
          });
      });
  }

  public containerExists(containerName: string): Promise<boolean> {
    return this.getAzureContainerURL(containerName)
      .getProperties(Aborter.none)
      .then(() => true)
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerNotFound", false));
  }

  public getContainerAccessPolicy(containerName: string): Promise<ContainerAccessPolicy> {
    return this.getAzureContainerURL(containerName)
      .getAccessPolicy(Aborter.none)
      .then((accessPolicy: ContainerGetAccessPolicyResponse) => accessPolicy.blobPublicAccess || "private");
  }

  public setContainerAccessPolicy(containerName: string, permissions: ContainerAccessPolicy): Promise<unknown> {
    return this.getAzureContainerURL(containerName)
      .setAccessPolicy(Aborter.none, getAzureContainerAccessPermissions(permissions));
  }

  public async createBlockBlob(blockBlobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    await validateBlobName(blockBlobPath);

    let result: CreateBlobResult;
    const blockBlobUrl: BlockBlobURL = this.getBlockBlobURL(blockBlobPath);
    try {
      const uploadResponse: Models.BlockBlobUploadResponse = await blockBlobUrl.upload(Aborter.none, "", 0, {
        accessConditions: {
          modifiedAccessConditions: {
            ifNoneMatch: "*"
          }
        },
        blobHTTPHeaders: {
          blobContentType: options.contentType
        }
      });
      result = {
        created: true,
        etag: uploadResponse.eTag!,
      };
    } catch (error) {
      if (error.message.includes("BlobAlreadyExists")) {
        result = { created: false };
      } else {
        throw error;
      }
    }

    return result;
  }

  public async createAppendBlob(appendBlobPath: string | BlobPath, options: BlobContentOptions = {}): Promise<CreateBlobResult> {
    await validateBlobName(appendBlobPath);

    let result: CreateBlobResult;
    const appendBlobURL: AppendBlobURL = this.getAppendBlobURL(appendBlobPath);
    try {
      const response: Models.AppendBlobCreateResponse = await appendBlobURL.create(Aborter.none, {
        accessConditions: {
          modifiedAccessConditions: {
            ifNoneMatch: "*"
          }
        },
        blobHTTPHeaders: {
          blobContentType: options.contentType
        }
      });
      result = {
        created: true,
        etag: response.eTag!,
      };
    } catch (error) {
      if (error.message.includes("BlobAlreadyExists")) {
        result = { created: false };
      } else {
        throw error;
      }
    }

    return result;
  }

  public deleteBlob(blobPath: string | BlobPath): Promise<boolean> {
    return validateBlobName(blobPath)
      .then(() => {
        return this.getBlockBlobURL(blobPath)
          .delete(Aborter.none)
          .then(() => true)
          .catch((error: Error) => resolveIfErrorMessageContains(error, "BlobNotFound", false));
      });
  }

  public createContainer(containerName: string, options?: CreateContainerOptions): Promise<boolean> {
    return this.getAzureContainerURL(containerName)
      .create(Aborter.none, {
        access: getAzureContainerAccessPermissions(options && options.accessPolicy)
      })
      .then(() => true)
      .catch((error: Error) => resolveIfErrorMessageContains(error, "ContainerAlreadyExists", false));
  }

  public deleteContainer(containerName: string): Promise<boolean> {
    return this.getAzureContainerURL(containerName)
      .delete(Aborter.none)
      .then(() => true)
      .catch((error: Error) => resolveIfErrorStatusCodeEquals(error, 404, false));
  }

  public async listContainers(): Promise<BlobStorageContainer[]> {
    const result: BlobStorageContainer[] = [];

    let listContainersResponse: Models.ListContainersSegmentResponse = await this.serviceUrl.listContainersSegment(Aborter.none);
    result.push(...map(listContainersResponse.containerItems, (containerItem: Models.ContainerItem) => new BlobStorageContainer(this, containerItem.name)));

    while (listContainersResponse.nextMarker) {
      listContainersResponse = await this.serviceUrl.listContainersSegment(Aborter.none, listContainersResponse.nextMarker);
      result.push(...map(listContainersResponse.containerItems, (containerItem: Models.ContainerItem) => new BlobStorageContainer(this, containerItem.name)));
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
