/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { ChildProcess, spawn, StdioOptions } from "child_process";
import * as os from "os";
import { any, last } from "./arrays";
import { replaceAll, StringMap } from "./common";
import { normalizePath } from "./path";
import { Readable } from "stream";

export interface Command {
  /**
   * The executable file/command to run.
   */
  executable: string;
  /**
   * The arguments to pass to the executable.
   */
  args?: string[];
  /**
   * The options to use when running the command.
   */
  options?: RunOptions;
}

/**
 * Get the string representation of the provided command.
 */
export function commandToString(command: Command): string {
  let result: string = quoteIfNeeded(command.executable);

  if (any(command.args)) {
    for (const arg of command.args) {
      if (arg) {
        result += ` ${quoteIfNeeded(arg)}`;
      }
    }
  }

  return result;
}

export interface CommandToken {
  text: string;
  startIndex: number;
  endIndex: number;
  isWhitespace?: boolean;
}

function parseCommandNonWhitespaceToken(commandString: string, startIndex: number): CommandToken {
  const commandStringLength: number = commandString.length;
  let endIndex: number = startIndex;
  let quote: string | undefined;
  let escaped = false;
  while (endIndex < commandStringLength) {
    const currentCharacter: string = commandString[endIndex];
    ++endIndex;
    if (!quote) {
      if (currentCharacter === " ") {
        --endIndex;
        break;
      } else if (currentCharacter === `'` || currentCharacter === `"`) {
        quote = currentCharacter;
      }
    } else if (!escaped) {
      if (currentCharacter === "\\") {
        escaped = true;
      } else if (currentCharacter === quote) {
        quote = undefined;
      }
    } else {
      escaped = false;
    }
  }
  return {
    text: commandString.substring(startIndex, endIndex),
    startIndex,
    endIndex,
  };
}

function parseCommandWhitespaceToken(commandString: string, startIndex: number): CommandToken {
  const commandStringLength: number = commandString.length;
  let endIndex: number = startIndex + 1;
  while (endIndex < commandStringLength && commandString[endIndex] === " ") {
    ++endIndex;
  }
  return {
    text: commandString.substring(startIndex, endIndex),
    startIndex,
    endIndex,
    isWhitespace: true,
  };
}

export function parseCommandToken(commandString: string, startIndex: number): CommandToken | undefined {
  let result: CommandToken | undefined;

  const commandStringLength: number = commandString.length;
  if (0 <= startIndex && startIndex < commandStringLength) {
    const firstCharacter: string = commandString[startIndex];
    if (firstCharacter === " ") {
      result = parseCommandWhitespaceToken(commandString, startIndex);
    } else {
      result = parseCommandNonWhitespaceToken(commandString, startIndex);
    }
  }

  return result;
}

export function parseCommandTokens(commandString: string, startIndex = 0): CommandToken[] {
  const result: CommandToken[] = [];

  let argToken: CommandToken | undefined = parseCommandToken(commandString, startIndex);
  while (argToken) {
    if (!argToken.isWhitespace) {
      result.push(argToken);
    }
    argToken = parseCommandToken(commandString, argToken.endIndex);
  }

  return result;
}

export function createCommand(commandTokens: CommandToken[] | undefined): Command | undefined {
  let result: Command | undefined;
  if (any(commandTokens)) {
    result = {
      executable: commandTokens.shift()!.text,
      args: commandTokens.map((commandToken: CommandToken) => commandToken.text),
    };
  }
  return result;
}

/**
 * Parse a command object from the provided command string.
 */
export function parseCommand(commandString: string, startIndex = 0): Command | undefined {
  const commandTokens: CommandToken[] = parseCommandTokens(commandString, startIndex);
  return createCommand(commandTokens);
}

export function parseCommands(commandString: string, startIndex = 0): Command[] {
  const commandTokens: CommandToken[] = parseCommandTokens(commandString, startIndex);
  let commandStartIndex = 0;
  const result: Command[] = [];
  for (let commandIndex = 0; commandIndex < commandTokens.length; ++commandIndex) {
    const command: CommandToken = commandTokens[commandIndex];
    if (command.text === "&" || command.text === "&&") {
      if (commandStartIndex === commandIndex) {
        ++commandStartIndex;
      } else {
        result.push(createCommand(commandTokens.slice(commandStartIndex, commandIndex))!);
        commandStartIndex = commandIndex + 1;
      }
    }
  }
  if (commandStartIndex < commandTokens.length) {
    result.push(createCommand(commandTokens.slice(commandStartIndex, commandTokens.length))!);
  }
  return result;
}

