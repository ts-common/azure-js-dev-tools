/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { URLBuilder } from "@azure/ms-rest-js";
import { toArray, where } from "./arrays";
import { getLines, replaceAll, StringMap } from "./common";
import { joinPath } from "./path";
import { run, RunOptions, RunResult } from "./run";

/**
 * A set of interfaces and types that relate to the Git interface.
 */
export namespace Git {
  /**
   * Credentials that will authenticate the current application with a remote endpoint.
   */
  export interface Credentials {
    /**
     * The user to authenticate with the remote endpoint.
     */
    username: string;
    /**
     * The access token that will authenticate this user to the remote endpoint.
     */
    accessToken: string;
  }

  /**
   * The details of the person who authored the changes of the commit.
   */
  export interface Author {
    /**
     * The name of the commit author.
     */
    name?: string;
    /**
     * The e-mail address of the commit author.
     */
    email?: string;
  }

  /**
   * Options that can be passed to a Git implementation's constructor.
   */
  export interface ConstructorOptions {
    /**
     * The credentials that will be used to interact with remote endpoints.
     */
    credentials?: Credentials;
    /**
     * The details of the entity who may make commits.
     */
    author?: Author;
  }

  /**
   * The result of getting the current commit SHA.
   */
  export interface CurrentCommitShaResult {
    /**
     * The SHA of the current commit.
     */
    currentCommitSha?: string;
  }

  /**
   * Options that can be passed to "git merge".
   */
  export interface MergeOptions {
    /**
     * Commits, usually other branch heads, to merge into our branch. Specifying more than one
     * commit will create a merge with more than two parents (affectionately called an Octopus
     * merge).
     */
    refsToMerge?: string | string[];
    /**
     * Produce the working tree and index state as if a real merge happened (except for the merge
     * information), but do not actually make a commit, move the HEAD, or record $GIT_DIR/MERGE_HEAD
     * (to cause the next git commit command to create a merge commit).
     */
    squash?: boolean;
    /**
     * Invoke an editor before committing successful mechanical merge to further edit the
     * auto-generated merge message, so that the user can explain and justify the merge.
     */
    edit?: boolean;
    /**
     * The options that will be passed to the merge strategy.
     */
    strategyOptions?: string | string[];
    /**
     * Operate quietly. Implies --no-progress.
     */
    quiet?: boolean;
    /**
     * Set the commit messages to be used for the merge commit (in case one is created).
     */
    messages?: string | string[];
  }

  /**
   * Options that can be passed to "git rebase".
   */
  export interface RebaseOptions {
    /**
     * Working branch; defaults to HEAD.
     */
    branch?: string;
    /**
     * Upstream branch to compare against. May be any valid commit, not just an existing branch
     * name. Defaults to the configured upstream for the current branch.
     */
    upstream?: string;
    /**
     * Starting point at which to create the new commits. If the --onto option is not specified, the
     * starting point is <upstream>. May be any valid commit, and not just an existing branch name.
     * As a special case, you may use "A...B" as a shortcut for the merge base of A and B if there
     * is exactly one merge base. You can leave out at most one of A and B, in which case it
     * defaults to HEAD.
     */
    newbase?: string;
    /**
     * Use the given merge strategy. If there is no -s option git merge-recursive is used instead.
     * This implies --merge.
     * Because git rebase replays each commit from the working branch on top of the <upstream>
     * branch using the given strategy, using the ours strategy simply empties all patches from the
     * <branch>, which makes little sense.
     */
    strategy?: string;
    /**
     * Pass the <strategy-option> through to the merge strategy. This implies --merge and, if no
     * strategy has been specified, -s recursive. Note the reversal of ours and theirs as noted
     * above for the -m option.
     */
    strategyOption?: string;
    /**
     * Be quiet. Implies --no-stat.
     */
    quiet?: boolean;
    /**
     * Be verbose. Implies --stat.
     */
    verbose?: boolean;
  }

  /**
   * Options that can be passed to "git clone".
   */
  export interface CloneOptions {
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
   * Options that can be passed to "git checkout".
   */
  export interface CheckoutOptions {
    /**
     * The name of the remote repository where the branch should be checked out from.
     */
    remote?: string;
    /**
     * The name to use for the local branch.
     */
    localBranchName?: string;
  }

  /**
   * The options for determining how pushing the current branch will run.
   */
  export interface PushOptions {
    /**
     * The name of the branch to push.
     */
    branchName?: string;
    /**
     * The credentials that will be used to push the changes.
     */
    credentials?: Credentials;
    /**
     * Whether or not to force the remote repository to accept this push's changes.
     */
    force?: boolean;
  }

