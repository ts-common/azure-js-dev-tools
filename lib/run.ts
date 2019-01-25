import { ChildProcess, spawn, spawnSync, SpawnSyncReturns, StdioOptions } from "child_process";
import * as os from "os";
import { StringMap } from "./common";
import { normalize } from "./path";

/**
 * An object that runs a provided command.
 */
export interface Runner {
  /**
   * Run the provided command synchronously.
   * @param command The command to run.
   * @param args The arguments to the command to run.
   * @param options The options to use when running the command.
   */
  runSync(command: string, args: string | string[] | undefined, options: RunOptions | undefined): RunResult;

  /**
   * Run the provided command asynchronously.
   * @param command  The command to run.
   * @param args The arguments to the command to run.
   * @param options The options to use when running the command.
   */
  runAsync(command: string, args: string | string[] | undefined, options: RunOptions | undefined): Promise<RunResult>;
}

/**
 * A command runner that runs commands using a spawned process.
 */
export class RealRunner implements Runner {
  runSync(command: string, args: string | string[] | undefined, options: RunOptions | undefined): RunResult {
    options = options || {};
    command = normalize(command, os.platform());
    const argsArray: string[] = getArgsArray(args);
    const spawnSyncResult: SpawnSyncReturns<string> = spawnSync(command, argsArray, {
      cwd: options.executionFolderPath,
      encoding: "utf8",
      stdio: getChildProcessStdio(options)
    });
    return {
      exitCode: spawnSyncResult.status != undefined ? spawnSyncResult.status : undefined,
      stdout: spawnSyncResult.stdout != undefined ? spawnSyncResult.stdout : undefined,
      stderr: spawnSyncResult.stderr != undefined ? spawnSyncResult.stderr : undefined,
      error: spawnSyncResult.error != undefined ? spawnSyncResult.error : undefined,
      processId: spawnSyncResult.pid != undefined ? spawnSyncResult.pid : undefined
    };
  }

  runAsync(command: string, args: string | string[] | undefined, options: RunOptions | undefined): Promise<RunResult> {
    const runOptions: RunOptions = options || {};
    command = normalize(command, os.platform());
    const argsArray: string[] = getArgsArray(args);

    return new Promise((resolve, reject) => {
      let result: RunResult | undefined;
      const childProcess: ChildProcess = spawn(command, argsArray, {
        cwd: runOptions.executionFolderPath,
        stdio: getChildProcessStdio(runOptions)
      });

      let childProcessOutput = "";
      const captureOutputFunction: undefined | ((text: string) => void) = getCaptureStreamFunction(runOptions.captureOutput, (text: string) => childProcessOutput += text);
      if (captureOutputFunction) {
        childProcess.stdout.addListener("data", (data: Uint8Array) => captureOutputFunction(data.toString()));
      }

      let childProcessError = "";
      const captureErrorFunction: undefined | ((text: string) => void) = getCaptureStreamFunction(runOptions.captureError, (text: string) => childProcessError += text);
      if (captureErrorFunction) {
        childProcess.stderr.addListener("data", (data: Uint8Array) => captureErrorFunction(data.toString()));
      }

      const childProcessDone = (exitCode: number) => {
        if (result === undefined) {
          result = {
            exitCode,
            stdout: childProcessOutput == undefined ? undefined : childProcessOutput,
            stderr: childProcessError == undefined ? undefined : childProcessError,
            processId: childProcess.pid == undefined ? undefined : childProcess.pid,
          };

          resolve(result);
        }
      };
      childProcess.addListener("close", childProcessDone);
      childProcess.addListener("exit", childProcessDone);
      childProcess.addListener("error", reject);
    });
  }
}

/**
 * A fake command runner.
 */
export class FakeRunner implements Runner {
  private readonly results: StringMap<(() => RunResult)> = {};

