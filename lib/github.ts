/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import { contains, first, map, removeFirst, where } from "./arrays";
import { URLBuilder } from "./url";
import { StringMap } from "./common";

/**
 * The name and optional organization that the repository belongs to.
 */
export interface Repository {
  /**
   * The entity that owns the repository.
   */
  owner: string;
  /**
   * The name of the repository.
   */
  name: string;
}

/**
 * Get a GitHubRepository object from the provided string or GitHubRepository object.
 * @param repository The repository name or object.
 */
export function getRepository(repository: string | Repository): Repository {
  let result: Repository;
  if (!repository) {
    result = {
      name: repository,
      owner: ""
    };
  } else if (typeof repository === "string") {
    let slashIndex: number = repository.indexOf("/");
    if (slashIndex === -1) {
      slashIndex = repository.indexOf("\\");
    }
    result = {
      name: repository.substr(slashIndex + 1),
      owner: slashIndex === -1 ? "" : repository.substr(0, slashIndex)
    };
  } else {
    result = repository;
  }
  return result;
}

export function getGithubRepositoryUrl(repository: Repository): string {
  return `https://github.com/${repository.owner}/${repository.name}`;
}

/**
 * Get whether or not the two provided repositories are equal.
 */
export function repositoriesAreEqual(lhs: string | Repository, rhs: string | Repository): boolean {
  return getRepositoryFullName(lhs).toLowerCase() === getRepositoryFullName(rhs).toLowerCase();
}

/**
 * A comment in a GitHub repository.
 */
export interface GitHubComment {
  id: number;
  node_id: string;
  url: string;
  /**
   * The URL to the html version of this comment.
   */
  html_url: string;
  /**
   * The body/text of this comment.
   */
  body: string;
  /**
   * The user that made this comment.
   */
  user: GitHubUser;
  /**
   * The timestamp for when this comment was created.
   */
  created_at: string;
  /**
   * The timestamp for the last time that this comment was updated.
   */
  updated_at: string;
}

/**
 * Get the full name of the provided repository.
 * @param repository The repository to get the full name of.
 */
export function getRepositoryFullName(repository: string | Repository): string {
  let result: string;
  if (!repository) {
    result = "";
  } else if (typeof repository === "string") {
    result = repository;
  } else if (!repository.owner) {
    result = repository.name;
  } else {
    result = `${repository.owner}/${repository.name}`;
  }
  return result;
}

/**
 * The type of the body that GitHub sends for a pull_request webhook request.
 */
export interface GitHubPullRequestWebhookBody {
  /**
   * The action that the Webhook request is being sent as a result of.
   */
  action: "assigned" | "unassigned" | "review_requested" | "review_request_removed" | "labeled" | "unlabeled" | "opened" | "edited" | "closed" | "reopened";
  /**
   * The pull request number.
   */
  number: number;
  /**
   * The pull request that was changed.
   */
  pull_request: GitHubPullRequest;
}

export interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
}

export type GitHubMilestoneState = "open" | "closed";

export interface GitHubMilestone {
  title: string;
  due_on: string;
  number: number;
  open_issues: number;
  closed_issues: number;
  state: GitHubMilestoneState;
}

export interface GitHubSprintLabel {
  sprint: number;
  unplannedColor?: string;
  plannedColor?: string;
  startedColor?: string;
}

export interface GitHubSprintMilestone {
  milestoneNumber?: number;
  sprint: number;
  endDate: string;
  openIssueCount: number;
  open: boolean;
}

export type GitHubPullRequestState = "open" | "closed";

export interface GitHubPullRequest {
  base: GitHubPullRequestCommit;
  head: GitHubPullRequestCommit;
  merge_commit_sha?: string;
  id: number;
  labels: GitHubLabel[];
  number: number;
  state: GitHubPullRequestState;
  merged?: boolean;
  title: string;
  url: string;
  html_url: string;
  diff_url: string;
  milestone?: GitHubMilestone;
  assignees?: GitHubUser[];
  /**
   * The description for the pull request.
   */
  body?: string;
}

/**
 * The way that a pull request will be merged.
 */
export type GitHubMergeMethod = "merge" | "squash" | "rebase";

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  url: string;
  node_id: string;
  site_admin: boolean;
}

export interface GitHubPullRequestCommit {
  label: string;
  ref: string;
  sha: string;
}

/**
 * Get the label in the provided GitHubPullRequest that has the provided name. If no label is found,
 * then undefined will be returned.
 * @param githubPullRequest The pull request to look for the label in.
 * @param labelName The name of the label to look for.
 */
export function gitHubPullRequestGetLabel(githubPullRequest: GitHubPullRequest, labelName: string): GitHubLabel | undefined {
  return first(githubPullRequest.labels, (label: GitHubLabel) => label.name === labelName);
}

export function gitHubPullRequestGetLabels(githubPullRequest: GitHubPullRequest, labelNames: string | string[]): GitHubLabel[] {
  const labelNamesArray: string[] = (typeof labelNames === "string" ? [labelNames] : labelNames);
  return where(githubPullRequest.labels, (label: GitHubLabel) => contains(labelNamesArray, label.name));
}

export function gitHubPullRequestGetAssignee(githubPullRequest: GitHubPullRequest, assignee: GitHubUser | string | number): GitHubUser | undefined {
  return first(githubPullRequest.assignees, (existingAssignee: GitHubUser) => {
    let isMatch: boolean;
    if (!assignee) {
      isMatch = false;
    } else if (typeof assignee === "number") {
      isMatch = (existingAssignee.id === assignee);
    } else if (typeof assignee === "string") {
      isMatch = (existingAssignee.login === assignee || existingAssignee.name === assignee);
    } else {
      isMatch = (existingAssignee.id === assignee.id);
    }
    return isMatch;
  });
}

function getPullRequestNumber(pullRequest: number | GitHubPullRequest): number {
  return typeof pullRequest === "number" ? pullRequest : pullRequest.number;
}

function getCommentId(comment: number | GitHubComment): number {
  return typeof comment === "number" ? comment : comment.id;
}

/**
 * Optional parameters that can be provided to the GitHub.getMilestones() function to restrict the
 * returned milestones.
 */
export interface GitHubGetMilestonesOptions {
  /**
   * Filter the results to the milestones that are either open (true) or closed (false). If this
   * value is undefined, then all milestones will be returned.
   */
  open?: boolean;
}

export interface GitHubCreateMilestoneOptions {
  endDate?: string;
}

/**
 * Optional parameters that can be provided to the GitHub.getPullRequests() function to restrict the
 * returned pull requests.
 */
export interface GitHubGetPullRequestsOptions extends Partial<Octokit.PullsListParams> {
  /**
   * Filter the results to the pull requests that are either open (true) or closed (false). If this
   * value is undefined, then all pull requests will be returned.
   */
  open?: boolean;
}

/**
 * Optional parameters that can be provided to the GitHub.createPullRequest function.
 */
export interface GitHubCreatePullRequestOptions {
  title: string;
  /**
   * The description that will appear in the created pull request.
   */
  body?: string;
  /**
   * Whether or not the maintainer of the pull request can modify the head branch. Defaults to
   * false.
   */
  maintainerCanModify?: boolean;
}

/**
 * A commit that exists in a GitHub repository.
 */
export interface GitHubCommit {
  /**
   * The unique identifier for this commit.
   */
  sha: string;
  /**
   * The data of the GitHub commit.
   */
  commit: GitHubCommitData;
}

/**
 * The data of a GitHub commit.
 */
export interface GitHubCommitData {
  /**
   * The message of the commit.
   */
  message: string;
}

export interface GitHubContent {
  download_url: string | null;
  encoding?: string | undefined;
  content?: string | undefined;
  html_url: string;
  sha: string;
  url: string;
}

export interface GitHubCommonMsg {
  created_at: string;
}

export interface GitHubContentItem {
  download_url: string | null;
}

/**
 * A reference to a branch in a repository.
 */
export interface RepositoryBranch {
  /**
   * The owner of the repository that the branch belongs to.
   */
  owner: string;
  /**
   * The name of the branch in the repository.
   */
  name: string;
}

/**
 * Parse a ForkedRepositoryBranch reference from the provided value.
 * @param repositoryBranch The string or ForkedRepositoryBranch to parse.
 */
export function getRepositoryBranch(repositoryBranch: string | RepositoryBranch): RepositoryBranch {
  let result: RepositoryBranch;
  if (typeof repositoryBranch === "string") {
    const colonIndex: number = repositoryBranch.indexOf(":");
    if (colonIndex === -1) {
      result = {
        owner: "",
        name: repositoryBranch
      };
    } else {
      const owner: string = repositoryBranch.substring(0, colonIndex);
      const branchName: string = repositoryBranch.substring(colonIndex + 1);
      result = {
        owner,
        name: branchName
      };
    }
  } else {
    result = repositoryBranch;
  }
  return result;
}