  /**
   * The options that can be passed to createLocalBranch().
   */
  export interface CreateLocalBranchOptions {
    /**
     * The reference point that the new branch will be created from.
     */
    startPoint?: string;
  }

  /**
   * The options for determining how this command will run.
   */
  export interface DeleteRemoteBranchOptions {
    /**
     * The name of the tracked remote repository. Defaults to "origin".
     */
    remoteName?: string;
  }

  /**
   * Options that can be passed to `git diff`.
   */
  export interface DiffOptions {
    /**
     * The unique identifier for a commit to compare. If this is specified but commit2 is not
     * specified, then this commit will be compared against HEAD.
     */
    commit1?: string;
    /**
     * The unique identifier for a commit to compare. If this is specified but commit1 is not
     * specified, then this commit will be compared against HEAD.
     */
    commit2?: string;
    /**
     * Show only the names of changed files.
     */
    nameOnly?: boolean;
    /**
     * Whether or not to ignore whitespace changes in the diff, and if provided, to what extent should
     * whitespace changes be ignored.
     */
    ignoreSpace?: "at-eol" | "change" | "all";
    /**
     * Whether or not to show all changes that are staged.
     */
    staged?: boolean;
  }

  /**
   * The result of a "git diff" command.
   */
  export interface DiffResult {
    /**
     * The files that are reported as being changed by the diff command.
     */
    filesChanged: string[];
  }

  /**
   * The result of getting the local branches in the repository.
   */
  export interface LocalBranchesResult {
    /**
     * The local branches in the repository.
     */
    localBranches: string[];
    /**
     * The current branch that is checked out.
     */
    currentBranch: string;
  }

  /**
   * The return type of getting a remote repository's branches.
   */
  export interface RemoteBranchesResult {
    /**
     * The branches in remote repositories.
     */
    remoteBranches: GitRemoteBranch[];
  }

  /**
   * The result of getting the status of the current branch.
   */
  export interface StatusResult {
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

  /**
   * The result of getting a git configuration value.
   */
  export interface GetConfigurationValueResult {
    /**
     * The requested configuration value or undefined if the value was not found.
     */
    configurationValue?: string;
  }

  /**
   * The options that can be passed to a `git commit` operation.
   */
  export interface CommitOptions {
    /**
     * The details of the person who authored the changes of the commit.
     */
    author?: Author;
  }

  /**
   * The result of listing the remote repositories referenced by this local repository.
   */
  export interface ListRemotesResult {
    /**
     * The remote repositories referenced by this local repository.
     */
    remotes: StringMap<string>;
  }
}

/**
 * An interface for interacting with Git repositories.
 */
export interface Git {
  /**
   * Get the SHA of the currently checked out commit.
   */
  currentCommitSha(): Promise<Git.CurrentCommitShaResult>;

  /**
   * Download objects and refs from another repository.
   */
  fetch(): Promise<unknown>;

  /**
   * Merge The provided references (branches or tags) into the current branch using the provided
   * options.
   * @param options Options that can be passed to "git merge".
   */
  merge(options?: Git.MergeOptions): Promise<unknown>;

  /**
   * Reapply commits on top of another base tip.
   * @param options Options that can be passed to "git rebase".
   */
  rebase(options?: Git.RebaseOptions): Promise<unknown>;

  /**
   * Clone the repository with the provided URI.
   * @param gitUri The repository URI to clone.
   * @param options The options that can be passed to "git clone".
   */
  clone(gitUri: string, options?: Git.CloneOptions): Promise<unknown>;

  /**
   * Checkout the provided git reference (branch, tag, or commit ID) in the repository.
   * @param refId The git reference to checkout.
   * @param options The options that can be passed to "git checkout".
   */
  checkout(refId: string, options?: Git.CheckoutOptions): Promise<unknown>;

  /**
   * Pull the latest changes for the current branch from the registered remote branch.
   */
  pull(): Promise<unknown>;

  /**
   * Push the current branch to the remote tracked repository.
   * @param options The options for determining how this command will run.
   */
  push(options?: Git.PushOptions): Promise<unknown>;

  /**
   * Add/stage the provided files.
   * @param filePaths The paths to the files to stage.
   */
  add(filePaths: string | string[]): Promise<unknown>;

  /**
   * Add/stage all of the current unstaged files.
   * @param options The options that determine how this command will run.
   */
  addAll(): Promise<unknown>;

  /**
   * Commit the currently staged/added changes to the current branch.
   * @param commitMessages The commit messages to apply to this commit.
   */
  commit(commitMessages: string | string[], options?: Git.CommitOptions): Promise<unknown>;