/**
 * Quote the provided value if it is needed.
 */
export function quoteIfNeeded(value: string, quote = `"`): string {
  return shouldQuote(value, quote) ? ensureQuoted(value, quote) : value;
}

/**
 * Determine whether or not the provided value should be quoted.
 */
export function shouldQuote(value: string, quote = `"`): boolean {
  return !!value && (value.includes(" ") || value.includes(quote));
}

/**
 * Ensure that the provided value is surrounded by the provided quote string.
 */
export function ensureQuoted(value: string, quote = `"`): string {
  if (quote && value.length < quote.length * 2 || !value.startsWith(quote) || !value.endsWith(quote)) {
    if (quote === `"` || quote === `'`) {
      value = replaceAll(value, quote, `\\${quote}`)!;
    }
    value = `${quote}${value}${quote}`;
  }
  return value;
}

/**
 * An object that runs a provided command.
 */
export interface Runner {
  /**
   * Run the provided command asynchronously.
   * @param command The command to run.
   * @param options The options to use when running the command.
   */
  run(command: Command, options: RunOptions | undefined): Promise<RunResult>;
}

export function chunkToString(chunk: any): string {
  if (Buffer.isBuffer(chunk)) {
    chunk = chunk.toString("utf8");
  }
  return chunk;
}

const captureProcessOutput = async (
  source: Readable | null,
  captureFn?: ((text: string) => void) | boolean,
  capturePrefix?: string
): Promise<string | undefined> => {
  let capturedOutput = "";
  if (captureFn === false || source === null) {
    return undefined;
  }

  const captureOutputFn = (text: string) => {
    capturedOutput += text;
    if (typeof captureFn === "function") {
      if (capturePrefix) {
        text = `[${capturePrefix}] ${text}`;
      }
      captureFn(text);
    }
  };

  return new Promise((resolve, reject) => {
    let currentOutputLine = "";
    source.addListener("data", (chunk: any) => {
      currentOutputLine += chunkToString(chunk);
      while (true) {
        const newLineIndex: number = currentOutputLine.indexOf("\n");
        if (newLineIndex === -1) {
          break;
        }
        const startOfNextLine: number = newLineIndex + 1;
        captureOutputFn(currentOutputLine.substring(0, startOfNextLine));
        currentOutputLine = currentOutputLine.substring(startOfNextLine);
      }
    });
    source.addListener("error", (error: Error) => {
      if (currentOutputLine) {
        captureOutputFn(currentOutputLine);
        currentOutputLine = "";
      }
      reject(error);
    });
    source.addListener("end", () => {
      if (currentOutputLine) {
        captureOutputFn(currentOutputLine);
        currentOutputLine = "";
      }
      resolve(capturedOutput);
    });
  });
};

/**
 * A command runner that runs commands using a spawned process.
 */
export class RealRunner implements Runner {
  public run(command: Command, options: RunOptions = {}): Promise<RunResult> {
    const executablePath: string = normalizePath(command.executable, os.platform());

    const childProcess: ChildProcess = spawn(executablePath, command.args || [], {
      cwd: options.executionFolderPath,
      stdio: getChildProcessStdio(options),
      env: options.environmentVariables
    });

    const stdoutCaptured = captureProcessOutput(childProcess.stdout, options.captureOutput, options.capturePrefix);
    const stderrCaptured = captureProcessOutput(childProcess.stderr, options.captureError, options.capturePrefix);

    let processExitCode: number | undefined;
    const processDone: Promise<RunResult> = new Promise((resolve, reject) => {
      childProcess.addListener("exit", (exitCode: number) => {
        processExitCode = exitCode;
        resolve();
      });
      childProcess.addListener("error", reject);
    });

    return Promise.all([processDone, stdoutCaptured, stderrCaptured])
      .then(([_, stdout, stderr]) => {
        return {
          exitCode: processExitCode,
          stdout, stderr,
          processId: childProcess.pid,
        };
      })
      .catch((error: Error) => {
        if (typeof options.captureError === "function") {
          options.captureError(error.toString());
        }
        return {
          error
        };
      });
  }
}

function getExecutionFolderPath(options: RunOptions | undefined): string {
  return (options && options.executionFolderPath) || process.cwd();
}