export function getRepositoryBranchFullName(repositoryBranch: string | RepositoryBranch): string {
  let result: string;
  if (!repositoryBranch || typeof repositoryBranch === "string") {
    result = repositoryBranch;
  } else if (!repositoryBranch.owner) {
    result = repositoryBranch.name;
  } else {
    result = `${getRepositoryFullName(repositoryBranch.owner)}:${repositoryBranch.name}`;
  }
  return result;
}

/**
 * A generic reference from a GitHub repository. This can be either a branch, tag, note, or stash.
 */
export interface GitHubReference {
  /**
   * This reference's full name.
   */
  readonly ref: string;
  readonly node_id: string;
  /**
   * The GitHub URL for this reference.
   */
  readonly url: string;
  readonly object: {
    /**
     * The type of Git object that this reference points to.
     */
    readonly type: string;
    /**
     * The SHA that this reference points to.
     */
    readonly sha: string;
    /**
     * The URL of the Git object that this reference points to.
     */
    readonly url: string;
  };
}

/**
 * A branch reference from a GitHub repository.
 */
export interface GitHubBranch extends GitHubReference {
  /**
   * The simplified name of the branch.
   */
  readonly name: string;
}

export interface GitHub {
  /**
   * Get the user that is currently authenticated.
   * @returns The user that is currently authenticated.
   */
  getCurrentUser(): Promise<GitHubUser>;

  /**
   * Get all of the labels in the provided repository.
   */
  getLabels(repository: string | Repository): Promise<GitHubLabel[]>;

  /**
   * Get all of the labels that contain "-Sprint-" in the provided repository.
   * @param repository The repository to look in.
   */
  getSprintLabels(repository: string | Repository): Promise<GitHubSprintLabel[]>;

  /**
   * Create a label with the provided labelName and color in the provided repository.
   * @param repositoryName The name of the repository where the label will be created.
   * @param labelName The name of the created label.
   * @param color The color of the created label.
   */
  createLabel(repository: string | Repository, labelName: string, color: string): Promise<GitHubLabel>;

  /**
   * Delete the provided label from the provided repository.
   * @param repository The repository to delete the label from.
   * @param label The label name, id, or details to delete.
   */
  deleteLabel(repository: string | Repository, label: string | number | GitHubLabel): Promise<unknown>;

  /**
   * Update the color of the label with the provided name in the provided repository.
   * @param repository The repository that contains the label to update.
   * @param labelName The name of the label to update.
   * @param newColor The color to update the label to.
   */
  updateLabelColor(repository: string | Repository, labelName: string, newColor: string): Promise<unknown>;

  /**
   * Get the milestone in the provided repository with either the provided milestone number or name.
   */
  getMilestone(repository: string | Repository, milestone: number | string): Promise<GitHubMilestone>;

  /**
   * Get all of the milestones that exist in the provided repository.
   * @param repository The repository to get all of the milestones of.
   * @returns All of the milestones that exist in the provided repository.
   */
  getMilestones(repository: string | Repository, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]>;

  /**
   * Get all of the sprint milestones (milestones that begin with "Sprint-") in the provided
   * repository.
   * @param repository The repository.
   * @returns All of the sprint milestones in the provided repository.
   */
  getSprintMilestones(repository: string | Repository, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]>;

  /**
   * Create a new milestone in the provided repository.
   * @param repository The repository to create a new milestone in.
   * @param milestoneName The name of the new milestone.
   * @param options The optional properties to set on the created milestone.
   */
  createMilestone(repositoryName: string | Repository, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone>;

  /**
   * Create a new sprint milestone in the provided repository.
   * @param repository The repository to create the new sprint milestone in.
   * @param sprintNumber The number of the sprint that the milestone will be associated with.
   * @param sprintEndDate The last day of the sprint.
   */
  createSprintMilestone(repository: string | Repository, sprintNumber: number, sprintEndDate: string): Promise<GitHubSprintMilestone | undefined>;

  /**
   * Update the end date of an existing milestone in the provided repository.
   * @param repository The repository that contains the milestone to update.
   * @param milestoneNumber The number id of the milestone to update.
   * @param newSprintEndDate The new end date to update the existing milestone to.
   */
  updateMilestoneEndDate(repository: string | Repository, milestoneNumber: number, newSprintEndDate: string): Promise<GitHubMilestone>;

  updateSprintMilestoneEndDate(repository: string | Repository, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string): Promise<GitHubSprintMilestone>;

  closeMilestone(repository: string | Repository, milestoneNumber: number): Promise<unknown>;

  closeSprintMilestone(repository: string | Repository, sprintMilestone: GitHubSprintMilestone): Promise<unknown>;

  /**
   * Get the pull request from the provided repository with the provided number.
   * @param repository The repository to get the pull request from.
   */
  getPullRequest(repository: string | Repository, pullRequestNumber: number): Promise<GitHubPullRequest>;

  /**
   * Get the pull requests in the provided respository.
   * @param repository The name of the repository.
   */
  getPullRequests(repository: string | Repository, options?: GitHubGetPullRequestsOptions): Promise<GitHubPullRequest[]>;

  /**
   * Create a new pull request in the provided repository.
   * @param repository The repository to create the pull request in.
   * @param baseBranch The base branch that the pull request will merge into.
   * @param headBranch The head branch that the pull request will merge from.
   * @param title The title of the pull request.
   * @param options The optional parameters for creating a pull request.
   */
  createPullRequest(repository: string | Repository, baseBranch: string, headBranch: string | RepositoryBranch, options: GitHubCreatePullRequestOptions): Promise<GitHubPullRequest>;

  updatePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest, options?: Partial<GitHubCreatePullRequestOptions>): Promise<unknown>;

  /**
   * Close the provided pull request without merging it.
   * @param repository The repository that the pull request exists in.
   * @param pullRequest The pull request number or the pull request object to close.
   */
  closePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest): Promise<unknown>;

  /**
   * Merge and close the provided pull request.
   * @param repository The repository that the pull request exists in.
   * @param pullRequest The pull request number or the pull request object to merge.
   * @param mergeMethod The way that the pull request will be merged.
   */
  mergePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest, mergeMethod?: GitHubMergeMethod): Promise<unknown>;

  addPullRequestAssignees(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, assignees: string | GitHubUser | (string | GitHubUser)[]): Promise<unknown>;

  /**
   * Add the provided labels to the provided GitHubPullRequest.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The GitHubPullRequest that the labels will be added to.
   * @param labelNamesToAdd The name of the label or labels to add to the pull request.
   */
  addPullRequestLabels(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, labelNames: string | string[]): Promise<string[]>;

  /**
   * Remove the provided labels from the provided pull request.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The pull request that the labels will be removed from.
   * @param labelNames The names of the labels to remove from the pull request.
   * @returns The names of the labels that were removed.
   */
  removePullRequestLabels(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, labelNames: string | string[]): Promise<string[]>;

  /**
   * Set the milestone that the provided pull request is assigned to.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The pull request to assign.
   * @param milestone The milestone to assign to the pull request.
   */
  setPullRequestMilestone(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, milestone: number | string | GitHubMilestone): Promise<unknown>;

  /**
   * Get the comments that have been made on the provided GitHubPullRequest.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The GitHubPullRequest to get the comments of.
   */
  getPullRequestComments(repository: string | Repository, githubPullRequest: GitHubPullRequest | number): Promise<GitHubComment[]>;

  /**
   * Create a new comment on the provided GitHubPullRequest.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The GitHubPullReuqest to create the new comment on.
   * @param commentBody The text of the comment to make.
   */
  createPullRequestComment(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, commentBody: string): Promise<GitHubComment>;

  /**
   * Update an existing comment on the provided GitHubPullRequest.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The GitHubPullRequest to update an existing comment on.
   * @param comment The updated comment.
   */
  updatePullRequestComment(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, comment: GitHubComment | number, commentBody: string): Promise<GitHubComment>;

  /**
   * Delete an existing comment from the provided GitHubPullRequest.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The GitHubPUllRequest to delete an existing comment from.
   * @param comment The comment to delete.
   */
  deletePullRequestComment(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, comment: GitHubComment | number): Promise<unknown>;

  /**
   * Get the details of the commit with the provided unique identifier or undefined if no commit
   * existed with the provided identifier.
   * @param repository The repository that the commit exists in.
   * @param commit A unique identifier for the commit.
   */
  getCommit(repository: string | Repository, commit: string): Promise<GitHubCommit | undefined>;

  getContents(repository: string | Repository, filepath: string): Promise<GitHubContent | undefined | Array<GitHubContentItem>>;
  getContributorsStats(repository: string | Repository): Promise<number | undefined>;
  getCommonMsg(repository: string | Repository): Promise<boolean>;

  /**
   * Get all of the references (branches, tags, notes, stashes, etc.) in the provided repository.
   * @param repository The repository to get all of the references for.
   * @returns All of the references (branches, tags, notes, stashes, etc.) in the provided
   * repository.
   */
  getAllReferences(repository: string | Repository): Promise<GitHubReference[]>;

  /**
   * Get all of the branches in the provided repository.
   * @param repository The repository to get all of the branches for.
   * @returns All of the branches in the provided repository.
   */
  getAllBranches(repository: string | Repository): Promise<GitHubBranch[]>;

  /**
   * Get more information about the provided branch in the provided repository.
   * @param repository The repository to get the branch from.
   * @param branchName The name of the branch to get.
   */
  getBranch(repository: string | Repository, branchName: string): Promise<GitHubBranch>;

  /**
   * Delete the branch with the provided name in the provided repository.
   * @param repository The repository to delete the branch from.
   * @param branchName The name of the branch to delete.
   */
  deleteBranch(repository: string | Repository, branchName: string): Promise<unknown>;

  /**
   * Create a branch with the provided name as the provided sha in the provided repository.
   * @param repository The repository to create the branch in.
   * @param branchName The name of the branch to create.
   * @param branchSha The SHA/commit ID that the branch will be created at.
   */
  createBranch(repository: string | Repository, branchName: string, branchSha: string): Promise<GitHubBranch>;
}

