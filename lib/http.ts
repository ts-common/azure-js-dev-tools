import * as http from "http";
import * as https from "https";
import { URLBuilder } from "./url";

/**
 * A collection of HttpHeaders that can be sent with a HTTP request.
 */
export function getHeaderKey(headerName: string) {
  return headerName.toLowerCase();
}

/**
 * An individual header within a HttpHeaders collection.
 */
export interface HttpHeader {
  /**
   * The name of the header.
   */
  name: string;

  /**
   * The value of the header.
   */
  value: string;
}

/**
 * A HttpHeaders collection represented as a simple JSON object.
 */
export type RawHttpHeaders = { [headerName: string]: string };

/**
 * A collection of HTTP header key/value pairs.
 */
export class HttpHeaders {
  private readonly _headersMap: { [headerKey: string]: HttpHeader };

  constructor(rawHeaders?: RawHttpHeaders) {
    this._headersMap = {};
    if (rawHeaders) {
      for (const headerName in rawHeaders) {
        this.set(headerName, rawHeaders[headerName]);
      }
    }
  }

  /**
   * Set a header in this collection with the provided name and value. The name is
   * case-insensitive.
   * @param headerName The name of the header to set. This value is case-insensitive.
   * @param headerValue The value of the header to set.
   */
  public set(headerName: string, headerValue: string | number): void {
    this._headersMap[getHeaderKey(headerName)] = { name: headerName, value: headerValue.toString() };
  }

  /**
   * Get the header value for the provided header name, or undefined if no header exists in this
   * collection with the provided name.
   * @param headerName The name of the header.
   */
  public get(headerName: string): string | undefined {
    const header: HttpHeader = this._headersMap[getHeaderKey(headerName)];
    return !header ? undefined : header.value;
  }

  /**
   * Get whether or not this header collection contains a header entry for the provided header name.
   */
  public contains(headerName: string): boolean {
    return !!this._headersMap[getHeaderKey(headerName)];
  }

  /**
   * Remove the header with the provided headerName. Return whether or not the header existed and
   * was removed.
   * @param headerName The name of the header to remove.
   */
  public remove(headerName: string): boolean {
    const result: boolean = this.contains(headerName);
    delete this._headersMap[getHeaderKey(headerName)];
    return result;
  }

  /**
   * Get the headers that are contained this collection as an object.
   */
  public rawHeaders(): RawHttpHeaders {
    const result: RawHttpHeaders = {};
    for (const headerKey in this._headersMap) {
      const header: HttpHeader = this._headersMap[headerKey];
      result[header.name.toLowerCase()] = header.value;
    }
    return result;
  }

  /**
   * Get the headers that are contained in this collection as an array.
   */
  public headersArray(): HttpHeader[] {
    const headers: HttpHeader[] = [];
    for (const headerKey in this._headersMap) {
      headers.push(this._headersMap[headerKey]);
    }
    return headers;
  }

  /**
   * Get the header names that are contained in this collection.
   */
  public headerNames(): string[] {
    const headerNames: string[] = [];
    const headers: HttpHeader[] = this.headersArray();
    for (let i = 0; i < headers.length; ++i) {
      headerNames.push(headers[i].name);
    }
    return headerNames;
  }

  /**
   * Get the header names that are contained in this collection.
   */
  public headerValues(): string[] {
    const headerValues: string[] = [];
    const headers: HttpHeader[] = this.headersArray();
    for (let i = 0; i < headers.length; ++i) {
      headerValues.push(headers[i].value);
    }
    return headerValues;
  }

  /**
   * Get the JSON object representation of this HTTP header collection.
   */
  public toJson(): RawHttpHeaders {
    return this.rawHeaders();
  }

  /**
   * Get the string representation of this HTTP header collection.
   */
  public toString(): string {
    return JSON.stringify(this.toJson());
  }

  /**
   * Create a deep clone/copy of this HttpHeaders collection.
   */
  public clone(): HttpHeaders {
    return new HttpHeaders(this.rawHeaders());
  }
}

/**
 * An HTTP request to send to an HTTP server.
 */
