import * as commonmark from "commonmark";
import * as jsYaml from "js-yaml";
import * as os from "os";
import { RunOptions, RunResult, run } from "./run";

/**
 * Options that can be passed to autorestExecutable().
 */
export interface AutoRestExecutableOptions {
  /**
   * The platform that AutoRest will be run on.
   */
  osPlatform?: string;
  /**
   * The path to the AutoRest executable. This can be either the folder that the executable is in or
   * the path to the executable itself.
   */
  autorestPath?: string;
}

/**
 * Get the executable that will be used to run AutoRest.
 * @param options The options for specifying which executable to use.
 */
export function autorestExecutable(options: AutoRestExecutableOptions = {}): string {
  if (!options.osPlatform) {
    options.osPlatform = os.platform();
  }
  let result: string = options.autorestPath || "";
  if (!result.endsWith("autorest") && !result.endsWith("autorest.cmd")) {
    if (result && !result.endsWith("/") && !result.endsWith("\\")) {
      result += "/";
    }
    result += "autorest";
  }
  if (options.osPlatform === "win32" && !result.endsWith(".cmd")) {
    result += ".cmd";
  }
  return result;
}

export type Switch = "" | boolean;

export type AutoRestOptionValue = string | string[] | boolean | number | undefined;

/**
 * An optional dictionary of options you want to pass to Autorest. This will be passed in any call,
 * but can be override by "autorest_options" in each data. Note that you CAN'T override
 * "--output-folder" which is filled contextually. All options prefixed by "sdkrel:" can be a
 * relative path that will be solved against SDK folder before being sent to Autorest.
 */
export interface AutoRestOptions {
  /**
   * The path to the autorest executable.
   */
  path?: string;
  /**
   * Show verbose output information.
   */
  verbose?: Switch;
  /**
   * Show internal debug information.
   */
  debug?: Switch;
  /**
   * Suppress output.
   */
  quiet?: Switch;
  /**
   * Show all installed versions of AutoRest tools.
   */
  "list-installed"?: Switch;
  /**
   * Lists the last nn releases available from github.
   */
  "list-available"?: number;
  /**
   * Uses specified version of AutoRest (installing if necessary.)
   * For version you can use a version label (see --list-available) or
   * -latest: Get latest nightly build.
   * -latest-release: Get latest release version.
   */
  version?: string;
  /**
   * Remove all installed versions of AutoRest tools and install the latest (override with
   * --version).
   */
  reset?: Switch;
  /**
   * Overrides the platform detection for the dotnet runtime (special case). Refer to the Runtime
   * Identifier (RID) catalog for more details.
   */
  "runtime-id"?: string;
  /**
   * Adds the given file to the list of input files for generation process.
   */
  "input-file"?: string | string[];
  /**
   * Sets the namespace to use for the generated code.
   */
  namespace?: string;
  /**
   * Text to include as a header comment in generated files. Use NONE to suppress the default header.
   */
  "license-header"?: string;
  /**
   * If specified, the generated client includes a ServiceClientCredentials property and constructor
   * parameter. Authentication behaviors are implemented by extending the ServiceClientCredentials
   * type.
   */
  "add-credentials"?: Switch;
  /**
   * Name of the package.
   */
  "package-name"?: string;
  /**
   * Version of the package.
   */
  "package-version"?: string;
  /**
   * Specifies mode for generating sync wrappers. Supported value are:
   * essential - generates only one sync returning body or header (default)
   * all - generates one sync method for each async method
   * none - does not generate any sync methods
   */
  "sync-methods"?: string;
  /**
   * The maximum number of properties in the request body. If the number of properties in the
   * request body is less than or equal to this value, these properties will be represented as
   * method arguments.
   */
  "payload-flattening-threshold"?: number;
  /**
   * Name to use for the generated client type. By default, uses the value of the "Title" field from
   * the input files.
   */
  "override-client-name"?: string;
  /**
   * Indicates whether generated constructors will have an internal protection level.
   */
  "use-internal-constructors"?: Switch;
  /**
   * Indicates whether to use DateTimeOffset instead of DateTime to model date-time types.
   */
  "use-datetimeoffset"?: Switch;
  /**
   * Name to use for the generated client models namespace and folder name. By default, uses the
   * value of 'Models'. This is not currently supported by all code generators.
   */
  "models-name"?: string;
  /**
   * If set, will cause generated code to be output to a single file. Not supported by all code
   * generators.
   */
  "output-file"?: string;
  /**
   * Specifies the format, messages will be printed as. JSON format is easier to process
   * programmatically.
   */
  "message-format"?: string;
  /**
   * If set, runs the Azure specific validator plugin.
   */
  "azure-validator"?: Switch;
  /**
   * Indicates the type of configuration file being passed to the azure-validator so that it can run
   * the appropriate class of validation rules accordingly.
   */
  "openapi-type"?: string;
  /**
   * If set, validates the provided OpenAPI definition(s) against provided examples.
   */
  "model-validator"?: Switch;
  /**
   * If set, semantically verifies the provided OpenAPI definition(s), e.g. checks that a
   * parameter's specified default value matches the parameter's declared type.
   */
  "semantic-validator"?: Switch;
  /**
   * Runs the C# code generator.
   */
  csharp?: Switch;
  /**
   * Runs the Node.js JavaScript code generator.
   */
  nodejs?: Switch;
  /**
   * Runs the Python code generator.
   */
  python?: Switch;
  /**
   * Runs the Java code generator.
   */
  java?: Switch;
  /**
   * Runs the Ruby code generator.
   */
  ruby?: Switch;
  /**
   * Runs the Go code generator.
   */
  go?: Switch;
  /**
   * Runs the TypeScript code generator.
   */
  typescript?: Switch;
  /**
   * Runs the Azure Resource Schema code generator.
   */
  azureresourceschema?: Switch;
  /**
   * Uses the Azure version of the specified code generator.
   */
  "azure-arm"?: Switch;
  /**
   * Additional options that can be provided to AutoRest.
   */
  [additionalOptionName: string]: AutoRestOptionValue;
}

