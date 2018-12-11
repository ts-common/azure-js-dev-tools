import { spawnSync, SpawnSyncReturns } from "child_process";

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

/**
 * The different options that can be provided to runSync().
 */
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
   * Whether or not to write the command's output to the console. Defaults to show the output only
   * if the exitCode is non-zero.
   */
  showOutput?: boolean | ((result: RunResult) => boolean);
  /**
   * If this property is specified, then the command will never be run and this result will be
   * returned instead. This is used for unit testing commands.
   */
  mockResult?: RunResult;
}

/**
 * Run the provided command synchronously.
 */
export function runSync(command: string, args: string | string[], options?: RunOptions): RunResult {
  const argsArray: string[] = [];
  if (typeof args === "string") {
    argsArray.push(...args.split(" "));
  } else {
    argsArray.push(...args);
  }

  const cwd: string | undefined = options && options.executionFolderPath;
  const log: ((text: string) => void) | undefined = options && options.log;
  const showCommand: boolean = !options || options.showCommand == undefined || options.showCommand;
  let showOutput = (result: RunResult) => result.exitCode !== 0;
  if (options && options.showOutput != undefined) {
    if (typeof options.showOutput === "boolean") {
      showOutput = () => !!options.showOutput;
    } else {
      showOutput = options.showOutput;
    }
  }

  if (log && showCommand) {
    let commandString = `${command} ${argsArray.join(" ")}`;
    if (cwd) {
      commandString = `${cwd}: ${commandString}`;
    }
    log(commandString);
  }

  let result: RunResult;
  if (options && options.mockResult) {
    result = options.mockResult;
  } else {
    const spawnSyncResult: SpawnSyncReturns<string> = spawnSync(command, argsArray, {
      cwd,
      encoding: "utf8",
    });
    result = {
      exitCode: spawnSyncResult.status,
      stdout: spawnSyncResult.stdout,
      stderr: spawnSyncResult.stderr,
    };
  }

  if (log && showOutput(result)) {
    log(`Exit Code: ${result.exitCode}`);
    if (result.stdout) {
      log(`Output:`);
      log(result.stdout);
    }
    if (result.stderr) {
      log(`Error:`);
      log(result.stderr);
    }
  }

  return result;
}