export interface FakeGitHubPullRequest extends GitHubPullRequest {
  comments: GitHubComment[];
}

type FakeContent = |GitHubContent|GitHubContentItem[]|undefined;
export class FakeRepository {
  public readonly labels: GitHubLabel[] = [];
  public readonly milestones: GitHubMilestone[] = [];
  public readonly pullRequests: FakeGitHubPullRequest[] = [];
  public readonly commits: GitHubCommit[] = [];
  public readonly branches: GitHubBranch[] = [];
  public readonly forks: FakeRepository[] = [];
  public readonly content: FakeContent[] = [];

  constructor(public readonly name: string, public readonly forkOf?: FakeRepository) {
  }

  /**
   * Get the fork of this repository that was created by the provided owner.
   * @param owner The name of the owner that created a fork of this repository.
   */
  public getFork(owner: string): FakeRepository | undefined {
    const forksToSearch: FakeRepository[] = this.forkOf ? this.forkOf.forks : this.forks;
    return first(forksToSearch, (fork: FakeRepository) => getRepository(fork.name).owner === owner);
  }
}

export class FakeGitHub implements GitHub {
  private readonly users: GitHubUser[] = [];
  private currentUser: GitHubUser | undefined;
  private readonly repositories: FakeRepository[] = [];

  public getRepository(repository: string | Repository): FakeRepository {
    const repositoryFullName: string = getRepositoryFullName(repository);
    const fakeRepository: FakeRepository | undefined = first(this.repositories, (fakeRepository: FakeRepository) => fakeRepository.name === repositoryFullName);
    if (!fakeRepository) {
      throw new Error(`No fake repository exists with the name "${repositoryFullName}".`);
    }
    return fakeRepository;
  }

  private createRepositoryInner(repository: string | Repository, forkOf?: string | Repository): FakeRepository {
    const repositoryFullName: string = getRepositoryFullName(repository);
    let fakeRepository: FakeRepository | undefined = first(this.repositories, (fakeRepository: FakeRepository) => fakeRepository.name === repositoryFullName);
    if (fakeRepository) {
      throw new Error(`A fake repository with the name "${repositoryFullName}" already exists.`);
    } else {
      let forkOfRepository: FakeRepository | undefined;
      if (forkOf) {
        forkOfRepository = this.getRepository(forkOf);
        if (forkOfRepository.forkOf) {
          forkOfRepository = forkOfRepository.forkOf;
        }
      }

      fakeRepository = new FakeRepository(repositoryFullName, forkOfRepository);
      if (forkOfRepository) {
        forkOfRepository.forks.push(fakeRepository);
      }
      this.repositories.push(fakeRepository);
    }
    return fakeRepository;
  }

  public createRepository(repository: string | Repository): FakeRepository {
    return this.createRepositoryInner(repository);
  }

  public forkRepository(repository: string | Repository, forkedRepositoryOwner: string): FakeRepository {
    repository = getRepository(repository);
    const forkedRepository: Repository = {
      owner: forkedRepositoryOwner,
      name: repository.name,
    };
    return this.createRepositoryInner(forkedRepository, repository);
  }

  public deleteRepository(repository: string | Repository): Promise<void> {
    const repositoryFullName: string = getRepositoryFullName(repository);
    const deletedRepository: FakeRepository | undefined = removeFirst(this.repositories, (repo: FakeRepository) => repo.name === repositoryFullName);

    let result: Promise<void>;
    if (!deletedRepository) {
      result = Promise.reject(new Error(`No fake repository exists with the name "${repositoryFullName}".`));
    } else {
      if (deletedRepository.forkOf) {
        removeFirst(deletedRepository.forkOf.forks, (fork: FakeRepository) => fork === deletedRepository);
      }
      result = Promise.resolve();
    }

    return result;
  }

  public createUser(username: string): GitHubUser {
    let user: GitHubUser | undefined = first(this.users, (user: GitHubUser) => user.login === username);
    if (user) {
      throw new Error(`A fake user with the username "${username}" already exists.`);
    } else {
      user = {
        id: 0,
        name: "Fake User Name",
        node_id: "Fake Node ID",
        login: username,
        url: `https://api.github.com/users/${username}`,
        site_admin: false
      };
      this.users.push(user);
    }
    return user;
  }

  public getUser(username: string): GitHubUser {
    const user: GitHubUser | undefined = first(this.users, (user: GitHubUser) => user.login === username);
    if (!user) {
      throw new Error(`No fake user with the username "${username}" exists.`);
    }
    return user;
  }

  public setCurrentUser(username: string): void {
    this.currentUser = this.getUser(username);
  }

  public async getLabel(repository: string | Repository, label: string): Promise<GitHubLabel> {
    let result: Promise<GitHubLabel>;
    const labels: GitHubLabel[] = await this.getLabels(repository);
    const githubLabel: GitHubLabel | undefined = first(labels, (l: GitHubLabel) => l.name === label);
    if (!githubLabel) {
      result = Promise.reject(new Error(`No fake label named "${label}" found in the fake repository "${getRepositoryFullName(repository)}".`));
    } else {
      result = Promise.resolve(githubLabel);
    }
    return result;
  }

  public getCurrentUser(): Promise<GitHubUser> {
    return this.currentUser
      ? Promise.resolve(this.currentUser)
      : Promise.reject(new Error(`No fake current user has been set.`));
  }

  public getLabels(repository: string | Repository): Promise<GitHubLabel[]> {
    return toPromise(() => this.getRepository(repository).labels);
  }

  public async getSprintLabels(repository: string | Repository): Promise<GitHubSprintLabel[]> {
    const labels: GitHubLabel[] = await this.getLabels(repository);
    return getSprintLabels(labels);
  }

  public async createLabel(repository: string | Repository, labelName: string, color: string): Promise<GitHubLabel> {
    let result: Promise<GitHubLabel>;
    if (!labelName) {
      result = Promise.reject(new Error(`labelName cannot be undefined or empty.`));
    } else if (!color) {
      result = Promise.reject(new Error(`label color cannot be undefined or empty.`));
    } else if (color.startsWith("#")) {
      result = Promise.reject(new Error(`Validation Failed`));
    } else {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      const label: GitHubLabel = {
        id: 0,
        default: false,
        node_id: "fake label node_id",
        url: "fake label url",
        name: labelName,
        color,
      };
      fakeRepository.labels.push(label);
      result = Promise.resolve(label);
    }
    return result;
  }

  public async deleteLabel(repository: string | Repository, label: string | GitHubLabel): Promise<void> {
    const labelName: string = (!label || typeof label === "string") ? label : label.name;
    let result: Promise<void>;
    if (!labelName) {
      result = Promise.reject(new Error(`label cannot be undefined or an empty string.`));
    } else {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      const removedLabel: GitHubLabel | undefined = removeFirst(fakeRepository.labels, (label: GitHubLabel) => label.name === labelName);
      if (!removedLabel) {
        result = Promise.reject(new Error(`No label named "${labelName}" found in the fake repository "${getRepositoryFullName(repository)}".`));
      } else {
        result = Promise.resolve();
      }
    }
    return result;
  }

  public async updateLabelColor(repository: string | Repository, labelName: string, newColor: string): Promise<unknown> {
    const fakeRepository: FakeRepository = this.getRepository(repository);
    const label: GitHubLabel | undefined = first(fakeRepository.labels, (label: GitHubLabel) => label.name === labelName);
    let result: Promise<unknown>;
    if (!label) {
      result = Promise.reject(new Error(`No label named "${labelName}" found in the fake repository "${getRepositoryFullName(repository)}".`));
    } else {
      label.color = newColor;
      result = Promise.resolve();
    }
    return result;
  }