export interface FakeCommand {
  executable: string;
  args?: string[];
  executionFolderPath?: string;
  result?: RunResult | Promise<RunResult> | (() => RunResult | Promise<RunResult>);
}

/**
 * A fake command runner.
 */
export class FakeRunner implements Runner {
  private readonly innerRunner: Runner;
  private readonly fakeCommands: FakeCommand[] = [];
  private unrecognizedCommand: (command: Command, options?: RunOptions) => (RunResult | Promise<RunResult>);

  constructor(innerRunner?: Runner) {
    this.innerRunner = innerRunner || new RealRunner();
    this.unrecognizedCommand = (command: Command, options?: RunOptions) =>
      Promise.reject(new Error(`No FakeRunner result has been registered for the command "${commandToString(command)}" at "${getExecutionFolderPath(options)}".`));
  }

  /**
   * Set the function to invoke when an unrecognized command is run.
   * @param unrecognizedCommandHandler The function to call when an unrecognized command is run.
   */
  public onUnrecognizedCommand(unrecognizedCommandHandler: ((command: Command, options?: RunOptions) => (RunResult | Promise<RunResult>))): void {
    this.unrecognizedCommand = unrecognizedCommandHandler;
  }

  /**
   * Configure this FakeRunner so that all unrecognized commands will be passed through to its
   * inner runner.
   */
  public passthroughUnrecognized(): void {
    this.onUnrecognizedCommand((command: Command, options?: RunOptions) =>
      this.innerRunner.run(command, options));
  }

  /**
   * Set the fake result to return when the provided command is run.
   * @param command The command to fake.
   */
  public set(command: FakeCommand): void {
    this.fakeCommands.push(command);
  }

  /**
   * Indicate that when this Runner attempts to run the provided commandString it should just pass
   * the commandString through to the inner runner.
   * @param commandString The commandString to pass through to the inner runner.
   */
  public passthrough(command: Command, executionFolderPath?: string): void {
    this.set({
      executable: command.executable,
      args: command.args,
      executionFolderPath,
      result: () => this.innerRunner.run(command, { executionFolderPath })
    });
  }

  public async run(command: Command, options?: RunOptions): Promise<RunResult> {
    const commandString: string = commandToString(command);

    const executionFolderPath: string = getExecutionFolderPath(options);
    const fakeCommand: FakeCommand | undefined = last(this.fakeCommands, (registeredFakeCommand: FakeCommand) =>
      commandString === commandToString(registeredFakeCommand) &&
      (!registeredFakeCommand.executionFolderPath || executionFolderPath === registeredFakeCommand.executionFolderPath));

    let result: Promise<RunResult>;
    if (!fakeCommand) {
      result = Promise.resolve(this.unrecognizedCommand(command, options));
    } else {
      let runResult: RunResult | Promise<RunResult> | (() => RunResult | Promise<RunResult>) | undefined = fakeCommand.result;
      if (!runResult) {
        runResult = { exitCode: 0 };
      } else if (typeof runResult === "function") {
        runResult = runResult();
      }
      result = Promise.resolve(runResult);
    }

    return result;
  }
}

/**
 * The result of running a command.
 */
export interface RunResult {
  /**
   * The code that the process exited with.
   */
  exitCode?: number;
  /**
   * The text that the process wrote to its stdout stream.
   */
  stdout?: string;
  /**
   * The text that the process wrote to its stderr stream.
   */
  stderr?: string;
  /**
   * An error that occurred when trying to run the process.
   */
  error?: Error;
  /**
   * The id of the process.
   */
  processId?: number;
}

export interface RunOptions {
  /**
   * A function that will be used to write logs.
   */
  log?: (text: string) => Promise<any> | any;
  /**
   * The folder/directory where the command will be executed from.
   */
  executionFolderPath?: string;
  /**
   * Whether or not to write the command that will be executed to the console. Defaults to true.
   */
  showCommand?: boolean;
  /**
   * Whether or not to show the environment variables that have been passed to this command.
   */
  showEnvironmentVariables?: boolean;
  /**
   * Whether or not to write the command result to the console. Defaults to only show if the exit
   * code was non-zero.
   */
  showResult?: boolean | ((result: RunResult) => boolean);
  /**
   * Prefix added to log
   */
  capturePrefix?: string;
  /**
   * Whether or not to capture the command's output stream. If true or undefined, then the output
   * stream will be captured and returned in the RunResult's stdout property. If a function, then
   * the function will be called on each line of output text written by the process. If false, then
   * the command's output stream will be written to the parent process's output stream.
   */
  captureOutput?: boolean | ((outputLine: string) => void);
  /**
   * Whether or not to capture the command's error stream. If true or undefined, then the error
   * stream will be captured and returned in the RunResult's stderr property. If a function, then
   * the function will be called on each line of error text written by the process. If false, then
   * the command's error stream will be written to the parent process's error stream.
   */
  captureError?: boolean | ((errorLine: string) => void);
  /**
   * The runner that will be used to execute this command.
   */
  runner?: Runner;
  /**
   * The environment variables that will be added when the command is run.
   */
  environmentVariables?: StringMap<string>;
  /**
   * Throw on non-zero exit code
   */
  throwOnError?: boolean;
}