  /**
   * Delete a local branch.
   * @param branchName The name of the local branch to delete.
   */
  deleteLocalBranch(branchName: string): Promise<unknown>;

  /**
   * Create a new local branch with the provided name.
   * @param branchName The name of the new branch.
   */
  createLocalBranch(branchName: string): Promise<unknown>;

  /**
   * Remote the provided branch from the provided tracked remote repository.
   * @param branchName The name of the remote branch to delete.
   * @param remoteName The name of the tracked remote repository.
   * @param options The options for determining how this command will run.
   */
  deleteRemoteBranch(branchName: string, options?: Git.DeleteRemoteBranchOptions): Promise<unknown>;

  /**
   * Get the diff between two commits.
   * @options The options for determining how this command will run.
   */
  diff(options?: Git.DiffOptions): Promise<Git.DiffResult>;

  /**
   * Get the branches that are local to this repository.
   */
  localBranches(): Promise<Git.LocalBranchesResult>;

  /**
   * Get the branch that the repository is currently on.
   */
  currentBranch(): Promise<string>;

  /**
   * Get the remote branches that this repository clone is aware of.
   */
  remoteBranches(): Promise<Git.RemoteBranchesResult>;

  /**
   * Run "git status".
   */
  status(): Promise<Git.StatusResult>;

  /**
   * Get the configuration value for the provided configuration value name.
   * @param configurationValueName The name of the configuration value to get.
   */
  getConfigurationValue(configurationValueName: string): Promise<Git.GetConfigurationValueResult>;

  /**
   * Get the URL of the current repository.
   * @param options The options that can configure how the command will run.
   */
  getRepositoryUrl(): Promise<string | undefined>;

  /**
   * Unstage all staged files.
   * @param options The options that can configure how the command will run.
   */
  resetAll(): Promise<unknown>;

  /**
   * Add the provided remote URL to this local repository's list of remote repositories using the
   * provided remoteName.
   * @param remoteName The name/reference that will be used to refer to the remote repository.
   * @param remoteUrl The URL of the remote repository.
   */
  addRemote(remoteName: string, remoteUrl: string): Promise<unknown>;

  /**
   * Get the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @returns The URL associated with the provided remote repository or undefined if the remote name
   * is not found.
   */
  getRemoteUrl(remoteName: string): Promise<string | undefined>;

  /**
   * Set the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @param remoteUrl The URL associated with the provided remote repository.
   */
  setRemoteUrl(remoteName: string, remoteUrl: string): Promise<unknown>;

  /**
   * Get the remote repositories that are referenced in this local repository.
   */
  listRemotes(): Promise<Git.ListRemotesResult>;
}

/**
 * A set of interfaces and types that relate to the ExecutableGit class.
 */
export namespace ExecutableGit {
  /**
   * A set of optional properties that can be applied to an ExecutableGit operation.
   */
  export interface Options extends RunOptions {
    /**
     * The file path to the git executable to use to run commands. This can be either a rooted path
     * to the executable, or a relative path that will use the environment's PATH variable to
     * resolve the executable's location.
     */
    gitFilePath?: string;
  }

  /**
   * A set of optional properties that can be applied to the ExecutableGit constructor.
   */
  export interface ConstructorOptions extends Options {
    /**
     * The authentication section that will be inserted into remote repository URLs. This can be
     * either a string (the authentication token that will be inserted into every remote
     * repository's URL), or a StringMap<string> where the entry's key is a scope and the entry's
     * value is the authentication token that will be inserted into remote repository URLs that
     * match the scope. The scope can be either the repository's owner or the full repository
     * name (<owner>/<repository-name>).
     */
    authentication?: string | StringMap<string>;
  }

  /**
   * The result of running a git operation.
   */
  export interface Result extends RunResult {
    /**
     * The error that occurred while running the git operation.
     */
    error?: Error;
  }

  /**
   * The result of running `git rev-parse HEAD`.
   */
  export interface CurrentCommitShaResult extends Git.CurrentCommitShaResult, Result {
  }

  /**
   * Options that can be passed to `git fetch`.
   */
  export interface FetchOptions extends Options {
    /**
     * Before fetching, remove any remote-tracking references that no longer exist on the remote. Tags
     * are not subject to pruning if they are fetched only because of the default tag auto-following
     * or due to a --tags option. However, if tags are fetched due to an explicit refspec (either on
     * the command line or in the remote configuration, for example if the remote was cloned with the
     * --mirror option), then they are also subject to pruning. Supplying --prune-tags is a shorthand
     * for providing the tag refspec.
     */
    prune?: boolean;

    /**
     * Whether or not to fetch branch updates about all known remote repositories.
     */
    all?: boolean;
  }