/**
 * Run AutoRest in a new process using the provided options.
 * @param autorestOptions The options to pass to AutoRest.
 * @param runOptions The options to use when creating the AutoRest process.
 */
export function autorest(readmeMdFileUrl: string | undefined, autorestOptions: AutoRestOptions | undefined, runOptions: RunOptions & AutoRestExecutableOptions): Promise<RunResult> {
  runOptions = runOptions || {};
  const autorestCommand: string = autorestExecutable(runOptions);

  const args: string[] = [];
  if (autorestOptions) {
    for (const optionName of Object.keys(autorestOptions)) {
      let argument = optionName;
      if (!argument.startsWith("--")) {
        argument = `--${argument}`;
      }

      const optionValue: AutoRestOptionValue = autorestOptions[optionName];
      if (Array.isArray(optionValue)) {
        argument += `=${optionValue.join(",")}`;
      } else if (optionValue != undefined && optionValue !== "") {
        argument += `=${optionValue}`;
      }

      args.push(argument);
    }
  }

  if (readmeMdFileUrl) {
    args.push(readmeMdFileUrl);
  }

  return run(autorestCommand, args, runOptions);
}

/**
 * The parsed version of the swagger-to-sdk YAML block within an AutoRest readme.md file.
 */
export interface ReadmeMdSwaggerToSDKConfiguration {
  /**
   * The repositories specified.
   */
  repositories: RepositoryConfiguration[];
}

/**
 * An individual repository configuration within an AutoRest readme.md swagger-to-sdk YAML block
 * configuration.
 */
export interface RepositoryConfiguration {
  /**
   * The name of the GitHub repository this configuration applies to. If no organization is
   * specified, then Azure will be used.
   */
  repo: string;
  /**
   * The list of commands that will be run (in order) after an SDK has been generated.
   */
  after_scripts: string[];
}

function findSwaggerToSDKYamlBlocks(parsedMarkdownNode: commonmark.Node | undefined | null): commonmark.Node[] {
  const result: commonmark.Node[] = [];
  if (parsedMarkdownNode) {
    const nodesToVisit: commonmark.Node[] = [parsedMarkdownNode];
    while (nodesToVisit.length > 0) {
      const node: commonmark.Node = nodesToVisit.shift()!;

      if (node.firstChild) {
        nodesToVisit.push(node.firstChild);
      }
      if (node.next) {
        nodesToVisit.push(node.next);
      }

      if (node.type === "code_block" && node.info && node.info.toLowerCase().indexOf("$(swagger-to-sdk)") !== -1) {
        result.push(node);
      }
    }
  }
  return result;
}

/**
 * Parse the contents of an AutoRest readme.md configuration file and return the parsed swagger to
 * sdk configuration section.
 * @param readmeMdFileContents The contents of an AutoRest readme.md configuration file.
 */
export function findSwaggerToSDKConfiguration(readmeMdFileContents: string | undefined): ReadmeMdSwaggerToSDKConfiguration | undefined {
  let result: ReadmeMdSwaggerToSDKConfiguration | undefined;
  if (readmeMdFileContents) {
    const markdownParser = new commonmark.Parser();
    const parsedReadmeMd: commonmark.Node = markdownParser.parse(readmeMdFileContents);
    const swaggerToSDKYamlBlocks: commonmark.Node[] = findSwaggerToSDKYamlBlocks(parsedReadmeMd);
    const repositories: RepositoryConfiguration[] = [];
    for (const swaggerToSDKYamlBlock of swaggerToSDKYamlBlocks) {
      const yamlBlockContents: string | null = swaggerToSDKYamlBlock.literal;
      if (yamlBlockContents) {
        const yaml: any = jsYaml.safeLoad(yamlBlockContents);
        if (yaml) {
          const swaggerToSDK: any = yaml["swagger-to-sdk"];
          if (swaggerToSDK && Array.isArray(swaggerToSDK)) {
            repositories.push(...swaggerToSDK);
          }
        }
      }
    }
    result = { repositories };
  }
  return result;
}
