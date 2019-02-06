import { ChildProcess, spawn, StdioOptions } from "child_process";
import * as os from "os";
import { toPromise } from "./common";
import { normalize } from "./path";

/**
 * An object that runs a provided command.
 */
export interface Runner {
  /**
   * Run the provided command asynchronously.
   * @param command  The command to run.
   * @param args The arguments to the command to run.
   * @param options The options to use when running the command.
   */
  run(command: string, args: string | string[] | undefined, options: RunOptions | undefined): Promise<RunResult>;
}

/**
 * A command runner that runs commands using a spawned process.
 */
export class RealRunner implements Runner {
  run(command: string, args: string | string[] | undefined, options: RunOptions | undefined): Promise<RunResult> {
    const runOptions: RunOptions = options || {};
    command = normalize(command, os.platform());
    const argsArray: string[] = getArgsArray(args);

    const childProcess: ChildProcess = spawn(command, argsArray, {
      cwd: runOptions.executionFolderPath,
      stdio: getChildProcessStdio(runOptions)
    });

    let childProcessOutput: string | undefined;
    let stdoutCaptured: Promise<void> = Promise.resolve();
    if (runOptions.captureOutput !== false) {
      let captureOutput = runOptions.captureOutput;
      if (captureOutput === undefined || captureOutput === true) {
        childProcessOutput = "";
        captureOutput = (text: string) => childProcessOutput += text;
      }
      const captureFunction: ((text: string) => void) = captureOutput;
      stdoutCaptured = new Promise((resolve, reject) => {
        childProcess.stdout.addListener("data", captureFunction);
        childProcess.stdout.addListener("error", reject);
        childProcess.stdout.addListener("end", resolve);
      });
    }

    let childProcessError: string | undefined;
    let stderrCaptured: Promise<void> = Promise.resolve();
    if (runOptions.captureError !== false) {
      let captureError = runOptions.captureError;
      if (captureError === undefined || captureError === true) {
        childProcessError = "";
        captureError = (text: string) => childProcessError += text;
      }
      const captureFunction: ((text: string) => void) = captureError;
      stderrCaptured = new Promise((resolve, reject) => {
        childProcess.stderr.addListener("data", captureFunction);
        childProcess.stderr.addListener("error", reject);
        childProcess.stderr.addListener("end", resolve);
      });
    }

    let processExitCode: number | undefined;
    const processDone: Promise<RunResult> = new Promise((resolve, reject) => {
      childProcess.addListener("exit", (exitCode: number) => {
        processExitCode = exitCode;
        resolve();
      });
      childProcess.addListener("error", reject);
    });

    return Promise.all([processDone, stdoutCaptured, stderrCaptured])
      .then(() => {
        return {
          exitCode: processExitCode,
          stdout: childProcessOutput,
          stderr: childProcessError,
          processId: childProcess.pid,
        };
      })
      .catch((error: Error) => {
        return {
          error
        };
      });
  }
}

export interface FakeCommand {
  command: string;
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

  constructor(innerRunner?: Runner) {
    this.innerRunner = innerRunner || new RealRunner();
  }

  /**
   * Set the fake result to return when the provided command is run.
   * @param command The command to fake.
   */
  public set(command: FakeCommand): void {
    if (!command.result) {
      command.result = { exitCode: 0 };
    }
    this.fakeCommands.push(command);
  }

  /**
   * Indicate that when this Runner attempts to run the provided commandString it should just pass
   * the commandString through to the inner runner.
   * @param commandString The commandString to pass through to the inner runner.
   */
  public passthrough(command: string, args?: string[], executionFolderPath?: string): void {
    this.set({
      command,
      args,
      executionFolderPath,
      result: () => this.innerRunner.run(command, args, { executionFolderPath })
    });
  }

  public async run(command: string, args: string | string[] | undefined, options?: RunOptions): Promise<RunResult> {
    const commandString: string = getCommandString(command, args);

    let fakeCommand: FakeCommand | undefined;
    const executionFolderPath: string = (options && options.executionFolderPath) || process.cwd();
    for (const registeredFakeCommand of this.fakeCommands) {
      if (commandString === getCommandString(registeredFakeCommand.command, registeredFakeCommand.args) &&
        (!registeredFakeCommand.executionFolderPath || executionFolderPath === registeredFakeCommand.executionFolderPath)) {
        fakeCommand = registeredFakeCommand;
        break;
      }
    }

    let result: Promise<RunResult>;
    if (!fakeCommand) {
      result = Promise.reject(new Error(`No FakeRunner result has been registered for the command "${commandString}"${executionFolderPath ? ` at "${executionFolderPath}"` : ""}.`));
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

export async function logCommand(command: string, args: string | string[] | undefined, options: RunOptions | undefined): Promise<void> {
  if (options && options.log && (options.showCommand == undefined || options.showCommand)) {
    let commandString: string = getCommandString(command, args);
    if (options.executionFolderPath) {
      commandString = `${options.executionFolderPath}: ${commandString}`;
    }
    await toPromise(options.log(commandString));
  }
}

export async function logResult(result: RunResult, options: RunOptions | undefined): Promise<void> {
  if (options && options.log) {
    const showResult: (result: RunResult) => boolean = getShowResultFunction(options.showResult);
    if (showResult(result)) {
      await toPromise(options.log(`Exit Code: ${result.exitCode}`));
      if (result.stdout && (options.captureOutput === true || options.captureOutput === undefined)) {
        await toPromise(options.log(`Output:`));
        await toPromise(options.log(result.stdout));
      }
      if (result.stderr && (options.captureError === true || options.captureError === undefined)) {
        await toPromise(options.log(`Error:`));
        await toPromise(options.log(result.stderr));
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
export async function run(command: string, args?: string | string[], options?: RunOptions): Promise<RunResult> {
  options = options || {};
  const runner: Runner = options.runner || new RealRunner();

  await logCommand(command, args, options);
  const result: RunResult = await runner.run(command, args, options);
  await logResult(result, options);

  return result;
}