  /**
   * Options that can be passed to "git merge".
   */
  export interface MergeOptions extends Git.MergeOptions, Options {
  }

  /**
   * Options that can be passed to "git rebase".
   */
  export interface RebaseOptions extends Git.RebaseOptions, Options {
  }

  /**
   * Options that can be passed to "git clone".
   */
  export interface CloneOptions extends Git.CloneOptions, Options {
    /**
     * Operate quietly. Progress is not reported to the standard error stream.
     */
    quiet?: boolean;
    /**
     * Run verbosely. Does not affect the reporting of progress status to the standard error stream.
     */
    verbose?: boolean;
  }

  /**
   * Options that can be passed to "git checkout".
   */
  export interface CheckoutOptions extends Git.CheckoutOptions, Options {
  }

  /**
   * The result of attempting to run `git checkout`.
   */
  export interface CheckoutResult extends Result {
    /**
     * Get the files that would've been overwritten if this checkout operation had taken place. This
     * property will only be populated in an error scenario.
     */
    filesThatWouldBeOverwritten?: string[];
  }

  /**
   * The options for determining how pushing the current branch will run.
   */
  export interface PushOptions extends Git.PushOptions, Options {
    /**
     * The upstream repository to push to if the current branch doesn't already have an upstream
     * branch.
     */
    setUpstream?: boolean | string;
  }

  /**
   * Options that modify how a "git commit" operation will run.
   */
  export interface CommitOptions extends Options {
    /**
     * Whether or not pre-commit checks will be run.
     */
    noVerify?: boolean;
  }

  /**
   * The options that can be passed to createLocalBranch().
   */
  export interface CreateLocalBranchOptions extends Git.CreateLocalBranchOptions, Options {
  }

  /**
   * Options that can be passed to `git push <remote> :<branch-name>`.
   */
  export interface DeleteRemoteBranchOptions extends Git.DeleteRemoteBranchOptions, Options {
  }

  /**
   * Options that can be passed to `git diff`.
   */
  export interface DiffOptions extends Git.DiffOptions, Options {
    /**
     * Whether or not to use a pager in the output of the "git diff" operation.
     */
    usePager?: boolean;
  }

  /**
   * The result of a "git diff" command.
   */
  export interface DiffResult extends Git.DiffResult, Result {
  }

  /**
   * The result of getting the local branches in the repository.
   */
  export interface LocalBranchesResult extends Git.LocalBranchesResult, Result {
    /**
     * The current branch that is checked out.
     */
    currentBranch: string;
  }

  /**
   * The return type of getting a remote repository's branches.
   */
  export interface RemoteBranchesResult extends Git.RemoteBranchesResult, Result {
  }

  /**
   * The result of getting the status of the current branch.
   */
  export interface StatusResult extends Git.StatusResult, Result {
  }

  /**
   * The result of getting a git configuration value.
   */
  export interface GetConfigurationValueResult extends Git.GetConfigurationValueResult, Result {
  }

  /**
   * The options that can be passed to a `git commit` operation.
   */
  export interface CommitOptions extends Git.CommitOptions, Options {
  }

  /**
   * The result of listing the remote repositories referenced by this local repository.
   */
  export interface ListRemotesResult extends Git.ListRemotesResult, Result {
  }
}

/**
 * An implementation of Git that uses a Git executable to run commands.
 */
export class ExecutableGit implements Git {
  /**
   * Create a new ExecutableGit object.
   * @param gitFilePath The file path to the git executable to use to run commands. This can be
   * either a rooted path to the executable, or a relative path that will use the environment's PATH
   * variable to resolve the executable's location.
   * @param options The optional arguments that will be applied to each operation.
   */
  constructor(private readonly options: ExecutableGit.ConstructorOptions = {}) {
    if (!options.gitFilePath) {
      options.gitFilePath = "git";
    }
  }

  private maskAuthenticationInLog<T extends ExecutableGit.Options>(options: T): T {
    const authentication: string | StringMap<string> | undefined = this.options.authentication;
    const log: undefined | ((text: string) => any) = options.log;
    if (authentication && log) {
      const authenticationStrings: string[] = typeof authentication === "string" ? [authentication] : Object.values(authentication);
      options.log = (text: string) => {
        for (const authenticationString of authenticationStrings) {
          text = replaceAll(text, authenticationString, "xxxxx")!;
        }
        return log(text);
      };
    }
    return options;
  }