  public async getMilestone(repository: string | Repository, milestone: string | number): Promise<GitHubMilestone> {
    const milestones: GitHubMilestone[] = await this.getMilestones(repository);
    let result: Promise<GitHubMilestone>;
    if (typeof milestone === "string") {
      const milestoneMatch: GitHubMilestone | undefined = first(milestones, (m: GitHubMilestone) => m.title === milestone);
      if (!milestoneMatch) {
        result = Promise.reject(new Error(`No milestone found with the name "${milestone}" in the fake repository "${getRepositoryFullName(repository)}".`));
      } else {
        result = Promise.resolve(milestoneMatch);
      }
    } else {
      const milestoneMatch: GitHubMilestone | undefined = first(milestones, (m: GitHubMilestone) => m.number === milestone);
      if (!milestoneMatch) {
        result = Promise.reject(new Error(`No milestone found with the id number ${milestone} in the fake repository "${getRepositoryFullName(repository)}".`));
      } else {
        result = Promise.resolve(milestoneMatch);
      }
    }
    return result;
  }

  public async getMilestones(repository: string | Repository, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]> {
    const fakeRepository: FakeRepository = this.getRepository(repository);
    let result: GitHubMilestone[] = fakeRepository.milestones;
    if (options && options.open !== undefined) {
      result = where(result, (milestone: GitHubMilestone) => milestone.state === (options.open ? "open" : "closed"));
    }
    return result;
  }

  public async getSprintMilestones(repository: string | Repository, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]> {
    const milestones: GitHubMilestone[] = await this.getMilestones(repository, options);
    return githubMilestonesToSprintMilestones(milestones);
  }

  public async createMilestone(repository: string | Repository, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone> {
    const fakeRepository: FakeRepository = this.getRepository(repository);
    const milestone: GitHubMilestone = {
      title: milestoneName,
      number: 0,
      due_on: addOffset(options && options.endDate || "2000-01-02"),
      state: "open",
      closed_issues: 0,
      open_issues: 0
    };
    fakeRepository.milestones.push(milestone);
    return milestone;
  }

  public async createSprintMilestone(repository: string | Repository, sprintNumber: number, sprintEndDate: string): Promise<GitHubSprintMilestone | undefined> {
    const milestoneName = getSprintMilestoneName(sprintNumber);
    const githubMilestone: GitHubMilestone = await this.createMilestone(repository, milestoneName, { endDate: sprintEndDate });
    return githubMilestoneToSprintMilestone(githubMilestone);
  }

  public async updateMilestoneEndDate(repository: string | Repository, milestoneNumber: number, newSprintEndDate: string): Promise<GitHubMilestone> {
    const milestone: GitHubMilestone = await this.getMilestone(repository, milestoneNumber);
    milestone.due_on = addOffset(newSprintEndDate);
    return milestone;
  }

  public async updateSprintMilestoneEndDate(repository: string | Repository, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string): Promise<GitHubSprintMilestone> {
    const githubMilestone: GitHubMilestone = await this.updateMilestoneEndDate(repository, sprintMilestone.milestoneNumber!, newSprintEndDate);
    return githubMilestoneToSprintMilestone(githubMilestone)!;
  }

  public async closeMilestone(repository: string | Repository, milestoneNumber: number): Promise<void> {
    const milestone: GitHubMilestone = await this.getMilestone(repository, milestoneNumber);
    milestone.state = "closed";
  }

  public closeSprintMilestone(repository: string | Repository, sprintMilestone: GitHubSprintMilestone): Promise<void> {
    return this.closeMilestone(repository, sprintMilestone.milestoneNumber!);
  }

  public createFakePullRequest(repository: string | Repository, pullRequest: GitHubPullRequest): FakeGitHubPullRequest {
    repository = getRepository(repository);
    const repositoryFullName: string = getRepositoryFullName(repository);

    const fakeRepository: FakeRepository = this.getRepository(repository);
    let result: FakeGitHubPullRequest;

    const baseBranch: RepositoryBranch = getRepositoryBranch(pullRequest.base.label);
    if (baseBranch.owner !== repository.owner) {
      throw new Error(`The owner of the repository (${repository.owner}) must be the same owner as the base branch (${baseBranch.owner}).`);
    }

    const headBranch: RepositoryBranch = getRepositoryBranch(pullRequest.head.label);
    if (headBranch.owner === repository.owner) {
      // Pull request between branches within the same repository.
      if (!contains(fakeRepository.branches, (branch: GitHubBranch) => branch.name === baseBranch.name)) {
        throw new Error(`No branch exists in the fake repository "${repositoryFullName}" with the name "${baseBranch.name}".`);
      } else if (!contains(fakeRepository.branches, (branch: GitHubBranch) => branch.name === headBranch.name)) {
        throw new Error(`No branch exists in the fake repository "${repositoryFullName}" with the name "${baseBranch.name}".`);
      }
    } else {
      // Pull request between branches in different repositories.
      const forkedRepository: FakeRepository | undefined = fakeRepository.getFork(headBranch.owner);
      if (!forkedRepository) {
        throw new Error(`No fork of the fake repository "${getRepositoryFullName(repository)}" exists for the owner "${headBranch.owner}".`);
      } else if (!contains(forkedRepository.branches, (branch: GitHubBranch) => branch.name === headBranch.name)) {
        throw new Error(`No branch exists in the forked fake repository "${forkedRepository.name}" with the name "${headBranch.name}".`);
      }
    }

    if (pullRequest.base.label === pullRequest.head.label) {
      throw new Error(`The base label ("${pullRequest.base.label}") cannot be the same as the head label ("${pullRequest.head.label}").`);
    } else {
      const existingPullRequest: FakeGitHubPullRequest | undefined = first(fakeRepository.pullRequests, (pr: FakeGitHubPullRequest) => pr.number === pullRequest.number);
      if (existingPullRequest) {
        throw new Error(`A pull request already exists in the fake repository "${getRepositoryFullName(repository)}" with the number ${pullRequest.number}.`);
      } else {
        pullRequest.body = pullRequest.body || "";
        result = {
          ...pullRequest,
          comments: [],
        };
        fakeRepository.pullRequests.push(result);
      }
    }

    return result;
  }

  public async createPullRequest(repository: string | Repository, baseBranch: string | RepositoryBranch, headBranch: string | RepositoryBranch, options: GitHubCreatePullRequestOptions): Promise<GitHubPullRequest> {
    repository = getRepository(repository);
    const fakeRepository: FakeRepository = this.getRepository(repository);
    baseBranch = getRepositoryBranch(baseBranch);
    if (baseBranch.owner) {
      throw new Error(`When creating a pull request, the provided baseBranch (${getRepositoryBranchFullName(baseBranch)}) cannot have an owner.`);
    }
    baseBranch.owner = repository.owner;
    headBranch = getRepositoryBranch(headBranch);
    if (!headBranch.owner) {
      headBranch.owner = repository.owner;
    }
    return this.createFakePullRequest(repository, {
      base: {
        label: getRepositoryBranchFullName(baseBranch),
        ref: baseBranch.name,
        sha: "fake-base-sha",
      },
      diff_url: "fake-diff-url",
      head: {
        label: getRepositoryBranchFullName(headBranch),
        ref: headBranch.name,
        sha: "fake-head-sha",
      },
      html_url: "fake-html-url",
      id: fakeRepository.pullRequests.length + 1,
      labels: [],
      number: fakeRepository.pullRequests.length + 1,
      state: "open",
      title: options.title,
      url: "fake-url",
      body: options.body
    });
  }

  public async updatePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest, options: Partial<GitHubCreatePullRequestOptions> = {}): Promise<unknown> {
    const existingPullRequest: FakeGitHubPullRequest = await this.getPullRequest(repository, getPullRequestNumber(pullRequest));
    Object.assign(existingPullRequest, options);
    return existingPullRequest;
  }

  public async closePullRequest(repository: string | Repository, pullRequestNumber: number | GitHubPullRequest): Promise<void> {
    const existingPullRequest: FakeGitHubPullRequest = await this.getPullRequest(repository, getPullRequestNumber(pullRequestNumber));
    existingPullRequest.state = "closed";
  }

