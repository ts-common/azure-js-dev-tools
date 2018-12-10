import * as path from "path";
import { RunOptions, RunResult, runSync } from "./run";

/**
 * Get the lines that exist in the provided text.
 * @param text The text to get the lines from.
 * @returns The lines that exist in the provided text.
 */
function getLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * The result of running a git operation.
 */
export interface GitRunResult extends RunResult {
  /**
   * The error that occurred while running the git operation.
   */
  error?: Error;
}

export function gitRun(args: string | string[], options?: RunOptions): RunResult {
  return runSync("git", args, options);
}

export function gitFetch(options?: RunOptions): RunResult {
  return gitRun("fetch -p", options);
}

export function gitMergeOriginMaster(options?: RunOptions): RunResult {
  return gitRun("merge origin master", options);
}

export interface GitCheckoutResult extends GitRunResult {
  /**
   * Get the files that would've been overwritten if this checkout operation had taken place. This
   * property will only be populated in an error scenario.
   */
  filesThatWouldBeOverwritten?: string[];
}

export function gitCheckout(refId: string, options?: RunOptions): GitCheckoutResult {
  const runResult: RunResult = gitRun(`checkout ${refId}`, options);
  let filesThatWouldBeOverwritten: string[] | undefined;
  if (runResult.stderr) {
    const stderrLines: string[] = runResult.stderr.split(/\r?\n/);
    if (stderrLines[0].trim() === "error: The following untracked working tree files would be overwritten by checkout:") {
      filesThatWouldBeOverwritten = [];
      let lineIndex = 1;
      while (lineIndex < stderrLines.length) {
        const line: string = stderrLines[lineIndex];
        if (line.trim() === "Please move or remove them before you switch branches.") {
          break;
        } else {
          filesThatWouldBeOverwritten.push(path.join((options && options.executionFolderPath) || "", line.trim()));
          ++lineIndex;
        }
      }
    }
  }
  return {
    ...runResult,
    filesThatWouldBeOverwritten
  };
}

export function gitPull(options?: RunOptions): RunResult {
  return gitRun(`pull`, options);
}

export function gitPush(options?: RunOptions): RunResult {
  return gitRun(`push`, options);
}

export function gitAddAll(options?: RunOptions): RunResult {
  return gitRun("add *", options);
}

export function gitCommit(commitMessage: string, options?: RunOptions): RunResult {
  return gitRun(["commit", "-m", commitMessage], options);
}

export function gitDeleteLocalBranch(branchName: string, options?: RunOptions): RunResult {
  return gitRun(`branch -D ${branchName}`, options);
}

/**
 * The result of a "git diff" command.
 */
export interface GitDiffResult extends GitRunResult {
  /**
   * The files that are reported as being changed by the diff command.
   */
  filesChanged: string[];
}

export function gitDiff(baseCommitSha: string, headCommitSha: string, options?: RunOptions): GitDiffResult {
  const commandResult: RunResult = gitRun(`diff --name-only ${baseCommitSha} ${headCommitSha}`, options);
  const filesChanged: string[] = [];
  const repositoryFolderPath: string | undefined = (options && options.executionFolderPath) || process.cwd();
  for (const fileChanged of getLines(commandResult.stdout)) {
    if (fileChanged) {
      filesChanged.push(path.resolve(repositoryFolderPath, fileChanged));
    }
  }
  return {
    ...commandResult,
    filesChanged
  };
}

export interface GitBranchResult extends GitRunResult {
  localBranches: string[];
  currentBranch: string;
}

export function gitBranch(options?: RunOptions): GitBranchResult {
  const commandResult: RunResult = gitRun("branch", options);
  let currentBranch = "";
  const localBranches: string[] = [];
  for (let branch of commandResult.stdout.split(/\r?\n/)) {
    if (branch) {
      branch = branch.trim();
      if (branch) {
        if (branch.startsWith("*")) {
          branch = branch.substring(1).trimLeft();
          currentBranch = branch;
        }
        localBranches.push(branch);
      }
    }
  }
  return {
    ...commandResult,
    localBranches,
    currentBranch,
  };
}

