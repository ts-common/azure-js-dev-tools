import Octokit from "@octokit/rest";
import * as fs from "fs";
import { contains, first, map, where } from "./arrays";

/**
 * The name and optional organization that the repository belongs to.
 */
export interface GitHubRepository {
  /**
   * The name of the repository.
   */
  name: string;
  /**
   * The organization that owns the repository.
   */
  organization: string;
}

/**
 * Get a GitHubRepository object from the provided string or GitHubRepository object.
 * @param repository The repository name or object.
 */
export function getGitHubRepository(repository: string | GitHubRepository): GitHubRepository {
  let result: GitHubRepository;
  if (!repository) {
    result = {
      name: repository,
      organization: ""
    };
  } else if (typeof repository === "string") {
    let slashIndex: number = repository.indexOf("/");
    if (slashIndex === -1) {
      slashIndex = repository.indexOf("\\");
    }
    result = {
      name: repository.substr(slashIndex + 1),
      organization: slashIndex === -1 ? "" : repository.substr(0, slashIndex)
    };
  } else {
    result = repository;
  }
  return result;
}

/**
 * Get the full name of the provided repository.
 * @param repository The repository to get the full name of.
 */
export function getRepositoryFullName(repository: string | GitHubRepository): string {
  let result: string;
  if (!repository) {
    result = "";
  } else if (typeof repository === "string") {
    result = repository;
  } else if (!repository.organization) {
    result = repository.name;
  } else {
    result = `${repository.organization}/${repository.name}`;
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

export interface GitHubMilestone {
  title: string;
  due_on: string;
  number: number;
  open_issues: number;
  closed_issues: number;
  state: "open" | "closed";
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

export interface GitHubPullRequest {
  base: GitHubCommit;
  head: GitHubCommit;
  id: number;
  labels: GitHubLabel[];
  number: number;
  state: "open" | "closed";
  title: string;
  url: string;
  html_url: string;
  diff_url: string;
  milestone?: GitHubMilestone;
  assignees?: GitHubUser[];
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  url: string;
}

export interface GitHubCommit {
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
export interface GitHubGetPullRequestsOptions {
  /**
   * Filter the results to the pull requests that are either open (true) or closed (false). If this
   * value is undefined, then all pull requests will be returned.
   */
  open?: boolean;
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
  getLabels(repository: string | GitHubRepository): Promise<GitHubLabel[]>;

  /**
   * Get all of the labels that contain "-Sprint-" in the provided repository.
   * @param repository The repository to look in.
   */
  getSprintLabels(repository: string | GitHubRepository): Promise<GitHubSprintLabel[]>;

  /**
   * Create a label with the provided labelName and color in the provided repository.
   * @param repositoryName The name of the repository where the label will be created.
   * @param labelName The name of the created label.
   * @param color The color of the created label.
   */
  createLabel(repository: string | GitHubRepository, labelName: string, color: string): Promise<void>;

  /**
   * Update the color of the label with the provided name in the provided repository.
   * @param repository The repository that contains the label to update.
   * @param labelName The name of the label to update.
   * @param newColor The color to update the label to.
   */
  updateLabelColor(repositoryName: string, labelName: string, newColor: string, repositoryOwner?: string): Promise<void>;

  /**
   * Get the milestone in the provided repository with either the provided milestone number or name.
   */
  getMilestone(repository: string | GitHubRepository, milestone: number | string): Promise<GitHubMilestone>;

  /**
   * Get all of the milestones that exist in the provided repository.
   * @param repository The repository to get all of the milestones of.
   * @returns All of the milestones that exist in the provided repository.
   */
  getMilestones(repository: string | GitHubRepository, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]>;

  /**
   * Get all of the sprint milestones (milestones that begin with "Sprint-") in the provided
   * repository.
   * @param repository The repository.
   * @returns All of the sprint milestones in the provided repository.
   */
  getSprintMilestones(repository: string | GitHubRepository, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]>;

  /**
   * Create a new milestone in the provided repository.
   * @param repository The repository to create a new milestone in.
   * @param milestoneName The name of the new milestone.
   * @param options The optional properties to set on the created milestone.
   */
  createMilestone(repositoryName: string | GitHubRepository, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone>;

  /**
   * Create a new sprint milestone in the provided repository.
   * @param repository The repository to create the new sprint milestone in.
   * @param sprintNumber The number of the sprint that the milestone will be associated with.
   * @param sprintEndDate The last day of the sprint.
   */
  createSprintMilestone(repository: string | GitHubRepository, sprintNumber: number, sprintEndDate: string): Promise<GitHubSprintMilestone | undefined>;

  /**
   * Update the end date of an existing milestone in the provided repository.
   * @param repository The repository that contains the milestone to update.
   * @param milestoneNumber The number id of the milestone to update.
   * @param newSprintEndDate The new end date to update the existing milestone to.
   */
  updateMilestoneEndDate(repository: string | GitHubRepository, milestoneNumber: number, newSprintEndDate: string): Promise<GitHubMilestone>;

  updateSprintMilestoneEndDate(repository: string | GitHubRepository, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string): Promise<GitHubSprintMilestone>;

  closeMilestone(repository: string | GitHubRepository, milestoneNumber: number): Promise<void>;

  closeSprintMilestone(repository: string | GitHubRepository, sprintMilestone: GitHubSprintMilestone): Promise<void>;

  /**
   * Get the pull requests in the provided respository.
   * @param repository The name of the repository.
   */
  getPullRequests(repository: string | GitHubRepository, options?: GitHubGetPullRequestsOptions): Promise<GitHubPullRequest[]>;

  addPullRequestAssignees(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, assignees: string | GitHubUser | (string | GitHubUser)[]): Promise<void>;

  /**
   * Add the provided labels to the provided GitHubPullRequest.
   * @param repository The repository where the pull request exists.
   * @param githubPullRequest The GitHubPullRequest that the labels will be added to.
   * @param labelNamesToAdd The name of the label or labels to add to the pull request.
   */
  addPullRequestLabels(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, labelNames: string | string[]): Promise<void>;

  setPullRequestMilestone(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, milestone: number | string | GitHubMilestone): Promise<void>;
}

export class FakeGitHubRepository {
  public readonly name: string;
  public readonly labels: GitHubLabel[] = [];
  public readonly milestones: GitHubMilestone[] = [];
  public readonly pullRequests: GitHubPullRequest[] = [];

  constructor(name: string) {
    this.name = name;
  }
}

export class FakeGitHub implements GitHub {
  private readonly users: GitHubUser[] = [];
  private currentUser: GitHubUser | undefined;
  private readonly repositories: FakeGitHubRepository[] = [];

  public getFakeRepository(repository: string | GitHubRepository): Promise<FakeGitHubRepository> {
    const repositoryFullName: string = getRepositoryFullName(repository);
    const fakeRepository: FakeGitHubRepository | undefined = first(this.repositories, (fakeRepository: FakeGitHubRepository) => fakeRepository.name === repositoryFullName);
    let result: Promise<FakeGitHubRepository>;
    if (fakeRepository) {
      result = Promise.resolve(fakeRepository);
    } else {
      result = Promise.reject(new Error(`No fake repository exists with the name "${repositoryFullName}".`));
    }
    return result;
  }

  public createFakeRepository(repository: string | GitHubRepository): Promise<FakeGitHubRepository> {
    const repositoryFullName: string = getRepositoryFullName(repository);
    let fakeRepository: FakeGitHubRepository | undefined = first(this.repositories, (fakeRepository: FakeGitHubRepository) => fakeRepository.name === repositoryFullName);
    let result: Promise<FakeGitHubRepository>;
    if (fakeRepository) {
      result = Promise.reject(new Error(`A fake repository with the name "${repositoryFullName}" already exists.`));
    } else {
      fakeRepository = new FakeGitHubRepository(repositoryFullName);
      this.repositories.push(fakeRepository);
      result = Promise.resolve(fakeRepository);
    }
    return result;
  }

  public createUser(username: string): Promise<GitHubUser> {
    let user: GitHubUser | undefined = first(this.users, (user: GitHubUser) => user.login === username);
    let result: Promise<GitHubUser>;
    if (user) {
      result = Promise.reject(new Error(`A fake user with the username "${username}" already exists.`));
    } else {
      user = {
        id: 0,
        name: "Fake User Name",
        login: username,
        url: `https://api.github.com/users/${username}`
      };
      this.users.push(user);
      result = Promise.resolve(user);
    }
    return result;
  }

  public getUser(username: string): Promise<GitHubUser> {
    const user: GitHubUser | undefined = first(this.users, (user: GitHubUser) => user.login === username);
    let result: Promise<GitHubUser>;
    if (!user) {
      result = Promise.reject(new Error(`No fake user with the username "${username}" exists.`));
    } else {
      result = Promise.resolve(user);
    }
    return result;
  }

  public setCurrentUser(username: string): Promise<void> {
    return this.getUser(username)
      .then((user: GitHubUser) => {
        this.currentUser = user;
      });
  }

  public getLabel(repository: string | GitHubRepository, label: string): Promise<GitHubLabel> {
    return this.getLabels(repository)
      .then((labels: GitHubLabel[]) => {
        let result: Promise<GitHubLabel>;
        const githubLabel: GitHubLabel | undefined = first(labels, (l: GitHubLabel) => l.name === label);
        if (!githubLabel) {
          result = Promise.reject(new Error(`No fake label named "${label}" found in the fake repository "${getRepositoryFullName(repository)}".`));
        } else {
          result = Promise.resolve(githubLabel);
        }
        return result;
      });
  }

  public getCurrentUser(): Promise<GitHubUser> {
    return this.currentUser ? Promise.resolve(this.currentUser) : Promise.reject(new Error(`No fake current user has been set.`));
  }

  public getLabels(repository: string | GitHubRepository): Promise<GitHubLabel[]> {
    return this.getFakeRepository(repository)
      .then((fakeRepository: FakeGitHubRepository) => fakeRepository.labels);
  }

  public getSprintLabels(repository: string | GitHubRepository): Promise<GitHubSprintLabel[]> {
    return this.getLabels(repository)
      .then(getSprintLabels);
  }

  public createLabel(repository: string | GitHubRepository, labelName: string, color: string): Promise<void> {
    let result: Promise<void>;
    if (!labelName) {
      result = Promise.reject(new Error(`labelName cannot be undefined or empty.`));
    } else if (!color) {
      result = Promise.reject(new Error(`color cannot be undefined or empty.`));
    } else {
      result = this.getFakeRepository(repository)
        .then((fakeRepository: FakeGitHubRepository) => {
          const label: GitHubLabel = {
            id: 0,
            default: false,
            node_id: "fake label node_id",
            url: "fake label url",
            name: labelName,
            color: color
          };
          fakeRepository.labels.push(label);
        });
    }
    return result;
  }

  public updateLabelColor(repository: string | GitHubRepository, labelName: string, newColor: string): Promise<void> {
    return this.getFakeRepository(repository)
      .then((fakeRepository: FakeGitHubRepository) => {
        const label: GitHubLabel | undefined = first(fakeRepository.labels, (label: GitHubLabel) => label.name === labelName);
        let result: Promise<void>;
        if (!label) {
          result = Promise.reject(new Error(`No label named "${labelName}" found in the fake repository "${getRepositoryFullName(repository)}".`));
        } else {
          label.color = newColor;
          result = Promise.resolve();
        }
        return result;
      });
  }

  public getMilestone(repository: string | GitHubRepository, milestone: string | number): Promise<GitHubMilestone> {
    return this.getMilestones(repository)
      .then((milestones: GitHubMilestone[]) => {
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
      });
  }

  public getMilestones(repository: string | GitHubRepository, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]> {
    return this.getFakeRepository(repository)
      .then((fakeRepository: FakeGitHubRepository) => {
        let result: GitHubMilestone[] = fakeRepository.milestones;
        if (options && options.open !== undefined) {
          result = where(result, (milestone: GitHubMilestone) => milestone.state === (options.open ? "open" : "closed"));
        }
        return result;
      });
  }

  public getSprintMilestones(repository: string | GitHubRepository, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]> {
    return this.getMilestones(repository, options)
      .then(githubMilestonesToSprintMilestones);
  }

  public createMilestone(repository: string | GitHubRepository, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone> {
    return this.getFakeRepository(repository)
      .then((fakeRepository: FakeGitHubRepository) => {
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
      });
  }

  public createSprintMilestone(repository: string | GitHubRepository, sprintNumber: number, sprintEndDate: string): Promise<GitHubSprintMilestone | undefined> {
    const milestoneName = getSprintMilestoneName(sprintNumber);
    return this.createMilestone(repository, milestoneName, { endDate: sprintEndDate })
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone);
      });
  }

  public updateMilestoneEndDate(repository: string | GitHubRepository, milestoneNumber: number, newSprintEndDate: string): Promise<GitHubMilestone> {
    return this.getMilestone(repository, milestoneNumber)
      .then((milestone: GitHubMilestone) => {
        milestone.due_on = addOffset(newSprintEndDate);
        return milestone;
      });
  }

  public updateSprintMilestoneEndDate(repository: string | GitHubRepository, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string): Promise<GitHubSprintMilestone> {
    return this.updateMilestoneEndDate(repository, sprintMilestone.milestoneNumber!, newSprintEndDate)
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone)!;
      });
  }

  public closeMilestone(repository: string | GitHubRepository, milestoneNumber: number): Promise<void> {
    return this.getMilestone(repository, milestoneNumber)
      .then((milestone: GitHubMilestone) => {
        milestone.state = "closed";
      });
  }

  public closeSprintMilestone(repository: string | GitHubRepository, sprintMilestone: GitHubSprintMilestone): Promise<void> {
    return this.closeMilestone(repository, sprintMilestone.milestoneNumber!);
  }

  public getPullRequests(repository: string | GitHubRepository, options?: GitHubGetPullRequestsOptions): Promise<GitHubPullRequest[]> {
    return this.getFakeRepository(repository)
      .then((fakeRepository: FakeGitHubRepository) => {
        let result: GitHubPullRequest[] = fakeRepository.pullRequests;
        if (options && options.open !== undefined) {
          result = where(result, (pullRequest: GitHubPullRequest) => pullRequest.state === (options.open ? "open" : "closed"));
        }
        return result;
      });
  }

  public addPullRequestAssignees(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, assignees: string | GitHubUser | (string | GitHubUser)[]): Promise<void> {
    return this.getFakeRepository(repository)
      .then(() => {
        let collectAssigneeUsers: Promise<void>;

        const assigneeUsers: GitHubUser[] = [];
        if (typeof assignees === "string") {
          collectAssigneeUsers = this.getUser(assignees).then((user: GitHubUser) => {
            assigneeUsers.push(user);
          });
        } else if (!Array.isArray(assignees)) {
          collectAssigneeUsers = new Promise((resolve) => {
            assigneeUsers.push(assignees);
            resolve();
          });
        } else {
          collectAssigneeUsers = Promise.resolve();
          for (const assignee of assignees) {
            if (typeof assignee === "string") {
              collectAssigneeUsers = collectAssigneeUsers.then(() => {
                collectAssigneeUsers = this.getUser(assignee).then((user: GitHubUser) => {
                  assigneeUsers.push(user);
                });
              });
            } else {
              collectAssigneeUsers = collectAssigneeUsers.then(() => {
                assigneeUsers.push(assignee);
              });
            }
          }
        }

        return collectAssigneeUsers.then(() => {
          if (!githubPullRequest.assignees) {
            githubPullRequest.assignees = [];
          }
          githubPullRequest.assignees.push(...assigneeUsers);
        });
      });
  }

  public addPullRequestLabels(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, labelNames: string | string[]): Promise<void> {
    return this.getFakeRepository(repository)
      .then(() => {
        const labelNamesArray: string[] = (Array.isArray(labelNames) ? labelNames : [labelNames]);

        const labels: GitHubLabel[] = [];
        let collectLabels: Promise<void> = Promise.resolve();
        for (const labelName of labelNamesArray) {
          collectLabels = collectLabels.then(() => this.getLabel(repository, labelName)
            .then((label: GitHubLabel) => {
              labels.push(label);
            }));
        }

        return collectLabels.then(() => {
          if (!githubPullRequest.labels) {
            githubPullRequest.labels = [];
          }
          githubPullRequest.labels.push(...labels);
        });
      });
  }

  public setPullRequestMilestone(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, milestone: string | number | GitHubMilestone): Promise<void> {
    return this.getFakeRepository(repository)
      .then(() => {
        let milestonePromise: Promise<GitHubMilestone>;
        if (typeof milestone === "string" || typeof milestone === "number") {
          milestonePromise = this.getMilestone(repository, milestone);
        } else {
          milestonePromise = Promise.resolve(milestone);
        }

        milestonePromise.then((githubMilestone: GitHubMilestone) => {
          githubPullRequest.milestone = githubMilestone;
        });
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
  private readonly github: Octokit;

  /**
   * Create a new GitHub object using the provided authentication token to authenticate.
   * @param authenticationToken The token that will be used to authenticate with GitHub.
   */
  constructor(authenticationToken?: string) {
    this.github = new Octokit();
    if (authenticationToken) {
      this.github.authenticate({
        type: "token",
        token: authenticationToken
      });
    }
  }

  public static fromToken(authenticationToken: string): RealGitHub {
    return new RealGitHub(authenticationToken);
  }

  public static fromTokenFile(tokenFilePath: string): RealGitHub {
    if (!fs.existsSync(tokenFilePath)) {
      throw new Error(`The file ${tokenFilePath} doesn't exist. Create a GitHub personal access token, create this file with the personal access token as its contents, and then run this application again.`);
    }

    const githubAuthToken: string = fs.readFileSync(tokenFilePath, { encoding: "utf-8" });

    return new RealGitHub(githubAuthToken);
  }

  public getCurrentUser(): Promise<GitHubUser> {
    return new Promise((resolve, reject) => {
      this.github.users.get({
      }, (error: Error | null, response: Octokit.AnyResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.data);
        }
      });
    });
  }

  public getLabels(repository: string | GitHubRepository): Promise<GitHubLabel[]> {
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      this.github.issues.getLabels({
        owner: githubRepository.organization,
        repo: githubRepository.name
      }, (error: Error | null, response: Octokit.AnyResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(this.getAllPageData(response));
        }
      });
    });
  }

  public getSprintLabels(repository: string | GitHubRepository): Promise<GitHubSprintLabel[]> {
    return this.getLabels(repository).then(getSprintLabels);
  }

  public createLabel(repository: string | GitHubRepository, labelName: string, color: string): Promise<void> {
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      this.github.issues.createLabel({
        owner: githubRepository.organization,
        repo: githubRepository.name,
        name: labelName,
        color: color
      }, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  public updateLabelColor(repository: string | GitHubRepository, labelName: string, newColor: string): Promise<void> {
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      this.github.issues.updateLabel({
        owner: githubRepository.organization,
        repo: githubRepository.name,
        current_name: labelName,
        color: newColor
      } as any,
        (error: Error | null) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
    });
  }

  public getMilestone(repository: string | GitHubRepository, milestone: number | string): Promise<GitHubMilestone> {
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      if (typeof milestone === "number") {
        this.github.issues.getMilestone({
          owner: githubRepository.organization,
          repo: githubRepository.name,
          number: milestone
        }, (error: Error | null, response: Octokit.AnyResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response.data);
          }
        });
      } else {
        resolve(this.getMilestones(githubRepository)
          .then((githubMilestones: GitHubMilestone[]) => {
            const githubMilestone: GitHubMilestone | undefined = first(githubMilestones, (githubMilestone: GitHubMilestone) => githubMilestone.title === milestone);
            if (!githubMilestone) {
              throw new Error(`Could not find a milestone in repository "${getRepositoryFullName(githubRepository)}" with the name "${milestone}".`);
            }
            return githubMilestone;
          }));
      }
    });
  }

  /**
   * Get all of the milestones that exist in the repository with the provided name.
   * @param repositoryName The name of the repository to get all of the milestones of.
   * @returns All of the milestones that exist in the provided repository.
   */
  public getMilestones(repository: string | GitHubRepository, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]> {
    let milestoneState: "open" | "closed" | "all" = "all";
    if (options) {
      if (options.open === true) {
        milestoneState = "open";
      } else if (options.open === false) {
        milestoneState = "closed";
      }
    }

    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      const getMilestonesArguments: Octokit.IssuesGetMilestonesParams = {
        owner: githubRepository.organization,
        repo: githubRepository.name,
        state: milestoneState
      };
      this.github.issues.getMilestones(getMilestonesArguments, (error: Error | null, response: Octokit.AnyResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(this.getAllPageData<GitHubMilestone>(response));
        }
      });
    });
  }

  public getSprintMilestones(repository: string | GitHubRepository, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]> {
    return this.getMilestones(repository, options)
      .then(githubMilestonesToSprintMilestones);
  }

  public createMilestone(repository: string | GitHubRepository, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone> {
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    const createMilestoneArguments: Octokit.IssuesCreateMilestoneParams = {
      owner: githubRepository.organization,
      repo: githubRepository.name,
      title: milestoneName
    };

    if (options && options.endDate) {
      createMilestoneArguments.due_on = addOffset(options.endDate);
    }

    return new Promise((resolve, reject) => {
      this.github.issues.createMilestone(createMilestoneArguments, (error: Error | null, response: Octokit.AnyResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.data);
        }
      });
    });
  }

  public createSprintMilestone(repository: string | GitHubRepository, sprintNumber: number, sprintEndDate: string): Promise<GitHubSprintMilestone | undefined> {
    const milestoneName = getSprintMilestoneName(sprintNumber);
    return this.createMilestone(repository, milestoneName, { endDate: sprintEndDate })
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone);
      });
  }

  public updateMilestoneEndDate(repository: string | GitHubRepository, milestoneNumber: number, newSprintEndDate: string): Promise<GitHubMilestone> {
    newSprintEndDate = addOffset(newSprintEndDate);
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      this.github.issues.updateMilestone({
        owner: githubRepository.organization,
        repo: githubRepository.name,
        number: milestoneNumber,
        due_on: newSprintEndDate
      }, (error: Error | null, response: Octokit.AnyResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.data);
        }
      });
    });
  }

  public updateSprintMilestoneEndDate(repository: string | GitHubRepository, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string): Promise<GitHubSprintMilestone> {
    return this.updateMilestoneEndDate(repository, sprintMilestone.milestoneNumber!, newSprintEndDate)
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone)!;
      });
  }

  public closeMilestone(repository: string | GitHubRepository, milestoneNumber: number): Promise<void> {
    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    return new Promise((resolve, reject) => {
      this.github.issues.updateMilestone({
        owner: githubRepository.organization,
        repo: githubRepository.name,
        number: milestoneNumber,
        state: "closed"
      }, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  public closeSprintMilestone(repository: string | GitHubRepository, sprintMilestone: GitHubSprintMilestone): Promise<void> {
    return this.closeMilestone(repository, sprintMilestone.milestoneNumber!);
  }

  /**
   * Get the pull requests in the respository with the provided name.
   * @param repositoryName The name of the repository.
   */
  public getPullRequests(repository: string | GitHubRepository, options?: GitHubGetPullRequestsOptions): Promise<GitHubPullRequest[]> {
    let pullRequestState: "open" | "closed" | "all" = "all";
    if (options) {
      if (options.open === true) {
        pullRequestState = "open";
      } else if (options.open === false) {
        pullRequestState = "closed";
      }
    }

    const githubRepository: GitHubRepository = getGitHubRepository(repository);
    const githubArguments: Octokit.PullRequestsGetAllParams = {
      owner: githubRepository.organization,
      repo: githubRepository.name,
      state: pullRequestState
    };
    return this.github.pullRequests.getAll(githubArguments)
      .then((response: Octokit.AnyResponse) => this.getAllPageData<GitHubPullRequest>(response));
  }

  public addPullRequestAssignees(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, assignees: string | GitHubUser | (string | GitHubUser)[]): Promise<void> {
    return new Promise((resolve, reject) => {
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

      const currentAssigneeLogins: string[] = map(githubPullRequest.assignees, (assignee: GitHubUser) => assignee.login);
      const assigneeLoginsToAdd: string[] = where(assigneeLogins, (assigneeLogin: string) => !contains(currentAssigneeLogins, assigneeLogin));

      if (assigneeLoginsToAdd.length === 0) {
        resolve();
      } else {
        const updatedAssigneeLogins: string[] = [...currentAssigneeLogins, ...assigneeLoginsToAdd];
        const githubRepository: GitHubRepository = getGitHubRepository(repository);
        this.github.issues.edit({
          owner: githubRepository.organization,
          repo: githubRepository.name,
          number: githubPullRequest.number,
          assignees: updatedAssigneeLogins
        }, (error: Error | null) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    });
  }

  public addPullRequestLabels(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, labelNames: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const labelNamesArray: string[] = (typeof labelNames === "string" ? [labelNames] : labelNames);

      const currentLabelNames: string[] = map(githubPullRequest.labels, (label: GitHubLabel) => label.name);
      const labelNamesToAdd: string[] = where(labelNamesArray, (labelName: string) => !contains(currentLabelNames, labelName));

      if (labelNamesToAdd.length === 0) {
        resolve();
      } else {
        const updatedLabelNamesArray: string[] = [...currentLabelNames, ...labelNamesToAdd];
        const githubRepository: GitHubRepository = getGitHubRepository(repository);
        this.github.issues.edit({
          owner: githubRepository.organization,
          repo: githubRepository.name,
          number: githubPullRequest.number,
          labels: updatedLabelNamesArray
        }, (error: Error | null) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    });
  }

  public setPullRequestMilestone(repository: string | GitHubRepository, githubPullRequest: GitHubPullRequest, milestone: number | string | GitHubMilestone): Promise<void> {
    let milestoneNumberPromise: Promise<number>;
    if (typeof milestone === "number") {
      milestoneNumberPromise = Promise.resolve(milestone);
    } else if (typeof milestone === "string") {
      milestoneNumberPromise = this.getMilestone(repository, milestone).then((githubMilestone: GitHubMilestone) => githubMilestone.number);
    } else {
      milestoneNumberPromise = Promise.resolve(milestone.number);
    }

    return milestoneNumberPromise
      .then((milestoneNumber: number) => {
        return new Promise<void>((resolve, reject) => {
          const githubRepository: GitHubRepository = getGitHubRepository(repository);
          this.github.issues.edit({
            owner: githubRepository.organization,
            repo: githubRepository.name,
            number: githubPullRequest.number,
            milestone: milestoneNumber
          }, (error: Error | null) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      });
  }

  /**
   * Get all of the pages associated with the provided pageResponse.
   * @param pageResponse One of the page responses in an overall response.
   * @param condition The condition that each data element must pass to be added to the result list.
   * @param result The result array with the paged data.
   */
  private getAllPageData<T>(pageResponse: Octokit.AnyResponse, condition: (data: T) => boolean = () => true, result: T[] = []): Promise<T[]> {
    if (pageResponse && pageResponse.data) {
      for (const dataElement of pageResponse.data) {
        if (!condition || condition(dataElement)) {
          result.push(dataElement);
        }
      }
    }

    return new Promise((resolve, reject) => {
      if (!pageResponse.headers || !this.github.hasNextPage(pageResponse as any)) {
        resolve(result);
      } else {
        this.github.getNextPage(pageResponse as any, (error: Error | null, response: Octokit.AnyResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(this.getAllPageData(response, condition, result));
          }
        });
      }
    });
  }
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