  public async mergePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest, _mergeMethod: GitHubMergeMethod): Promise<void> {
    const existingPullRequest: FakeGitHubPullRequest = await this.getPullRequest(repository, getPullRequestNumber(pullRequest));
    let result: Promise<void>;
    if (existingPullRequest.state === "closed") {
      result = Promise.reject(new Error(`The pull request (${getRepositoryFullName(repository)}/${existingPullRequest.number}) is already closed.`));
    } else {
      existingPullRequest.state = "closed";
      result = Promise.resolve();
    }
    return result;
  }

  public async getPullRequest(repository: string | Repository, pullRequestNumber: number): Promise<FakeGitHubPullRequest> {
    const pullRequests: FakeGitHubPullRequest[] = await this.getPullRequests(repository);
    const pullRequest: FakeGitHubPullRequest | undefined = first(pullRequests, (pr: FakeGitHubPullRequest) => pr.number === pullRequestNumber);
    return pullRequest
      ? Promise.resolve(pullRequest)
      : Promise.reject(new Error(`No pull request found in fake repository "${getRepositoryFullName(repository)}" with number ${pullRequestNumber}.`));
  }

  public getPullRequests(repository: string | Repository, options?: GitHubGetPullRequestsOptions): Promise<FakeGitHubPullRequest[]> {
    const fakeRepository: FakeRepository = this.getRepository(repository);
    let result: FakeGitHubPullRequest[] = fakeRepository.pullRequests;
    if (options) {
      if (options.open) {
        result = where(result, (pullRequest) => pullRequest.state === (options.open ? "open" : "closed"));
      }
      if (options.head) {
        result = where(result, (pullRequest) => pullRequest.head.ref === options.head);
      }
    }
    return Promise.resolve(result);
  }

  public async addPullRequestAssignees(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, assignees: string | GitHubUser | (string | GitHubUser)[]): Promise<void> {
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    const pullRequest: FakeGitHubPullRequest = await this.getPullRequest(repository, pullRequestNumber);

    if (!pullRequest.assignees) {
      pullRequest.assignees = [];
    }

    if (!Array.isArray(assignees)) {
      assignees = [assignees];
    }
    for (const assignee of assignees) {
      if (typeof assignee === "string") {
        pullRequest.assignees.push(await this.getUser(assignee));
      } else {
        pullRequest.assignees.push(assignee);
      }
    }
  }

  public async addPullRequestLabels(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, labelNames: string | string[]): Promise<string[]> {
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    const labelNamesArray: string[] = (Array.isArray(labelNames) ? labelNames : [labelNames]);

    const repositoryLabels: GitHubLabel[] = await this.getLabels(repository);
    for (const labelName of labelNamesArray) {
      if (!contains(repositoryLabels, (repositoryLabel: GitHubLabel) => repositoryLabel.name === labelName)) {
        repositoryLabels.push(await this.createLabel(repository, labelName, "ededed"));
      }
    }

    const pullRequest: FakeGitHubPullRequest = await this.getPullRequest(repository, pullRequestNumber);
    const pullRequestLabels: GitHubLabel[] = pullRequest.labels;
    const pullRequestLabelNames: string[] = map(pullRequestLabels, (label: GitHubLabel) => label.name);
    const labelNamesAddedToPullRequest: string[] = where(labelNamesArray, (labelName: string) => !contains(pullRequestLabelNames, labelName));
    if (labelNamesAddedToPullRequest.length > 0) {
      pullRequest.labels.push(...await Promise.all(map(labelNamesAddedToPullRequest, (labelName: string) => this.getLabel(repository, labelName))));
    }

    return labelNamesAddedToPullRequest;
  }

  public async removePullRequestLabels(repository: string | Repository, githubPullRequest: number | GitHubPullRequest, labelNames: string | string[]): Promise<string[]> {
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    const pullRequest: FakeGitHubPullRequest = await this.getPullRequest(repository, pullRequestNumber);
    const labelNamesToRemove: string[] = (Array.isArray(labelNames) ? labelNames : [labelNames]);
    const currentLabelNames: string[] = map(pullRequest.labels, (label: GitHubLabel) => label.name);
    const removedLabelNames: string[] = where(currentLabelNames, (labelName: string) => contains(labelNamesToRemove, labelName));
    pullRequest.labels = where(pullRequest.labels, (label: GitHubLabel) => !contains(labelNamesToRemove, label.name));
    return removedLabelNames;
  }

  public setPullRequestMilestone(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, milestone: string | number | GitHubMilestone): Promise<unknown> {
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    return this.getPullRequest(repository, pullRequestNumber)
      .then((pullRequest: FakeGitHubPullRequest) => {
        let milestonePromise: Promise<GitHubMilestone>;
        if (typeof milestone === "string" || typeof milestone === "number") {
          milestonePromise = this.getMilestone(repository, milestone);
        } else {
          milestonePromise = Promise.resolve(milestone);
        }

        milestonePromise.then((githubMilestone: GitHubMilestone) => {
          pullRequest.milestone = githubMilestone;
        });
      });
  }

  public getPullRequestComments(repository: string | Repository, githubPullRequest: GitHubPullRequest | number): Promise<GitHubComment[]> {
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    return this.getPullRequest(repository, pullRequestNumber)
      .then((fakePullRequest: FakeGitHubPullRequest) => fakePullRequest.comments);
  }

  public createPullRequestComment(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, commentBody: string): Promise<GitHubComment> {
    return this.getPullRequestComments(repository, githubPullRequest)
      .then((comments: GitHubComment[]) => {
        return this.getCurrentUser()
          .then((currentUser: GitHubUser) => {
            const newComment: GitHubComment = {
              id: comments.length + 1,
              node_id: "fake_node_id",
              user: currentUser,
              html_url: "fake_html_url",
              url: "fake_url",
              body: commentBody,
              created_at: "fake_created_at",
              updated_at: "fake_updated_at",
            };
            comments.push(newComment);
            return newComment;
          });
      });
  }

  public updatePullRequestComment(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, comment: number | GitHubComment, commentBody: string): Promise<GitHubComment> {
    return this.getPullRequestComments(repository, githubPullRequest)
      .then((comments: GitHubComment[]) => {
        let result: Promise<GitHubComment>;
        const commentId: number = getCommentId(comment);
        const commentToUpdate: GitHubComment | undefined = first(comments, (existingComment: GitHubComment) => existingComment.id === commentId);
        if (!commentToUpdate) {
          result = Promise.reject(new Error(`No comment found with the ID ${commentId}.`));
        } else {
          commentToUpdate.body = commentBody;
          result = Promise.resolve(commentToUpdate);
        }
        return result;
      });
  }

  public deletePullRequestComment(repository: string | Repository, githubPullRequest: number | GitHubPullRequest, comment: number | GitHubComment): Promise<unknown> {
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    return this.getPullRequest(repository, pullRequestNumber)
      .then((pullRequest: FakeGitHubPullRequest) => {
        let result: Promise<unknown>;
        const commentId: number = getCommentId(comment);
        if (!contains(pullRequest.comments, (existingComment: GitHubComment) => existingComment.id === commentId)) {
          result = Promise.reject(new Error(`No comment was found with the id ${commentId}.`));
        } else {
          pullRequest.comments = where(pullRequest.comments, (existingComment: GitHubComment) => existingComment.id !== commentId);
          result = Promise.resolve();
        }
        return result;
      });
  }

  public getCommit(repository: string | Repository, commitId: string): Promise<GitHubCommit | undefined> {
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      return first(fakeRepository.commits, (commit: GitHubCommit) => commit.sha.startsWith(commitId));
    });
  }

  public getContributorsStats(repository: string | Repository): Promise<number | undefined> {
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      return fakeRepository.commits.length;
    });
  }

  public getContents(repository: string | Repository, filepath: string): Promise<GitHubContent | undefined | Array<GitHubContentItem>> {
    if (filepath !== undefined) {
      return toPromise(() => {
        const fakeRepository: FakeRepository = this.getRepository(repository);
        return first(fakeRepository.content);
      });
    }
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      return first(fakeRepository.content);
    });
  }

  public getCommonMsg(repository: string | Repository): Promise<boolean> {
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      return fakeRepository !== undefined;
    });
  }

  public createCommit(repository: string | Repository, commitId: string, message: string): Promise<unknown> {
    const fakeRepository: FakeRepository = this.getRepository(repository);
    fakeRepository.commits.push({
      sha: commitId,
      commit: {
        message
      }
    });
    return Promise.resolve();
  }

  public getAllReferences(repository: string | Repository): Promise<GitHubReference[]> {
    return toPromise(() => this.getRepository(repository).branches);
  }

  public getAllBranches(repository: string | Repository): Promise<GitHubBranch[]> {
    return this.getAllReferences(repository)
      .then(referencesToBranches);
  }

  public getBranch(repository: string | Repository, branchName: string): Promise<GitHubBranch> {
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      const result: GitHubBranch | undefined = first(fakeRepository.branches, (branch: GitHubBranch) => branch.name === branchName);
      if (!result) {
        throw new Error(`Could not get details about the branch "${branchName}" in repository "${fakeRepository.name}" because the branch didn't exist.`);
      }
      return result;
    });
  }

  public deleteBranch(repository: string | Repository, branchName: string): Promise<unknown> {
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      const removedBranch: GitHubBranch | undefined = removeFirst(fakeRepository.branches, (branch: GitHubBranch) => branch.name === branchName);
      if (!removedBranch) {
        throw new Error(`Could not delete branch "${branchName}" from repository "${fakeRepository.name}" because the branch didn't exist.`);
      }
    });
  }

  public createBranch(repository: string | Repository, branchName: string, branchSha: string): Promise<GitHubBranch> {
    return toPromise(() => {
      const fakeRepository: FakeRepository = this.getRepository(repository);
      let result: GitHubBranch;
      if (contains(fakeRepository.branches, (branch: GitHubBranch) => branch.name === branchName)) {
        throw new Error(`Could not create a branch named "${branchName}" in repository "${fakeRepository.name}" because a branch with that name already exists.`);
      } else if (!contains(fakeRepository.commits, (commit: GitHubCommit) => commit.sha === branchSha)) {
        throw new Error(`Could not create a branch named "${branchName}" in repository "${fakeRepository.name}" with the SHA "${branchSha}" because no commit exists in the repository with the provided SHA.`);
      } else {
        result = {
          name: branchName,
          ref: `refs/heads/${branchName}`,
          node_id: "fake-node-id",
          url: "fake-branch-url",
          object: {
            type: "commit",
            sha: branchSha,
            url: "fake-branch-commit-sha",
          }
        };
        fakeRepository.branches.push(result);
      }
      return result;
    });
  }
}