export interface HttpRequest {
  /**
   * The HTTP method that this request will be sent with.
   */
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS";
  /**
   * The URL that this request will be sent to.
   */
  url: string | URLBuilder;
  /**
   * The headers that this request with be sent with.
   */
  headers?: HttpHeaders | RawHttpHeaders;
  /**
   * The body to send with this request.
   */
  body?: any;
}

/**
 * An HTTP response received from an HTTP server.
 */
export interface HttpResponse {
  /**
   * The request that this response is responding to.
   */
  request: HttpRequest;
  /**
   * The response status code.
   */
  statusCode: number;
  /**
   * The response headers.
   */
  headers: HttpHeaders;
  /**
   * The response body.
   */
  body?: string;
}

/**
 * An interface that can send HttpRequests and receive promised HttpResponses.
 */
export interface HttpClient {
  /**
   * Send the provided HttpRequest and get back an HttpResponse.
   * @param request The HttpRequest to send.
   */
  sendRequest(request: HttpRequest): Promise<HttpResponse>;
}

/**
 * Get an instance of the default HttpClient.
 */
export function getDefaultHttpClient(): HttpClient {
  return new NodeHttpClient();
}

function sendNodeHttpClientRequest(request: HttpRequest): Promise<HttpResponse> {
  const requestUrl: URLBuilder = request.url instanceof URLBuilder ? request.url : URLBuilder.parse(request.url);

    let requestHeaders: http.OutgoingHttpHeaders | undefined;
    if (request.headers instanceof HttpHeaders) {
      requestHeaders = request.headers.rawHeaders();
    } else if (request.headers) {
      requestHeaders = request.headers;
    }

    const protocol: string = requestUrl.getScheme() || "http";

    const requestOptions: http.RequestOptions = {
      method: request.method,
      headers: requestHeaders,
      protocol: protocol + ":",
      host: requestUrl.getHost(),
      port: requestUrl.getPort(),
      path: (requestUrl.getPath() || "") + (requestUrl.getQuery() || "")
    };

    return new Promise((resolve, reject) => {
      try {
        const clientRequest: http.ClientRequest = (protocol === "http" ? http : https).request(requestOptions, (response: http.IncomingMessage) => {
          try {
            response.setEncoding("utf8");

            let responseBody = "";
            response.on("data", (chunk: any) => {
              responseBody += chunk;
            });

            response.on("end", () => {
              const responseHeaders = new HttpHeaders();
              for (const responseHeaderName of Object.keys(response.headers)) {
                const responseHeaderValue: string | string[] | undefined = response.headers[responseHeaderName];
                if (typeof responseHeaderValue === "string") {
                  responseHeaders.set(responseHeaderName, responseHeaderValue);
                } else if (Array.isArray(responseHeaderValue)) {
                  responseHeaders.set(responseHeaderName, responseHeaderValue.join(","));
                }
              }

              resolve({
                request,
                statusCode: response.statusCode!,
                headers: responseHeaders,
                body: responseBody
              });
            });

            response.on("error", (error: Error) => {
              reject(error);
            });
          } catch (error) {
            reject(error);
          }
        });
        if (request.body) {
          clientRequest.write(request.body, (error: Error | null | undefined) => {
            if (error) {
              reject(error);
            }
          });
        }
        clientRequest.on("error", (error: Error) => {
          reject(error);
        });
        clientRequest.end(() => {});
      } catch (error) {
        reject(error);
      }
    });
}

/**
 * Options that can be provided when creating a new NodeHttpClient.
 */
export interface NodeHttpClientOptions {
  /**
   * Whether or not redirects will be automatically handled. Defaults to true.
   */
  handleRedirects?: boolean;
}

/**
 * An HTTP client that uses the built-in Node.js http module.
 */
export class NodeHttpClient implements HttpClient {
  private readonly handleRedirects: boolean;

  constructor(options?: NodeHttpClientOptions) {
    options = options || {};
    this.handleRedirects = options.handleRedirects == undefined ? true : options.handleRedirects;
  }

  async sendRequest(request: HttpRequest): Promise<HttpResponse> {
    let response: HttpResponse = await sendNodeHttpClientRequest(request);
    while (this.handleRedirects && 300 <= response.statusCode && response.statusCode < 400 && response.headers.contains("location")) {
      request.url = response.headers.get("location")!;
      response = await sendNodeHttpClientRequest(request);
    }
    return response;
  }
}