export interface GitStatusResult extends GitRunResult {
  /**
   * The current local branch.
   */
  localBranch?: string;
  /**
   * The remote tracking branch for the current local branch.
   */
  remoteBranch?: string;
  /**
   * Whether or not the current local branch has uncommitted changes.
   */
  hasUncommittedChanges?: boolean;
  /**
   * Files that have been modified and staged.
   */
  stagedModifiedFiles?: string[];
  /**
   * Files that have been deleted and staged.
   */
  stagedDeletedFiles?: string[];
  /**
   * Files that have been modified but not staged yet.
   */
  notStagedModifiedFiles?: string[];
  /**
   * Files that have been deleted but not staged yet.
   */
  notStagedDeletedFiles?: string[];
  /**
   * Files that don't currently exist in the repository.
   */
  untrackedFiles?: string[];
}

type StatusParseState = "CurrentBranch" | "RemoteBranch" | "Changes" | "ChangesToBeCommitted" | "ChangesNotStagedForCommit" | "UntrackedFiles";

function isChangesNotStagedForCommitHeader(text: string): boolean {
  return !!text.match(/Changes not staged for commit:/i);
}

function isUntrackedFilesHeader(text: string): boolean {
  return !!text.match(/Untracked files:/i);
}

/**
 * Run "git status".
 */
export function gitStatus(options?: RunOptions): GitStatusResult {
  const folderPath: string = (options && options.executionFolderPath) || process.cwd();

  let parseState: StatusParseState = "CurrentBranch";
  let localBranch: string | undefined;
  let remoteBranch: string | undefined;
  let hasUncommittedChanges = false;
  let stagedModifiedFiles: string[] | undefined;
  let stagedDeletedFiles: string[] | undefined;
  let notStagedModifiedFiles: string[] | undefined;
  let notStagedDeletedFiles: string[] | undefined;
  let untrackedFiles: string[] | undefined;

  const runResult: RunResult = gitRun("status", options);
  const lines: string[] = getLines(runResult.stdout);
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line: string = lines[lineIndex].trim();
    if (!line) {
      ++lineIndex;
    } else {
      switch (parseState) {
        case "CurrentBranch":
          localBranch = line.match(/On branch (.*)/i)![1];
          parseState = "RemoteBranch";
          ++lineIndex;
          break;

        case "RemoteBranch":
          const remoteBranchMatch: RegExpMatchArray | null = line.match(/.*\'(.*)\'.*/);
          if (remoteBranchMatch) {
            remoteBranch = remoteBranchMatch[1];
            ++lineIndex;
          }
          parseState = "Changes";
          break;

        case "Changes":
          hasUncommittedChanges = !line.match(/nothing to commit, working tree clean/i);
          if (hasUncommittedChanges) {
            if (line.match(/Changes to be committed:/i)) {
              parseState = "ChangesToBeCommitted";
            } if (isChangesNotStagedForCommitHeader(line)) {
              parseState = "ChangesNotStagedForCommit";
            } else if (isUntrackedFilesHeader(line)) {
              parseState = "UntrackedFiles";
            }
          }
          ++lineIndex;
          break;

        case "ChangesToBeCommitted":
          if (!line.match(/\(use "git reset HEAD <file>..." to unstage\)/i)) {
            const modifiedMatch: RegExpMatchArray | null = line.match(/modified:(.*)/i);
            if (modifiedMatch) {
              if (!stagedModifiedFiles) {
                stagedModifiedFiles = [];
              }
              const modifiedFilePath: string = path.join(folderPath, modifiedMatch[1].trim());
              stagedModifiedFiles.push(modifiedFilePath);
            } else {
              const deletedMatch: RegExpMatchArray | null = line.match(/deleted:(.*)/i);
              if (deletedMatch) {
                if (!stagedDeletedFiles) {
                  stagedDeletedFiles = [];
                }
                const deletedFilePath: string = path.join(folderPath, deletedMatch[1].trim());
                stagedDeletedFiles.push(deletedFilePath);
              } else if (isChangesNotStagedForCommitHeader(line)) {
                parseState = "ChangesNotStagedForCommit";
              } else if (isUntrackedFilesHeader(line)) {
                parseState = "UntrackedFiles";
              }
            }
          }
          ++lineIndex;
          break;

        case "ChangesNotStagedForCommit":
          if (!line.match(/\(use "git add <file>..." to update what will be committed\)/i) && !line.match(/\(use "git checkout -- <file>..." to discard changes in working directory\)/i)) {
            const modifiedMatch: RegExpMatchArray | null = line.match(/modified:(.*)/i);
            if (modifiedMatch) {
              if (!notStagedModifiedFiles) {
                notStagedModifiedFiles = [];
              }
              const modifiedFilePath: string = path.join(folderPath, modifiedMatch[1].trim());
              notStagedModifiedFiles.push(modifiedFilePath);
            } else {
              const deletedMatch: RegExpMatchArray | null = line.match(/deleted:(.*)/i);
              if (deletedMatch) {
                if (!notStagedDeletedFiles) {
                  notStagedDeletedFiles = [];
                }
                const deletedFilePath: string = path.join(folderPath, deletedMatch[1].trim());
                notStagedDeletedFiles.push(deletedFilePath);
              } else if (isUntrackedFilesHeader(line)) {
                parseState = "UntrackedFiles";
              }
            }
          }
          ++lineIndex;
          break;

        case "UntrackedFiles":
          if (!line.match(/\(use "git add <file>..." to include in what will be committed\)/i) && !line.match(/nothing added to commit but untracked files present \(use "git add" to track\)/i)) {
            if (!untrackedFiles) {
              untrackedFiles = [];
            }
            const resolveUntrackedFilePath: string = path.resolve(folderPath, line);
            untrackedFiles.push(resolveUntrackedFilePath);
          }
          ++lineIndex;
          break;
      }
    }
  }
  return {
    ...runResult,
    localBranch,
    remoteBranch,
    hasUncommittedChanges,
    stagedModifiedFiles,
    stagedDeletedFiles,
    notStagedModifiedFiles,
    notStagedDeletedFiles,
    untrackedFiles,
  };
}