export function getSprintLabels(labels: GitHubLabel[]): GitHubSprintLabel[] {
  const repositorySprintLabels: GitHubSprintLabel[] = [];
  for (const repositoryLabel of labels) {
    if (repositoryLabel && repositoryLabel.name && repositoryLabel.name.includes("-Sprint-")) {
      const repositoryLabelName: string = repositoryLabel.name;

      const firstDashIndex: number = repositoryLabelName.indexOf("-");
      const sprintLabelType: string = repositoryLabelName.substring(0, firstDashIndex);

      const lastDashIndex: number = repositoryLabelName.lastIndexOf("-");
      const sprintNumber: number = parseInt(repositoryLabelName.substring(lastDashIndex + 1));

      let sprintLabel: GitHubSprintLabel | undefined = first(repositorySprintLabels, (resultLabel: GitHubSprintLabel) => resultLabel.sprint === sprintNumber);
      if (sprintLabel == undefined) {
        sprintLabel = {
          sprint: sprintNumber
        };
        repositorySprintLabels.push(sprintLabel);
      }
      (sprintLabel as any)[sprintLabelType.toLowerCase() + "Color"] = repositoryLabel.color;
    }
  }
  return repositorySprintLabels;
}

/**
 * A class that wraps @octokit/rest to interact with github.com.
 */
export class RealGitHub implements GitHub {
  private constructor(private readonly githubClients: Octokit | StringMap<Octokit> | ((scope: string) => Promise<Octokit>)) {
  }

  public static fromOctokit(github: Octokit | StringMap<Octokit> | ((scope: string) => Promise<Octokit>)): RealGitHub {
    return new RealGitHub(github);
  }

  public static fromToken(authenticationToken: string): RealGitHub {
    const options: Octokit.Options = {
      auth: authenticationToken.trim()
    };
    const github = new Octokit(options);
    return new RealGitHub(github);
  }

  public static fromTokenFile(tokenFilePath: string): RealGitHub {
    if (!fs.existsSync(tokenFilePath)) {
      throw new Error(`The file ${tokenFilePath} doesn't exist. Create a GitHub personal access token, create this file with the personal access token as its contents, and then run this application again.`);
    }

    const githubAuthToken: string = fs.readFileSync(tokenFilePath, { encoding: "utf-8" });

    return RealGitHub.fromToken(githubAuthToken);
  }

  private async getClient(repository: string | Repository): Promise<Octokit> {
    const repo = getRepository(repository);
    if (isOctokit(this.githubClients)) {
      return this.githubClients;
    } else if (typeof this.githubClients === "function") {
      return (await this.githubClients(repo.owner));
    } else {
      let matchingScope = "";
      const fullRepositoryName: string = getRepositoryFullName(repository).toLowerCase();
      for (let [scope, githubClient] of Object.entries(this.githubClients)) {
        scope = scope.toLowerCase();
        if (fullRepositoryName.startsWith(scope) && scope.length > matchingScope.length) {
          matchingScope = scope;
          return githubClient;
        }
      }
      return this.getDefaultClient();
      // throw new Error(`No GitHub client registered to be used with repository "${fullRepositoryName}".`);
    }
  }

  private async getDefaultClient(): Promise<Octokit> {
    let result: Octokit;
    if (isOctokit(this.githubClients)) {
      result = this.githubClients;
    } else if (typeof this.githubClients === "function") {
      return this.githubClients("");
    } else {
      result = Object.values(this.githubClients)[0];
    }
    return result;
  }

  public async getCurrentUser(): Promise<GitHubUser> {
    const response: Octokit.Response<any> = await (await this.getDefaultClient()).users.getAuthenticated();
    const result: GitHubUser = response.data;
    return result;
  }

