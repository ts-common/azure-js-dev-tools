import { spawnSync, SpawnSyncReturns, spawn, ChildProcess, StdioOptions } from "child_process";

/**
 * The result of running a command.
 */
export interface RunResult {
  /**
   * The code that the process exited with.
   */
  exitCode: number;
  /**
   * The text that the process wrote to its stdout stream.
   */
  stdout: string;
  /**
   * The text that the process wrote to its stderr stream.
   */
  stderr: string;
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
   * If this property is specified, then the command will never be run and this result will be
   * returned instead. This is used for unit testing commands.
   */
  mockResult?: RunResult;
  /**
   * If this property is specified, then the command will never be run and this error will be
   * returned instead. This is used for unit testing commands, and mockError takes precedence over
   * mockResult.
   */
  mockError?: Error;
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

export function logCommand(command: string, argsArray: string[], options: RunOptions): void {
  if (options.log && (options.showCommand == undefined || options.showCommand)) {
    let commandString = `${command} ${argsArray.join(" ")}`;
    if (options.executionFolderPath) {
      commandString = `${options.executionFolderPath}: ${commandString}`;
    }
    options.log(commandString);
  }
}

export function logResult(result: RunResult, options: RunOptions): void {
  const showResult: (result: RunResult) => boolean = getShowResultFunction(options.showResult);
  if (options.log && showResult(result)) {
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
  const runOptions: RunOptions = options || {};
  const argsArray: string[] = getArgsArray(args);
  logCommand(command, argsArray, runOptions);

  let result: RunResult;
  if (runOptions.mockError) {
    throw runOptions.mockError;
  } else if (runOptions.mockResult) {
    result = runOptions.mockResult;
  } else {
    const spawnSyncResult: SpawnSyncReturns<string> = spawnSync(command, argsArray, {
      cwd: runOptions.executionFolderPath,
      encoding: "utf8",
      stdio: getChildProcessStdio(runOptions)
    });
    if (typeof runOptions.captureOutput === "function") {
      runOptions.captureOutput(spawnSyncResult.stdout);
    }
    if (typeof runOptions.captureError === "function") {
      runOptions.captureError(spawnSyncResult.stderr);
    }
    result = {
      exitCode: spawnSyncResult.status,
      stdout: spawnSyncResult.stdout,
      stderr: spawnSyncResult.stderr,
    };
  }

  logResult(result, runOptions);

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
  const runOptions: RunOptions = options || {};
  const argsArray: string[] = getArgsArray(args);
  logCommand(command, argsArray, runOptions);

  return new Promise((resolve, reject) => {
    let result: RunResult | undefined;
    if (runOptions.mockError) {
      reject(runOptions.mockError);
    } else if (runOptions.mockResult) {
      resolve(runOptions.mockResult);
    } else {
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
            stdout: childProcessOutput,
            stderr: childProcessError
          };

          logResult(result, runOptions);

          resolve(result);
        }
      };
      childProcess.addListener("close", childProcessDone);
      childProcess.addListener("exit", childProcessDone);
      childProcess.addListener("error", reject);
    }
  });
}