export class GitScope {
  constructor(private options: RunOptions) {
  }

  public run(args: string | string[], options?: RunOptions): RunResult {
    return gitRun(args, {
      ...this.options,
      ...options,
    });
  }

  public fetch(options?: RunOptions): RunResult {
    return gitFetch({
      ...this.options,
      ...options,
    });
  }

  public mergeOriginMaster(options?: RunOptions): RunResult {
    return gitMergeOriginMaster({
      ...this.options,
      ...options
    });
  }

  public checkout(refId: string, options?: RunOptions): GitCheckoutResult {
    return gitCheckout(refId, {
      ...this.options,
      ...options
    });
  }

  public pull(options?: RunOptions): RunResult {
    return gitPull({
      ...this.options,
      ...options
    });
  }

  public push(options?: RunOptions): RunResult {
    return gitPush({
      ...this.options,
      ...options
    });
  }

  public addAll(options?: RunOptions): RunResult {
    return gitAddAll({
      ...this.options,
      ...options
    });
  }

  public commit(commitMessage: string, options?: RunOptions): RunResult {
    return gitCommit(commitMessage, {
      ...this.options,
      ...options
    });
  }

  public deleteLocalBranch(branchName: string, options?: RunOptions): RunResult {
    return gitDeleteLocalBranch(branchName, {
      ...this.options,
      ...options
    });
  }

  public diff(baseCommitSha: string, headCommitSha: string, options?: RunOptions): GitDiffResult {
    return gitDiff(baseCommitSha, headCommitSha, {
      ...this.options,
      ...options,
    });
  }

  public branch(options?: RunOptions): GitBranchResult {
    return gitBranch({
      ...this.options,
      ...options,
    });
  }

  public status(options?: RunOptions): GitStatusResult {
    return gitStatus({
      ...this.options,
      ...options,
    });
  }
}