/**
 * Get an array of string arguments from the provided args.
 * @param args The args string or array of strings.
 */
export function getArgsArray(args: undefined | string | string[]): string[] {
  const argsArray: string[] = [];
  if (typeof args === "string") {
    argsArray.push(...args.split(" "));
  } else if (args) {
    argsArray.push(...args);
  }
  return argsArray;
}

/**
 * Get the showResult function that will determine whether the command's result will be logged.
 * @param showResult The showResult property from the command's RunOptions.
 */
export function getShowResultFunction(showResult: undefined | boolean | ((result: RunResult) => boolean)): (result: RunResult) => boolean {
  let result: (result: RunResult) => boolean;
  if (showResult === undefined) {
    result = (result: RunResult) => result.exitCode !== 0;
  } else if (typeof showResult === "boolean") {
    result = () => !!showResult;
  } else {
    result = showResult;
  }
  return result;
}

export async function logCommand(command: Command, options: RunOptions): Promise<void> {
  if (options && options.log && (options.showCommand == undefined || options.showCommand)) {
    let commandString: string = commandToString(command);
    if (options.executionFolderPath) {
      commandString = `${options.executionFolderPath}: ${commandString}`;
    }
    await Promise.resolve(options.log(commandString));
  }
}

export async function logEnvironmentVariables(options: RunOptions): Promise<void> {
  if (options && options.log && options.environmentVariables && options.showEnvironmentVariables) {
    await options.log("Environment Variables:");
    for (const [entryName, entryValue] of Object.entries(options.environmentVariables)) {
      await options.log(` "${entryName}": "${entryValue}"`);
    }
  }
}

export async function logResult(result: RunResult, options: RunOptions | undefined): Promise<void> {
  if (options && options.log) {
    const showResult: (result: RunResult) => boolean = getShowResultFunction(options.showResult);
    if (showResult(result)) {
      await Promise.resolve(options.log(`Exit Code: ${result.exitCode}`));
      if (result.stdout && (options.captureOutput === true || options.captureOutput === undefined)) {
        await Promise.resolve(options.log(`Output:`));
        await Promise.resolve(options.log(result.stdout));
      }
      if (result.stderr && (options.captureError === true || options.captureError === undefined)) {
        await Promise.resolve(options.log(`Error:`));
        await Promise.resolve(options.log(result.stderr));
      }
      if (result.error && (options.captureError === true || options.captureError === undefined)) {
        await Promise.resolve(options.log(`Error:`));
        await Promise.resolve(options.log(JSON.stringify(result.error, undefined, 2)));
      }
    }
  }
}

export function getChildProcessStdio(options: RunOptions): StdioOptions {
  return [
    "inherit",
    options.captureOutput === false ? "ignore" : "pipe",
    options.captureError === false ? "ignore" : "pipe"
  ];
}

/**
 * Run the provided command asynchronously.
 * @param command The command to run.
 * @param args The arguments to provide to the command.
 */
export async function run(command: string | Command, args?: string[], options: RunOptions = {}): Promise<RunResult> {
  if (typeof command === "string") {
    command = {
      executable: command,
    };
  }
  if (!command.args) {
    command.args = [];
  }

  if (args) {
    command.args.push(...args);
  }

  const runner: Runner = options.runner || new RealRunner();

  await logCommand(command, options);
  await logEnvironmentVariables(options);
  const result: RunResult = await runner.run(command, options);
  await logResult(result, options);

  if (options.throwOnError && result.exitCode) {
    throw new Error(`${command.executable} ${command.args.join(" ")} ${result.stderr || ""}`);
  }

  return result;
}