  public async getContents(repository: string | Repository, filepath: string): Promise<GitHubContent | undefined | Array<GitHubContentItem>> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.ReposGetContentsParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      path: filepath
    };
    let result: GitHubContent | undefined | Array<GitHubContentItem>;
    try {
      const response = await (await this.getClient(repository)).repos.getContents(githubArguments);
      if (response.data && response.status === 200) {
        result = response.data;
      }
    } catch (error) {
      if (!error.message.toLowerCase().includes("no commit found")) {
        throw error;
      }
    }
    return result;
  }

  public async getCommonMsg(repository: string | Repository): Promise<boolean> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.ReposGetParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name
    };
    let status: boolean;
    try {
      const response = await (await this.getClient(repository)).repos.get(githubArguments);
      status = response.status === 200;
    } catch (error) {
      status = false;
      if (!error.message.toLowerCase().includes("no commit found")) {
        throw error;
      }
    }
    return status;
  }

  public async getLabels(repository: string | Repository): Promise<GitHubLabel[]> {
    const githubRepository: Repository = getRepository(repository);
    const response: Octokit.RequestOptions = await (await this.getClient(repository)).issues.listLabelsForRepo.endpoint.merge({
      owner: githubRepository.owner,
      repo: githubRepository.name
    });
    return await this.getAllPageData(repository, response);
  }

  public async getSprintLabels(repository: string | Repository): Promise<GitHubSprintLabel[]> {
    const labels: GitHubLabel[] = await this.getLabels(repository);
    return getSprintLabels(labels);
  }

  public async createLabel(repository: string | Repository, labelName: string, color: string): Promise<GitHubLabel> {
    const githubRepository: Repository = getRepository(repository);
    const response: Octokit.Response<Octokit.IssuesCreateLabelResponse> = await (await this.getClient(repository)).issues.createLabel({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      name: labelName,
      color: color
    });
    const result: GitHubLabel = response.data;
    return result;
  }

  public async deleteLabel(repository: string | Repository, label: string | GitHubLabel): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    const labelName: string = (!label || typeof label === "string") ? label : label.name;
    const githubArguments: Octokit.IssuesDeleteLabelParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      name: labelName
    };
    return (await this.getClient(repository)).issues.deleteLabel(githubArguments);
  }

  public async updateLabelColor(repository: string | Repository, labelName: string, newColor: string): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    return (await this.getClient(repository)).issues.updateLabel({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      current_name: labelName,
      color: newColor
    });
  }

  public async getMilestone(repository: string | Repository, milestone: number | string): Promise<GitHubMilestone> {
    const githubRepository: Repository = getRepository(repository);
    let result: GitHubMilestone;
    if (typeof milestone === "number") {
      const response: Octokit.Response<Octokit.IssuesGetMilestoneResponse> = await (await this.getClient(repository)).issues.getMilestone({
        owner: githubRepository.owner,
        repo: githubRepository.name,
        number: milestone
      });
      result = response.data as any;
    } else {
      const milestones: GitHubMilestone[] = await this.getMilestones(githubRepository);
      const matchingMilestone: GitHubMilestone | undefined = first(milestones, (githubMilestone: GitHubMilestone) => githubMilestone.title === milestone);
      if (!matchingMilestone) {
        throw new Error(`Could not find a milestone in repository "${getRepositoryFullName(githubRepository)}" with the name "${milestone}".`);
      }
      result = matchingMilestone;
    }
    return result;
  }

  /**
   * Get all of the milestones that exist in the repository with the provided name.
   * @param repositoryName The name of the repository to get all of the milestones of.
   * @returns All of the milestones that exist in the provided repository.
   */
  public async getMilestones(repository: string | Repository, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]> {
    let milestoneState: GitHubMilestoneState | "all" = "all";
    if (options) {
      if (options.open === true) {
        milestoneState = "open";
      } else if (options.open === false) {
        milestoneState = "closed";
      }
    }

    const githubRepository: Repository = getRepository(repository);
    const requestOptions: Octokit.RequestOptions = await (await this.getClient(repository)).issues.listMilestonesForRepo.endpoint.merge({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      state: milestoneState
    });
    const result: GitHubMilestone[] = await this.getAllPageData(repository, requestOptions);
    return result;
  }

  public getSprintMilestones(repository: string | Repository, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]> {
    return this.getMilestones(repository, options)
      .then(githubMilestonesToSprintMilestones);
  }

  public async createMilestone(repository: string | Repository, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone> {
    const githubRepository: Repository = getRepository(repository);
    const createMilestoneArguments: Octokit.IssuesCreateMilestoneParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      title: milestoneName
    };

    if (options && options.endDate) {
      createMilestoneArguments.due_on = addOffset(options.endDate);
    }

    const response: Octokit.Response<Octokit.IssuesCreateMilestoneResponse> = await (await this.getClient(repository)).issues.createMilestone(createMilestoneArguments);
    const result: GitHubMilestone = response.data as any;
    return result;
  }

  public createSprintMilestone(repository: string | Repository, sprintNumber: number, sprintEndDate: string): Promise<GitHubSprintMilestone | undefined> {
    const milestoneName = getSprintMilestoneName(sprintNumber);
    return this.createMilestone(repository, milestoneName, { endDate: sprintEndDate })
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone);
      });
  }

  public async updateMilestoneEndDate(repository: string | Repository, milestoneNumber: number, newSprintEndDate: string): Promise<GitHubMilestone> {
    newSprintEndDate = addOffset(newSprintEndDate);
    const githubRepository: Repository = getRepository(repository);
    const response = await (await this.getClient(repository)).issues.updateMilestone({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      number: milestoneNumber,
      due_on: newSprintEndDate
    });
    const result: GitHubMilestone = response.data as any;
    return result;
  }

  public updateSprintMilestoneEndDate(repository: string | Repository, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string): Promise<GitHubSprintMilestone> {
    return this.updateMilestoneEndDate(repository, sprintMilestone.milestoneNumber!, newSprintEndDate)
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone)!;
      });
  }

  public async closeMilestone(repository: string | Repository, milestoneNumber: number): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    return (await this.getClient(repository)).issues.updateMilestone({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      number: milestoneNumber,
      state: "closed"
    });
  }

  public closeSprintMilestone(repository: string | Repository, sprintMilestone: GitHubSprintMilestone): Promise<unknown> {
    return this.closeMilestone(repository, sprintMilestone.milestoneNumber!);
  }

  public async createPullRequest(repository: string | Repository, baseBranch: string, headBranch: string | RepositoryBranch, options: GitHubCreatePullRequestOptions): Promise<GitHubPullRequest> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.PullsCreateParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      base: baseBranch,
      head: getRepositoryBranchFullName(headBranch),
      title: options.title,
      body: options.body,
      maintainer_can_modify: options.maintainerCanModify || false,
    };
    const response = await (await this.getClient(repository)).pulls.create(githubArguments);
    const result: GitHubPullRequest = response.data as GitHubPullRequest;
    result.body = result.body || "";
    return result;
  }

  public async updatePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest, options: Partial<GitHubCreatePullRequestOptions> = {}): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    const response = await (await this.getClient(repository)).pulls.update({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      pull_number: getPullRequestNumber(pullRequest),
      title: options.title,
      body: options.body,
      maintainer_can_modify: options.maintainerCanModify
    });
    return response.data;
  }

  public async closePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    const response = await (await this.getClient(repository)).pulls.update({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      pull_number: getPullRequestNumber(pullRequest),
      state: "closed"
    });
    return response.data;
  }

  public async mergePullRequest(repository: string | Repository, pullRequest: number | GitHubPullRequest, mergeMethod?: GitHubMergeMethod): Promise<GitHubPullRequest> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.PullsMergeParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      pull_number: getPullRequestNumber(pullRequest),
      merge_method: mergeMethod,
    };
    const response: Octokit.Response<any> = await (await this.getClient(repository)).pulls.merge(githubArguments);
    const result: GitHubPullRequest = response.data;
    return result;
  }

  public async getPullRequest(repository: string | Repository, pullRequestNumber: number): Promise<GitHubPullRequest> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.PullsGetParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      pull_number: pullRequestNumber
    };
    const response = await (await this.getClient(repository)).pulls.get(githubArguments);
    const result: GitHubPullRequest = response.data as GitHubPullRequest;
    result.body = result.body || "";
    return result;
  }

  public async getPullRequests(repository: string | Repository, options?: GitHubGetPullRequestsOptions): Promise<GitHubPullRequest[]> {
    let pullRequestState: GitHubPullRequestState | "all" = "all";
    if (options) {
      if (options.open === true) {
        pullRequestState = "open";
      } else if (options.open === false) {
        pullRequestState = "closed";
      }
    }

    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.PullsListParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      state: pullRequestState,
      ...options
    };
    const requestOptions: Octokit.RequestOptions = await (await this.getClient(repository)).pulls.list.endpoint.merge(githubArguments);
    const result: GitHubPullRequest[] = await this.getAllPageData(repository, requestOptions);
    return result;
  }

  public async addPullRequestAssignees(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, assignees: string | GitHubUser | (string | GitHubUser)[]): Promise<unknown> {
    let assigneeLogins: string[];
    if (typeof assignees === "string") {
      assigneeLogins = [assignees];
    } else if (!(assignees instanceof Array)) {
      assigneeLogins = [assignees.login];
    } else {
      assigneeLogins = map(assignees, (assignee: string | GitHubUser) => {
        return typeof assignee === "string" ? assignee : assignee.login;
      });
    }

    const currentAssigneeLogins: string[] = typeof githubPullRequest === "number" ? [] : map(githubPullRequest.assignees, (assignee: GitHubUser) => assignee.login);
    const assigneeLoginsToAdd: string[] = where(assigneeLogins, (assigneeLogin: string) => !contains(currentAssigneeLogins, assigneeLogin));

    let result: Promise<unknown>;
    if (assigneeLoginsToAdd.length === 0) {
      result = Promise.resolve();
    } else {
      const updatedAssigneeLogins: string[] = [...currentAssigneeLogins, ...assigneeLoginsToAdd];
      const githubRepository: Repository = getRepository(repository);
      result = (await this.getClient(repository)).issues.update({
        owner: githubRepository.owner,
        repo: githubRepository.name,
        number: getPullRequestNumber(githubPullRequest),
        assignees: updatedAssigneeLogins
      });
    }
    return result;
  }

  public async addPullRequestLabels(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, labelNames: string | string[]): Promise<string[]> {
    const labelNamesArray: string[] = (typeof labelNames === "string" ? [labelNames] : labelNames);
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    const pullRequest: GitHubPullRequest = await this.getPullRequest(repository, pullRequestNumber);
    const currentLabelNames: string[] = map(pullRequest.labels, (label: GitHubLabel) => label.name);
    const labelNamesToAdd: string[] = where(labelNamesArray, (labelName: string) => !contains(currentLabelNames, labelName));
    if (labelNamesToAdd.length > 0) {
      const updatedLabelNamesArray: string[] = [...currentLabelNames, ...labelNamesToAdd];
      const githubRepository: Repository = getRepository(repository);
      await (await this.getClient(repository)).issues.update({
        owner: githubRepository.owner,
        repo: githubRepository.name,
        issue_number: getPullRequestNumber(githubPullRequest),
        labels: updatedLabelNamesArray
      });
    }
    return labelNamesToAdd;
  }

  public async removePullRequestLabels(repository: string | Repository, githubPullRequest: number | GitHubPullRequest, labelNames: string | string[]): Promise<string[]> {
    const labelNamesArray: string[] = (typeof labelNames === "string" ? [labelNames] : labelNames);
    const pullRequestNumber: number = getPullRequestNumber(githubPullRequest);
    const pullRequest: GitHubPullRequest = await this.getPullRequest(repository, pullRequestNumber);
    const currentLabelNames: string[] = map(pullRequest.labels, (label: GitHubLabel) => label.name);
    const removedLabelNames: string[] = where(currentLabelNames, (currentLabelName: string) => contains(labelNamesArray, currentLabelName));
    if (removedLabelNames.length > 0) {
      const updatedLabelNamesArray: string[] = where(currentLabelNames, (currentLabelName: string) => !contains(labelNamesArray, currentLabelName));
      const githubRepository: Repository = getRepository(repository);
      await (await this.getClient(repository)).issues.update({
        owner: githubRepository.owner,
        repo: githubRepository.name,
        issue_number: pullRequestNumber,
        labels: updatedLabelNamesArray
      });
    }
    return removedLabelNames;
  }

  public async setPullRequestMilestone(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, milestone: number | string | GitHubMilestone): Promise<unknown> {
    let milestoneNumber: number;
    if (typeof milestone === "number") {
      milestoneNumber = milestone;
    } else if (typeof milestone === "string") {
      const githubMilestone: GitHubMilestone = await this.getMilestone(repository, milestone);
      milestoneNumber = githubMilestone.number;
    } else {
      milestoneNumber = milestone.number;
    }

    const githubRepository: Repository = getRepository(repository);
    return (await this.getClient(repository)).issues.update({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      number: getPullRequestNumber(githubPullRequest),
      milestone: milestoneNumber
    });
  }

  /**
   * Get all of the pages associated with the provided pageResponse.
   * @param pageResponse One of the page responses in an overall response.
   */
  private async getAllPageData<T>(repository: string | Repository, requestOptions: Octokit.RequestOptions): Promise<T[]> {
    return (await this.getClient(repository)).paginate(requestOptions);
  }

  public async getPullRequestComments(repository: string | Repository, githubPullRequest: GitHubPullRequest | number): Promise<GitHubComment[]> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.IssuesListCommentsParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      issue_number: getPullRequestNumber(githubPullRequest)
    };
    const requestOptions: Octokit.RequestOptions = await (await this.getClient(repository)).issues.listComments.endpoint.merge(githubArguments);
    return await this.getAllPageData(repository, requestOptions);
  }

  public async createPullRequestComment(repository: string | Repository, githubPullRequest: GitHubPullRequest | number, commentBody: string): Promise<GitHubComment> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.IssuesCreateCommentParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      issue_number: getPullRequestNumber(githubPullRequest),
      body: commentBody
    };
    const response = await (await this.getClient(repository)).issues.createComment(githubArguments);
    const result: GitHubComment = response.data;
    return result;
  }

  public async updatePullRequestComment(repository: string | Repository, _githubPullRequest: GitHubPullRequest | number, comment: GitHubComment | number, commentBody: string): Promise<GitHubComment> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.IssuesUpdateCommentParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      comment_id: getCommentId(comment).toString(),
      body: commentBody
    } as any;
    const response = await (await this.getClient(repository)).issues.updateComment(githubArguments);
    const result: GitHubComment = response.data;
    return result;
  }

  public async deletePullRequestComment(repository: string | Repository, _githubPullRequest: number | GitHubPullRequest, comment: number | GitHubComment): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.IssuesDeleteCommentParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      comment_id: getCommentId(comment).toString()
    } as any;
    return (await this.getClient(repository)).issues.deleteComment(githubArguments);
  }

  public async getCommit(repository: string | Repository, commit: string): Promise<GitHubCommit | undefined> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.ReposGetCommitParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name,
      ref: commit
    };
    let result: GitHubCommit | undefined;
    try {
      const response = await (await this.getClient(repository)).repos.getCommit(githubArguments);
      if (response.data) {
        result = response.data;
      }
    } catch (error) {
      if (!error.message.toLowerCase().includes("no commit found")) {
        throw error;
      }
    }
    return result;
  }

  public async getContributorsStats(repository: string | Repository): Promise<number | undefined> {
    const githubRepository: Repository = getRepository(repository);
    const githubArguments: Octokit.ReposGetContributorsStatsParams = {
      owner: githubRepository.owner,
      repo: githubRepository.name
    };
    let result: number | undefined;
    try {
      const response = await (await this.getClient(repository)).repos.getContributorsStats(githubArguments);
      if (response.data) {
        result = response.data.length;
      }
    } catch (error) {
        throw error;
    }
    return result;
  }

  public async getAllReferences(repository: string | Repository): Promise<GitHubReference[]> {
    const githubRepository: Repository = getRepository(repository);
    const requestOptions: Octokit.RequestOptions = await (await this.getClient(repository)).git.listRefs.endpoint.merge({
      owner: githubRepository.owner,
      repo: githubRepository.name,
    });
    return await this.getAllPageData(repository, requestOptions);
  }

  public async getAllBranches(repository: string | Repository): Promise<GitHubBranch[]> {
    const githubRepository: Repository = getRepository(repository);
    const requestOptions: Octokit.RequestOptions = await (await this.getClient(repository)).git.listRefs.endpoint.merge({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      namespace: "heads/",
    });
    const references: GitHubReference[] = await this.getAllPageData(repository, requestOptions);
    return referencesToBranches(references);
  }

  public async getBranch(repository: string | Repository, branchName: string): Promise<GitHubBranch> {
    const githubRepository: Repository = getRepository(repository);
    if (!branchName) {
      throw new Error(`Cannot get branch details about an empty or undefined branch.`);
    }
    const response = await (await this.getClient(repository)).git.getRef({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      ref: `heads/${branchName}`,
    });
    const githubReference: GitHubReference = response.data;
    return {
      ...githubReference,
      name: branchName,
    };
  }

  public async deleteBranch(repository: string | Repository, branchName: string): Promise<unknown> {
    const githubRepository: Repository = getRepository(repository);
    return (await this.getClient(repository)).git.deleteRef({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      ref: `heads/${branchName}`,
    });
  }

  public async createBranch(repository: string | Repository, branchName: string, branchSha: string): Promise<GitHubBranch> {
    const githubRepository: Repository = getRepository(repository);
    const response = await (await this.getClient(repository)).git.createRef({
      owner: githubRepository.owner,
      repo: githubRepository.name,
      ref: `refs/heads/${branchName}`,
      sha: branchSha,
    });
    const reference: GitHubReference = response.data;
    const result: GitHubBranch = {
      name: branchName,
      ...reference,
    };
    return result;
  }
}