  private async addAuthenticationToURL(url: string, options: ExecutableGit.Options = {}): Promise<string> {
    let result: string = url;
    if (this.options.authentication) {
      const builder: URLBuilder = URLBuilder.parse(url);

      let authenticationToAdd: string | undefined;
      if (typeof this.options.authentication === "string") {
        authenticationToAdd = this.options.authentication;
      } else {
        let urlPath: string | undefined = builder.getPath();
        if (urlPath) {
          urlPath = urlPath.toLowerCase();

          let matchingScope = "";
          for (let [scope, authentication] of Object.entries(this.options.authentication)) {
            if (!scope.startsWith("/")) {
              scope = `/${scope}`;
            }
            scope = scope.toLowerCase();
            if (urlPath.startsWith(scope) && scope.length > matchingScope.length) {
              matchingScope = scope;
              authenticationToAdd = authentication;
            }
          }
          if (options.log) {
            if (matchingScope) {
              await Promise.resolve(options.log(`Git URL matches authentication scope "${matchingScope}". Inserting auth token "${authenticationToAdd}".`));
            } else {
              const scopes: string[] = Object.keys(this.options.authentication);
              await Promise.resolve(options.log(`Git URL didn't match any of the authentication scopes (${scopes.join(",")}). Not inserting an auth token.`));
            }
          }
        }
      }

      if (authenticationToAdd) {
        builder.setHost(`${authenticationToAdd}@${builder.getHost()}`);
      }
      result = builder.toString();
    }
    return result;
  }

  /**
   * Create a new ExecutableGit object that combines this ExecutableGit's options with the provieded
   * options.
   * @param options The options to combine with this ExecutableGit's options.
   */
  public scope(options: ExecutableGit.ConstructorOptions): ExecutableGit {
    return new ExecutableGit({
      ...this.options,
      ...options,
    });
  }

  /**
   * Run an arbitrary Git command.
   * @param args The arguments to provide to the Git executable.
   */
  public run(args: string[], options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return run(options.gitFilePath || this.options.gitFilePath!, args, this.maskAuthenticationInLog({
      ...this.options,
      ...options
    }));
  }

  /**
   * Get the SHA of the currently checked out commit.
   */
  public async currentCommitSha(options: ExecutableGit.Options = {}): Promise<ExecutableGit.CurrentCommitShaResult> {
    const runResult: ExecutableGit.Result = await this.run(["rev-parse", "HEAD"], options);
    const result: ExecutableGit.CurrentCommitShaResult = {
      ...runResult,
      currentCommitSha: runResult.stdout,
    };
    return result;
  }

  /**
   * Download objects and refs from another repository.
   * @param options The options that can be passed to `git fetch`.
   */
  public fetch(options: ExecutableGit.FetchOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["fetch"];
    if (options.prune) {
      args.push("--prune");
    }
    if (options.all) {
      args.push("--all");
    }
    return this.run(args, options);
  }

  public merge(options: ExecutableGit.MergeOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["merge"];
    if (options.squash != undefined) {
      if (options.squash) {
        args.push("--squash");
      } else {
        args.push("--no-squash");
      }
    }
    if (options.edit != undefined) {
      if (options.edit) {
        args.push("--edit");
      } else {
        args.push("--no-edit");
      }
    }
    if (options.strategyOptions) {
      options.strategyOptions = toArray(options.strategyOptions);
      for (const strategyOption of options.strategyOptions) {
        args.push(`--strategy-option=${strategyOption}`);
      }
    }
    if (options.quiet) {
      args.push(`--quiet`);
    }
    if (options.messages != undefined) {
      options.messages = toArray(options.messages);
      for (const message of options.messages) {
        args.push("-m", message);
      }
    }
    if (options.refsToMerge) {
      for (const refToMerge of toArray(options.refsToMerge)) {
        if (refToMerge) {
          args.push(refToMerge);
        }
      }
    }
    return this.run(args, options);
  }

  public rebase(options: ExecutableGit.RebaseOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["rebase"];
    if (options.strategy) {
      args.push(`--strategy=${options.strategy}`);
    }
    if (options.strategyOption) {
      args.push(`--strategy-option=${options.strategyOption}`);
    }
    if (options.quiet) {
      args.push("--quiet");
    }
    if (options.verbose) {
      args.push("--verbose");
    }
    if (options.newbase) {
      args.push("--onto", options.newbase);
    }
    if (options.upstream) {
      args.push(options.upstream);
    }
    if (options.branch) {
      args.push(options.branch);
    }
    return this.run(args, options);
  }

  /**
   * Clone the repository with the provided URI.
   * @param gitUri The repository URI to clone.
   * @param options The options that can be passed to "git clone".
   */
  public async clone(gitUri: string, options: ExecutableGit.CloneOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = getCloneArguments(await this.addAuthenticationToURL(gitUri), options);
    return await this.run(args, options);
  }

