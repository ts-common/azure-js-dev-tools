import { getLines } from "./common";
import { joinPath } from "./path";
import { RunOptions, RunResult, run } from "./run";

/**
 * The result of running a git operation.
 */
export interface GitRunResult extends RunResult {
  /**
   * The error that occurred while running the git operation.
   */
  error?: Error;
}

export function git(args: string | string[], options?: RunOptions): Promise<GitRunResult> {
  return run("git", args, options);
}

/**
 * Options that can be passed to `git fetch`.
 */
export interface GitFetchOptions extends RunOptions {
  /**
   * Before fetching, remove any remote-tracking references that no longer exist on the remote. Tags
   * are not subject to pruning if they are fetched only because of the default tag auto-following
   * or due to a --tags option. However, if tags are fetched due to an explicit refspec (either on
   * the command line or in the remote configuration, for example if the remote was cloned with the
   * --mirror option), then they are also subject to pruning. Supplying --prune-tags is a shorthand
   * for providing the tag refspec.
   */
  prune?: boolean;
}

/**
 * Download objects and refs from another repository.
 * @param options The options that can be passed to `git fetch`.
 */
export function gitFetch(options?: GitFetchOptions): Promise<GitRunResult> {
  options = options || {};
  let command = "fetch";
  if (options.prune) {
    command += " --prune";
  }
  return git(command, options);
}

export function gitMergeOriginMaster(options?: RunOptions): Promise<GitRunResult> {
  return git("merge origin master", options);
}

/**
 * Options that can be passed to gitClone().
 */
export interface GitCloneOptions extends RunOptions {
  /**
   * Operate quietly. Progress is not reported to the standard error stream.
   */
  quiet?: boolean;
  /**
   * Run verbosely. Does not affect the reporting of progress status to the standard error stream.
   */
  verbose?: boolean;
  /**
   * Instead of using the remote name "origin" to keep track of the upstream repository, use this value.
   */
  origin?: string;
  /**
   * Instead of pointing the newly created HEAD to the branch pointed to by the cloned repository’s
   * HEAD, point to this value's branch instead. In a non-bare repository, this is the branch that
   * will be checked out. This value can also take tags and detaches the HEAD at that commit in the
   * resulting repository.
   */
  branch?: string;
  /**
   * Create a shallow clone with a history truncated to the specified number of commits. Implies
   * "single-branch"=true unless "no-single-branch"=true is given to fetch the histories near the
   * tips of all branches. If you want to clone submodules shallowly, also use
   * "shallow-submodules"=true.
   */
  depth?: number;
  /**
   * The name of a new directory to clone into. The "humanish" part of the source repository is used
   * if no directory is explicitly given (repo for /path/to/repo.git and foo for host.xz:foo/.git).
   * Cloning into an existing directory is only allowed if the directory is empty.
   */
  directory?: string;
}

/**
 * Clone the repository with the provided URI.
 * @param gitUri The repository URI to clone.
 * @param options The options that can be passed to "git clone".
 */
export function gitClone(gitUri: string, options?: GitCloneOptions): Promise<GitRunResult> {
  options = options || {};
  let command = `clone`;
  if (options.quiet) {
    command += ` --quiet`;
  }
  if (options.verbose) {
    command += ` --verbose`;
  }
  if (options.origin) {
    command += ` --origin ${options.origin}`;
  }
  if (options.branch) {
    command += ` --branch ${options.branch}`;
  }
  if (options.depth != undefined) {
    command += ` --depth ${options.depth}`;
  }
  command += ` ${gitUri}`;
  if (options.directory) {
    command += ` ${options.directory}`;
  }
  return git(command, options);
}

export interface GitCheckoutResult extends GitRunResult {
  /**
   * Get the files that would've been overwritten if this checkout operation had taken place. This
   * property will only be populated in an error scenario.
   */
  filesThatWouldBeOverwritten?: string[];
}