function referencesToBranches(references: GitHubReference[]): GitHubBranch[] {
  return map(references, (reference: GitHubReference) => {
    return {
      ...reference,
      name: reference.ref.substring("refs/heads/".length),
    };
  });
}

function githubMilestonesToSprintMilestones(githubMilestones: GitHubMilestone[]): GitHubSprintMilestone[] {
  const result: GitHubSprintMilestone[] = [];
  for (const githubMilestone of githubMilestones) {
    const sprintMilestone: GitHubSprintMilestone | undefined = githubMilestoneToSprintMilestone(githubMilestone);
    if (sprintMilestone) {
      result.push(sprintMilestone);
    }
  }
  return result;
}

function githubMilestoneToSprintMilestone(githubMilestone: GitHubMilestone): GitHubSprintMilestone | undefined {
  let result: GitHubSprintMilestone | undefined;

  if (githubMilestone && githubMilestone.title && githubMilestone.title.startsWith("Sprint-")) {
    const sprintNumber: number = parseInt(githubMilestone.title.substring(githubMilestone.title.indexOf("-") + 1));

    let sprintEndDate: string = githubMilestone.due_on;
    if (sprintEndDate && sprintEndDate.includes("T")) {
      sprintEndDate = sprintEndDate.substring(0, sprintEndDate.indexOf("T"));
    }

    result = {
      sprint: sprintNumber,
      endDate: sprintEndDate,
      milestoneNumber: githubMilestone.number,
      openIssueCount: githubMilestone.open_issues,
      open: githubMilestone.state === "open"
    };
  }
  return result;
}

export function getSprintMilestoneName(sprintNumber: number): string {
  return `Sprint-${sprintNumber}`;
}

/**
 * Ensure that the provided date string contains a timezone offset.
 * @param date The date string.
 * @returns The date string with a timezone offset (if it didn't already have one).
 */
function addOffset(date: string): string {
  if (date) {
    if (!date.includes("T")) {
      const now = new Date();
      const totalOffsetInMinutes: number = now.getTimezoneOffset();
      const offsetHours: string = Math.floor(totalOffsetInMinutes / 60).toString().padStart(2, "0");
      const offsetMinutes: string = (totalOffsetInMinutes % 60).toString().padStart(2, "0");
      date += `T${offsetHours}:${offsetMinutes}:00`;
    }
    if (!date.endsWith("Z")) {
      date += "Z";
    }
  }
  return date;
}

/**
 * Get the GitHubRepository object from the provided repository URL.
 * @param repositoryUrl The repository URL to get the GitHubRepository object from.
 */
export function getGitHubRepositoryFromUrl(repositoryUrl: string): Repository | undefined {
  let result: Repository | undefined;
  const repositoryUrlBuilder: URLBuilder = URLBuilder.parse(repositoryUrl);
  const host: string | undefined = repositoryUrlBuilder.getHost();
  const path: string | undefined = repositoryUrlBuilder.getPath();
  if (host === "github.com" && path) {
    let organization: string;
    let name: string;
    const pathFirstSlashIndex: number = path.indexOf("/", 1);
    if (pathFirstSlashIndex === -1) {
      organization = "";
      name = path.substring(1);
    } else {
      organization = path.substring(1, pathFirstSlashIndex);
      const pathSecondSlashIndex: number = path.indexOf("/", pathFirstSlashIndex + 1);
      if (pathSecondSlashIndex === -1) {
        name = path.substring(pathFirstSlashIndex + 1);
      } else {
        name = path.substring(pathFirstSlashIndex + 1, pathSecondSlashIndex);
      }

      if (!name || name === "blob") {
        name = organization;
        organization = "";
      }
    }

    if (name.endsWith(".git")) {
      name = name.substring(0, name.length - ".git".length);
    }

    if (name) {
      result = {
        owner: organization,
        name
      };
    }
  }
  return result;
}

function isOctokit(value: any): value is Octokit {
  return value &&
    !!value.activity &&
    !!value.apps &&
    !!value.authenticate &&
    !!value.checks &&
    !!value.codesOfConduct &&
    !!value.emojis;
}

function toPromise<T>(action: () => T): Promise<T> {
  try {
    return Promise.resolve(action());
  } catch (error) {
    return Promise.reject(error);
  }
}