  /**
   * Checkout the provided git reference (branch, tag, or commit ID) in the repository.
   * @param refId The git reference to checkout.
   */
  public async checkout(refId: string, options: ExecutableGit.CheckoutOptions = {}): Promise<ExecutableGit.CheckoutResult> {
    const args: string[] = [`checkout`];
    if (!options.remote) {
      args.push(refId);
    } else {
      args.push(`--track`, `${options.remote}/${refId}`);
    }
    if (options.localBranchName) {
      args.push("-b", options.localBranchName);
    }
    const runResult: ExecutableGit.Result = await this.run(args, options);
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
            filesThatWouldBeOverwritten.push(joinPath(options.executionFolderPath || this.options.executionFolderPath || "", line.trim()));
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

  /**
   * Pull the latest changes for the current branch from the registered remote branch.
   */
  public pull(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run([`pull`], options);
  }

  /**
   * Push the current branch to the remote tracked repository.
   * @param options The options for determining how this command will run.
   */
  public async push(options: ExecutableGit.PushOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["push"];
    if (options.setUpstream) {
      const upstream: string = typeof options.setUpstream === "string" ? options.setUpstream : "origin";
      const branchName: string = options.branchName || await this.currentBranch(options);
      args.push(`--set-upstream`, upstream, branchName);
    }
    if (options.force) {
      args.push(`--force`);
    }
    return await this.run(args, options);
  }

  /**
   * Add/stage the provided files.
   * @param filePaths The paths to the files to stage.
   * @param options The options for determining how this command will run.
   */
  public add(filePaths: string | string[], options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["add"];
    if (typeof filePaths === "string") {
      args.push(filePaths);
    } else {
      args.push(...filePaths);
    }
    return this.run(args, options);
  }

  /**
   * Add/stage all of the current unstaged files.
   * @param options The options that determine how this command will run.
   */
  public addAll(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.add("*", options);
  }

  /**
   * Commit the currently staged/added changes to the current branch.
   * @param commitMessages The commit messages to apply to this commit.
   * @param options The options that determine how this command will run.
   */
  public commit(commitMessages: string | string[], options: ExecutableGit.CommitOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["commit"];

    if (options.noVerify) {
      args.push("--no-verify");
    }

    if (typeof commitMessages === "string") {
      commitMessages = [commitMessages];
    }
    for (const commitMessage of commitMessages) {
      args.push("-m", commitMessage);
    }

    return this.run(args, options);
  }

  /**
   * Delete a local branch.
   * @param branchName The name of the local branch to delete.
   */
  public deleteLocalBranch(branchName: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run([`branch`, `-D`, branchName], options);
  }

  /**
   * Create a new local branch with the provided name.
   * @param branchName The name of the new branch.
   * @param options The options for determining how this command will run.
   */
  public createLocalBranch(branchName: string, options: ExecutableGit.CreateLocalBranchOptions = {}): Promise<ExecutableGit.Result> {
    const args: string[] = ["checkout", "-b", branchName];
    if (options.startPoint) {
      args.push(options.startPoint);
    }
    return this.run(args, options);
  }

  /**
   * Remote the provided branch from the provided tracked remote repository.
   * @param branchName The name of the remote branch to delete.
   * @param remoteName The name of the tracked remote repository.
   * @param options The options for determining how this command will run.
   */
  public deleteRemoteBranch(branchName: string, options: ExecutableGit.DeleteRemoteBranchOptions = {}): Promise<ExecutableGit.Result> {
    return this.run([`push`, options.remoteName || "origin", `:${branchName}`], options);
  }

  public async diff(options: ExecutableGit.DiffOptions = {}): Promise<ExecutableGit.DiffResult> {
    const args: string[] = ["diff"];

    if (!options.usePager) {
      args.unshift("--no-pager");
    }

    if (options.commit1) {
      args.push(options.commit1);
    }

    if (options.commit2) {
      args.push(options.commit2);
    }

    if (options.staged) {
      args.push(`--staged`);
    }

    if (options.nameOnly) {
      args.push(`--name-only`);
    }

    if (options.ignoreSpace === "all") {
      args.push(`--ignore-all-space`);
    } else if (options.ignoreSpace) {
      args.push(`--ignore-space-${options.ignoreSpace}`);
    }

    const commandResult: ExecutableGit.Result = await this.run(args, options);

    let filesChanged: string[];
    const repositoryFolderPath: string | undefined = options.executionFolderPath || this.options.executionFolderPath || process.cwd();
    const stdoutLines: string[] = getLines(commandResult.stdout);
    if (options.nameOnly) {
      filesChanged = [];
      for (const fileChanged of getLines(commandResult.stdout)) {
        if (fileChanged) {
          filesChanged.push(joinPath(repositoryFolderPath, fileChanged));
        }
      }
    } else {
      filesChanged = getFilesChangedFromFullDiff(stdoutLines, repositoryFolderPath);
    }
    return {
      ...commandResult,
      filesChanged
    };
  }

  /**
   * Get the branches that are local to this repository.
   */
  public async localBranches(options: ExecutableGit.Options = {}): Promise<ExecutableGit.LocalBranchesResult> {
    const commandResult: ExecutableGit.Result = await this.run(["branch"], options);
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

  /**
   * Get the branch that the repository is currently on.
   * @param options The options to run this command with.
   */
  public async currentBranch(options: ExecutableGit.Options = {}): Promise<string> {
    return (await this.localBranches(options)).currentBranch;
  }

  /**
   * Get the remote branches that this repository clone is aware of.
   * @param options The options to run this command with.
   */
  public async remoteBranches(options: ExecutableGit.Options = {}): Promise<ExecutableGit.RemoteBranchesResult> {
    const gitResult: ExecutableGit.Result = await this.run(["branch", "--remotes"], options);
    const remoteBranches: GitRemoteBranch[] = [];
    for (let remoteBranchLine of getLines(gitResult.stdout)) {
      if (remoteBranchLine && remoteBranchLine.indexOf("->") === -1) {
        remoteBranchLine = remoteBranchLine.trim();
        if (remoteBranchLine) {
          const firstSlashIndex: number = remoteBranchLine.indexOf("/");
          const repositoryTrackingName: string = remoteBranchLine.substring(0, firstSlashIndex);
          const branchName: string = remoteBranchLine.substring(firstSlashIndex + 1);
          remoteBranches.push({
            repositoryTrackingName,
            branchName
          });
        }
      }
    }
    return {
      ...gitResult,
      remoteBranches
    };
  }

  /**
   * Run "git status".
   */
  public async status(options: ExecutableGit.Options = {}): Promise<ExecutableGit.StatusResult> {
    const folderPath: string = options.executionFolderPath || this.options.executionFolderPath || process.cwd();

    let parseState: StatusParseState = "CurrentBranch";
    let localBranch: string | undefined;
    let remoteBranch: string | undefined;
    let hasUncommittedChanges = false;
    const stagedModifiedFiles: string[] = [];
    const stagedDeletedFiles: string[] = [];
    const notStagedModifiedFiles: string[] = [];
    const notStagedDeletedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    const runResult: ExecutableGit.Result = await this.run(["status"], options);
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
            if (!line.match(/\(use "git add <file>..." to include in what will be committed\)/i) &&
              !line.match(/nothing added to commit but untracked files present \(use "git add" to track\)/i) &&
              !line.match(/no changes added to commit \(use \"git add\" and\/or \"git commit -a\"\)/i)) {
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

  /**
   * Get the configuration value for the provided configuration value name.
   * @param configurationValueName The name of the configuration value to get.
   * @param options The options that can configure how the command will run.
   */
  public async getConfigurationValue(configurationValueName: string, options?: ExecutableGit.Options): Promise<ExecutableGit.GetConfigurationValueResult> {
    const result: ExecutableGit.GetConfigurationValueResult = await this.run(["config", "--get", configurationValueName], options);
    if (result.exitCode === 0 && result.stdout) {
      result.configurationValue = result.stdout;
    }
    return result;
  }

  /**
   * Get the URL of the current repository.
   * @param options The options that can configure how the command will run.
   */
  public async getRepositoryUrl(options: ExecutableGit.Options = {}): Promise<string | undefined> {
    let result: string | undefined = (await this.getConfigurationValue("remote.origin.url", options)).configurationValue;
    if (result) {
      result = result.trim();
    }
    return result;
  }

  /**
   * Unstage all staged files.
   * @param options The options that can configure how the command will run.
   */
  public resetAll(options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return this.run(["reset", "*"], options);
  }

  /**
   * Add the provided remote URL to this local repository's list of remote repositories using the
   * provided remoteName.
   * @param remoteName The name/reference that will be used to refer to the remote repository.
   * @param remoteUrl The URL of the remote repository.
   * @param options Options that can be used to modify the way that this operation is run.
   */
  public async addRemote(remoteName: string, remoteUrl: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return await this.run(["remote", "add", remoteName, await this.addAuthenticationToURL(remoteUrl)], options);
  }

  /**
   * Get the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @returns The URL associated with the provided remote repository or undefined if the remote name
   * is not found.
   */
  public async getRemoteUrl(remoteName: string, options: ExecutableGit.Options = {}): Promise<string | undefined> {
    const result: string | undefined = (await this.run(["remote", "get-url", remoteName], options)).stdout;
    return (result && result.trim()) || undefined;
  }

  /**
   * Set the URL associated with the provided remote repository.
   * @param remoteName The name of the remote repository.
   * @param remoteUrl The URL associated with the provided remote repository.
   */
  public async setRemoteUrl(remoteName: string, remoteUrl: string, options: ExecutableGit.Options = {}): Promise<ExecutableGit.Result> {
    return await this.run(["remote", "set-url", remoteName, await this.addAuthenticationToURL(remoteUrl)], options);
  }

  /**
   * Get the remote repositories that are referenced in this local repository.
   */
  public async listRemotes(options: ExecutableGit.Options = {}): Promise<ExecutableGit.ListRemotesResult> {
    const runResult: ExecutableGit.Result = await this.run(["remote", "--verbose"], options);
    const remotes: StringMap<string> = {};
    for (const line of getLines(runResult.stdout)) {
      const lineParts: string[] = line.split(/\s+/g);
      remotes[lineParts[0]] = lineParts[1];
    }
    const result: ExecutableGit.ListRemotesResult = {
      ...runResult,
      remotes,
    };
    return result;
  }
}

function getCloneArguments(gitUri: string, options: ExecutableGit.CloneOptions = {}): string[] {
  const args: string[] = [`clone`];
  if (options.quiet) {
    args.push(`--quiet`);
  }
  if (options.verbose) {
    args.push(`--verbose`);
  }
  if (options.origin) {
    args.push(`--origin`, options.origin);
  }
  if (options.branch) {
    args.push(`--branch`, options.branch);
  }
  if (options.depth != undefined) {
    args.push(`--depth`, options.depth.toString());
  }
  args.push(gitUri);
  if (options.directory) {
    args.push(options.directory);
  }
  return args;
}

/**
 * The prefix that marks the beginning of a diff-ed file line.
 */
const changedFileDiffLinePrefix = "diff --git";

/**
 * The regular expression used to get a relative file path from a full diff contents line.
 */
const fullDiffGitLineRegex: RegExp = /diff --git a\/(.*) b\/.*/;

/**
 * Get the files that have changed based on the provided full diff text result.
 * @param text The text of the full diff.
 * @param currentFolder The folder that the diff-ed files should be resolved against.
 */
export function getFilesChangedFromFullDiff(text: string | string[], currentFolder?: string): string[] {
  const lines: string[] = typeof text === "string" ? getLines(text) : text;
  const fileDiffLines: string[] = where(lines, (line: string) => line.startsWith(changedFileDiffLinePrefix));
  const result: string[] = [];
  for (const fileDiffLine of fileDiffLines) {
    const lineMatch: RegExpMatchArray | null = fileDiffLine.match(fullDiffGitLineRegex);
    if (lineMatch) {
      const relativeFilePath: string = lineMatch[1];
      const filePath: string = currentFolder ? joinPath(currentFolder, relativeFilePath) : relativeFilePath;
      result.push(filePath);
    }
  }
  return result;
}

const branchDetachedHeadRegExp: RegExp = /\(HEAD detached at (.*)\)/;

/**
 * Get a GitRemoteBranch from the provided label. Labels usually follow the format
 * "<repository-tracking-name>:<branch-name>", such as "origin:master".
 * @param label The string or GitRemoteBranch to convert to a GitRemoteBranch.
 */
export function getGitRemoteBranch(label: string | GitRemoteBranch): GitRemoteBranch {
  let result: GitRemoteBranch;
  if (typeof label === "string") {
    const colonIndex: number = label.indexOf(":");
    const repositoryTrackingName: string = label.substring(0, colonIndex);
    const branchName: string = label.substring(colonIndex + 1);
    result = {
      repositoryTrackingName,
      branchName
    };
  } else {
    result = label;
  }
  return result;
}

/**
 * A branch from a tracked remote repository.
 */
export interface GitRemoteBranch {
  /**
   * The tracking name of the remote repository, such as "origin".
   */
  repositoryTrackingName: string;
  /**
   * The name of the branch.
   */
  branchName: string;
}

/**
 * Get the full name of the provided remote branch.
 * @param remoteBranch The remote branch to get the full name of.
 */
export function getRemoteBranchFullName(remoteBranch: string | GitRemoteBranch): string {
  return !remoteBranch || typeof remoteBranch === "string"
    ? remoteBranch
    : `${remoteBranch.repositoryTrackingName}:${remoteBranch.branchName}`;
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