  /**
   * Set the fake result to return when the provided command is run.
   * @param commandString The command to set the result for.
   * @param result The result to return when the provided command is run.
   */
  public set(commandString: string, result: RunResult | (() => RunResult)): void {
    this.results[commandString] = typeof result === "function" ? result : () => result;
  }

  private get(command: string, args: string | string[] | undefined): () => RunResult {
    const commandString: string = getCommandString(command, args);

    const result: (() => RunResult) | undefined = this.results[commandString];
    if (!result) {
      throw new Error(`No FakeRunner result has been registered for the command "${commandString}".`);
    }

    return result;
  }

  runSync(command: string, args: string | string[] | undefined): RunResult {
    const resultFunction: () => RunResult = this.get(command, args);
    return resultFunction();
  }

  runAsync(command: string, args: string | string[] | undefined): Promise<RunResult> {
    const resultFunction: () => RunResult = this.get(command, args);
    return new Promise((resolve, reject) => {
      try {
        resolve(resultFunction());
      } catch (error) {
        reject(error);
      }
    });
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
  log?: (text: string) => void;
  /**
   * The folder/directory where the command will be executed from.
   */
  executionFolderPath?: string;
  /**
   * Whether or not to write the command that will be executed to the console. Defaults to true.
   */
  showCommand?: boolean;
  /**
   * Whether or not to write the command result to the console. Defaults to only show if the exit
   * code was non-zero.
   */
  showResult?: boolean | ((result: RunResult) => boolean);
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

export function getCommandString(command: string, args: string | string[] | undefined): string {
  let result: string = command;
  if (args) {
    if (Array.isArray(args)) {
      args = args.join(" ");
    }
    if (args) {
      result += ` ${args}`;
    }
  }
  return result;
}

export function logCommand(command: string, args: string | string[] | undefined, options: RunOptions | undefined): void {
  if (options && options.log && (options.showCommand == undefined || options.showCommand)) {
    let commandString: string = getCommandString(command, args);
    if (options.executionFolderPath) {
      commandString = `${options.executionFolderPath}: ${commandString}`;
    }
    options.log(commandString);
  }
}

export function logResult(result: RunResult, options: RunOptions | undefined): void {
  if (options && options.log) {
    const showResult: (result: RunResult) => boolean = getShowResultFunction(options.showResult);
    if (showResult(result)) {
      options.log(`Exit Code: ${result.exitCode}`);
      if (result.stdout && options.captureOutput === true) {
        options.log(`Output:`);
        options.log(result.stdout);
      }
      if (result.stderr && options.captureError === true) {
        options.log(`Error:`);
        options.log(result.stderr);
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
 * Run the provided command synchronously.
 */
export function runSync(command: string, args?: string | string[], options?: RunOptions): RunResult {
  options = options || {};

  logCommand(command, args, options);

  const runner: Runner = options.runner || new RealRunner();
  const result: RunResult = runner.runSync(command, args, options);
  if (typeof options.captureOutput === "function" && result.stdout) {
    options.captureOutput(result.stdout);
  }
  if (typeof options.captureError === "function" && result.stderr) {
    options.captureError(result.stderr);
  }

  logResult(result, options);

  return result;
}

export function getCaptureStreamFunction(captureOption: undefined | boolean | ((text: string) => void), defaultCaptureFunction: (text: string) => void): undefined | ((text: string) => void) {
  let result: undefined | ((text: string) => void);
  if (captureOption === false) {
    result = undefined;
  } else if (captureOption === undefined || captureOption === true) {
    result = defaultCaptureFunction;
  } else {
    result = captureOption;
  }
  return result;
}

/**
 * Run the provided command asynchronously.
 * @param command The command to run.
 * @param args The arguments to provide to the command.
 */
export function runAsync(command: string, args: string | string[], options?: RunOptions): Promise<RunResult> {
  options = options || {};
  const runner: Runner = options.runner || new RealRunner();

  logCommand(command, args, options);
  return runner.runAsync(command, args, options)
    .then((result: RunResult) => {
      logResult(result, options);
      return result;
    });
}