export async function gitCheckout(refId: string, options?: RunOptions): Promise<GitCheckoutResult> {
  const runResult: GitRunResult = await git(`checkout ${refId}`, options);
  let filesThatWouldBeOverwritten: string[] | undefined;
  if (runResult.stderr) {
    const stderrLines: string[] = getLines(runResult.stderr);
    if (stderrLines[0].trim() === "error: The following untracked working tree files would be overwritten by checkout:") {
      filesThatWouldBeOverwritten = [];
      let lineIndex = 1;
      while (lineIndex < stderrLines.length) {
        const line: string = stderrLines[lineIndex];
        if (line.trim() === "Please move or remove them before you switch branches.") {
          break;
        } else {
          filesThatWouldBeOverwritten.push(joinPath((options && options.executionFolderPath) || "", line.trim()));
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

export function gitPull(options?: RunOptions): Promise<GitRunResult> {
  return git(`pull`, options);
}

export function gitPush(options?: RunOptions): Promise<GitRunResult> {
  return git(`push`, options);
}

export function gitAddAll(options?: RunOptions): Promise<GitRunResult> {
  return git("add *", options);
}

export function gitCommit(commitMessage: string, options?: RunOptions): Promise<GitRunResult> {
  return git(["commit", "-m", commitMessage], options);
}

export function gitDeleteLocalBranch(branchName: string, options?: RunOptions): Promise<GitRunResult> {
  return git(`branch -D ${branchName}`, options);
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

export async function gitDiff(baseCommitSha: string, headCommitSha: string, options?: RunOptions): Promise<GitDiffResult> {
  const commandResult: RunResult = await git(`diff --name-only ${baseCommitSha} ${headCommitSha}`, options);
  const filesChanged: string[] = [];
  const repositoryFolderPath: string | undefined = (options && options.executionFolderPath) || process.cwd();
  for (const fileChanged of getLines(commandResult.stdout)) {
    if (fileChanged) {
      filesChanged.push(joinPath(repositoryFolderPath, fileChanged));
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

const branchDetachedHeadRegExp: RegExp = /\(HEAD detached at (.*)\)/;
export async function gitBranch(options?: RunOptions): Promise<GitBranchResult> {
  const commandResult: RunResult = await git("branch", options);
  let currentBranch = "";
  const localBranches: string[] = [];
  for (let branch of getLines(commandResult.stdout)) {
    if (branch) {
      branch = branch.trim();
      if (branch) {
        if (branch.startsWith("*")) {
          branch = branch.substring(1).trimLeft();
          const detachedHeadMatch: RegExpMatchArray | null = branch.match(branchDetachedHeadRegExp);
          if (detachedHeadMatch) {
            branch = detachedHeadMatch[1];
          }
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
  hasUncommittedChanges: boolean;
  /**
   * Staged, not staged, and untracked files that have either been modified, added, or deleted.
   */
  modifiedFiles: string[];
  /**
   * Files that have been modified and staged.
   */
  stagedModifiedFiles: string[];
  /**
   * Files that have been deleted and staged.
   */
  stagedDeletedFiles: string[];
  /**
   * Files that have been modified but not staged yet.
   */
  notStagedModifiedFiles: string[];
  /**
   * Files that have been deleted but not staged yet.
   */
  notStagedDeletedFiles: string[];
  /**
   * Files that don't currently exist in the repository.
   */
  untrackedFiles: string[];
}

type StatusParseState = "CurrentBranch" | "RemoteBranch" | "Changes" | "ChangesToBeCommitted" | "ChangesNotStagedForCommit" | "UntrackedFiles";

function isChangesNotStagedForCommitHeader(text: string): boolean {
  return !!text.match(/Changes not staged for commit:/i);
}

function isUntrackedFilesHeader(text: string): boolean {
  return !!text.match(/Untracked files:/i);
}

const statusDetachedHeadRegExp: RegExp = /HEAD detached at (.*)/i;
const onBranchRegExp: RegExp = /On branch (.*)/i;

/**
 * Run "git status".
 */
export async function gitStatus(options?: RunOptions): Promise<GitStatusResult> {
  const folderPath: string = (options && options.executionFolderPath) || process.cwd();

  let parseState: StatusParseState = "CurrentBranch";
  let localBranch: string | undefined;
  let remoteBranch: string | undefined;
  let hasUncommittedChanges = false;
  const stagedModifiedFiles: string[] = [];
  const stagedDeletedFiles: string[] = [];
  const notStagedModifiedFiles: string[] = [];
  const notStagedDeletedFiles: string[] = [];
  const untrackedFiles: string[] = [];

  const runResult: RunResult = await git("status", options);
  const lines: string[] = getLines(runResult.stdout);
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line: string = lines[lineIndex].trim();
    if (!line) {
      ++lineIndex;
    } else {
      switch (parseState) {
        case "CurrentBranch":
          const onBranchMatch: RegExpMatchArray | null = line.match(onBranchRegExp);
          if (onBranchMatch) {
            localBranch = onBranchMatch[1];
          } else {
            const detachedHeadMatch: RegExpMatchArray | null = line.match(statusDetachedHeadRegExp);
            if (detachedHeadMatch) {
              localBranch = detachedHeadMatch[1];
            }
          }
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
              const modifiedFilePath: string = joinPath(folderPath, modifiedMatch[1].trim());
              stagedModifiedFiles.push(modifiedFilePath);
            } else {
              const deletedMatch: RegExpMatchArray | null = line.match(/deleted:(.*)/i);
              if (deletedMatch) {
                const deletedFilePath: string = joinPath(folderPath, deletedMatch[1].trim());
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
              const modifiedFilePath: string = joinPath(folderPath, modifiedMatch[1].trim());
              notStagedModifiedFiles.push(modifiedFilePath);
            } else {
              const deletedMatch: RegExpMatchArray | null = line.match(/deleted:(.*)/i);
              if (deletedMatch) {
                const deletedFilePath: string = joinPath(folderPath, deletedMatch[1].trim());
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
            const resolveUntrackedFilePath: string = joinPath(folderPath, line);
            untrackedFiles.push(resolveUntrackedFilePath);
          }
          ++lineIndex;
          break;
      }
    }
  }

  const modifiedFiles: string[] = [];
  if (hasUncommittedChanges) {
    modifiedFiles.push(
      ...stagedModifiedFiles,
      ...stagedDeletedFiles,
      ...notStagedModifiedFiles,
      ...notStagedDeletedFiles,
      ...untrackedFiles);
  }

  return {
    ...runResult,
    localBranch,
    remoteBranch,
    hasUncommittedChanges,
    modifiedFiles,
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

  public run(args: string | string[], options?: RunOptions): Promise<GitRunResult> {
    return git(args, {
      ...this.options,
      ...options,
    });
  }

  public fetch(options?: RunOptions): Promise<GitRunResult> {
    return gitFetch({
      ...this.options,
      ...options,
    });
  }

  public mergeOriginMaster(options?: RunOptions): Promise<GitRunResult> {
    return gitMergeOriginMaster({
      ...this.options,
      ...options
    });
  }

  public checkout(refId: string, options?: RunOptions): Promise<GitCheckoutResult> {
    return gitCheckout(refId, {
      ...this.options,
      ...options
    });
  }

  public pull(options?: RunOptions): Promise<GitRunResult> {
    return gitPull({
      ...this.options,
      ...options
    });
  }

  public push(options?: RunOptions): Promise<GitRunResult> {
    return gitPush({
      ...this.options,
      ...options
    });
  }

  public addAll(options?: RunOptions): Promise<GitRunResult> {
    return gitAddAll({
      ...this.options,
      ...options
    });
  }

  public commit(commitMessage: string, options?: RunOptions): Promise<GitRunResult> {
    return gitCommit(commitMessage, {
      ...this.options,
      ...options
    });
  }

  public deleteLocalBranch(branchName: string, options?: RunOptions): Promise<GitRunResult> {
    return gitDeleteLocalBranch(branchName, {
      ...this.options,
      ...options
    });
  }

  public diff(baseCommitSha: string, headCommitSha: string, options?: RunOptions): Promise<GitDiffResult> {
    return gitDiff(baseCommitSha, headCommitSha, {
      ...this.options,
      ...options,
    });
  }

  public branch(options?: RunOptions): Promise<GitBranchResult> {
    return gitBranch({
      ...this.options,
      ...options,
    });
  }

  public status(options?: RunOptions): Promise<GitStatusResult> {
    return gitStatus({
      ...this.options,
      ...options,
    });
  }
}
