import Octokit from "@octokit/rest";
import * as fs from "fs";
import * as arrays from "./arrays";

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
  milestone: GitHubMilestone | undefined;
  assignees: GitHubUser[] | undefined;
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
  return arrays.first(githubPullRequest.labels, (label: GitHubLabel) => label.name === labelName);
}

export function gitHubPullRequestGetLabels(githubPullRequest: GitHubPullRequest, labelNames: string | string[]): GitHubLabel[] {
  const labelNamesArray: string[] = (typeof labelNames === "string" ? [labelNames] : labelNames);
  return arrays.where(githubPullRequest.labels, (label: GitHubLabel) => arrays.contains(labelNamesArray, label.name));
}

export function gitHubPullRequestGetAssignee(githubPullRequest: GitHubPullRequest, assignee: GitHubUser | string | number): GitHubUser | undefined {
  return arrays.first(githubPullRequest.assignees, (existingAssignee: GitHubUser) => {
    let isMatch = false;
    if (typeof assignee === "number") {
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

  repositoryOwner?: string;
}

export interface GitHubCreateMilestoneOptions {
  endDate?: string;

  repositoryOwner?: string;
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

  repositoryOwner?: string;
}

const defaultRepositoryOwner = "Azure";

/**
 * A class that wraps @octokit/rest to interact with github.com.
 */
export class GitHub {
  private readonly github: Octokit;

  /**
   * Create a new GitHub object using the provided authentication token to authenticate.
   * @param authenticationToken The token that will be used to authenticate with GitHub.
   */
  constructor(authenticationToken: string) {
    this.github = new Octokit();
    this.github.authenticate({
      type: "token",
      token: authenticationToken
    });
  }

  public static fromToken(authenticationToken: string): GitHub {
    return new GitHub(authenticationToken);
  }

  public static fromTokenFile(tokenFilePath: string): GitHub {
    if (!fs.existsSync(tokenFilePath)) {
      throw new Error(`The file ${tokenFilePath} doesn't exist. Create a GitHub personal access token, create this file with the personal access token as its contents, and then run this application again.`);
    }

    const githubAuthToken: string = fs.readFileSync(tokenFilePath, { encoding: "utf-8" });

    return new GitHub(githubAuthToken);
  }

  /**
   * Get the user that is currently authenticated.
   * @returns The user that is currently authenticated.
   */
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

  /**
   * Get all of the labels in the repository with the provided name.
   */
  public getLabels(repositoryName: string, repositoryOwner = defaultRepositoryOwner): Promise<GitHubLabel[]> {
    return new Promise((resolve, reject) => {
      this.github.issues.getLabels({
        owner: repositoryOwner,
        repo: repositoryName
      }, (error: Error | null, response: Octokit.AnyResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(this.getAllPageData(response));
        }
      });
    });
  }

  /**
   * Get all of the labels that contain "-Sprint-" in the repository with the provided name.
   * @param repositoryName The name of the repository to look in.
   */
  public getSprintLabels(repositoryName: string, repositoryOwner?: string): Promise<GitHubSprintLabel[]> {
    return this.getLabels(repositoryName, repositoryOwner)
      .then((githubLabels: GitHubLabel[]) => {
        const repositorySprintLabels: GitHubSprintLabel[] = [];
        for (const repositoryLabel of githubLabels) {
          if (repositoryLabel && repositoryLabel.name && repositoryLabel.name.includes("-Sprint-")) {
            const repositoryLabelName: string = repositoryLabel.name;

            const firstDashIndex: number = repositoryLabelName.indexOf("-");
            const sprintLabelType: string = repositoryLabelName.substring(0, firstDashIndex);

            const lastDashIndex: number = repositoryLabelName.lastIndexOf("-");
            const sprintNumber: number = parseInt(repositoryLabelName.substring(lastDashIndex + 1));

            let sprintLabel: GitHubSprintLabel | undefined = arrays.first(repositorySprintLabels, (resultLabel: GitHubSprintLabel) => resultLabel.sprint === sprintNumber);
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
      });
  }

  /**
   * Create a label with the provided labelName and color in the repository with the provided name.
   * @param repositoryName The name of the repository where the label will be created.
   * @param labelName The name of the created label.
   * @param color The color of the created label.
   */
  public createLabel(repositoryName: string, labelName: string, color: string, repositoryOwner = defaultRepositoryOwner): Promise<void> {
    return new Promise((resolve, reject) => {
      this.github.issues.createLabel({
        owner: repositoryOwner,
        repo: repositoryName,
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

  /**
   * Update the color of the label with the provided name in the repository with the provided name.
   * @param repositoryName The name of the repository that contains the label to update.
   * @param labelName The name of the label to update.
   * @param newColor The color to update the label to.
   */
  public updateLabelColor(repositoryName: string, labelName: string, newColor: string, repositoryOwner = defaultRepositoryOwner): Promise<void> {
    return new Promise((resolve, reject) => {
      this.github.issues.updateLabel({
        owner: repositoryOwner,
        repo: repositoryName,
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

  /**
   * Get the milestone in the provided repository with either the provided milestone number or the
   * provided milestone name.
   */
  public getMilestone(repositoryName: string, milestone: number | string, repositoryOwner = defaultRepositoryOwner): Promise<GitHubMilestone> {
    return new Promise((resolve, reject) => {
      if (typeof milestone === "number") {
        this.github.issues.getMilestone({
          owner: repositoryOwner,
          repo: repositoryName,
          number: milestone
        }, (error: Error | null, response: Octokit.AnyResponse) => {
          if (error) {
            reject(error);
          } else {
            resolve(response.data);
          }
        });
      } else {
        resolve(this.getMilestones(repositoryName)
          .then((githubMilestones: GitHubMilestone[]) => {
            const githubMilestone: GitHubMilestone | undefined = arrays.first(githubMilestones, (githubMilestone: GitHubMilestone) => githubMilestone.title === milestone);
            if (!githubMilestone) {
              throw new Error(`Could not find a milestone in repository "${repositoryName}" with the name "${milestone}".`);
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
  public getMilestones(repositoryName: string, options?: GitHubGetMilestonesOptions): Promise<GitHubMilestone[]> {
    let milestoneState: "open" | "closed" | "all" = "all";
    if (options) {
      if (options.open === true) {
        milestoneState = "open";
      } else if (options.open === false) {
        milestoneState = "closed";
      }
    }

    return new Promise((resolve, reject) => {
      const getMilestonesArguments: Octokit.IssuesGetMilestonesParams = {
        owner: (options && options.repositoryOwner) || defaultRepositoryOwner,
        repo: repositoryName,
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

  /**
   * Get all of the sprint milestones (milestones that begin with "Sprint-") in the provided repository.
   * @param repositoryName The name of the repository.
   * @returns All of the sprint milestones in the provided repository.
   */
  public getSprintMilestones(repositoryName: string, options?: GitHubGetMilestonesOptions): Promise<GitHubSprintMilestone[]> {
    return this.getMilestones(repositoryName, options)
      .then((githubMilestones: GitHubMilestone[]) => {
        const repositorySprintMilestones: GitHubSprintMilestone[] = [];
        for (const githubMilestone of githubMilestones) {
          const sprintMilestone: GitHubSprintMilestone | undefined = githubMilestoneToSprintMilestone(githubMilestone);
          if (sprintMilestone) {
            repositorySprintMilestones.push(sprintMilestone);
          }
        }
        return repositorySprintMilestones;
      });
  }

  /**
   * Create a new milestone in the provided repository.
   * @param repositoryName The name of the repository to create a new milestone in.
   * @param milestoneName The name of the new milestone.
   * @param options The optional properties to set on the created milestone.
   */
  public createMilestone(repositoryName: string, milestoneName: string, options?: GitHubCreateMilestoneOptions): Promise<GitHubMilestone> {
    const createMilestoneArguments: Octokit.IssuesCreateMilestoneParams = {
      owner: (options && options.repositoryOwner) || defaultRepositoryOwner,
      repo: repositoryName,
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

  /**
   * Create a new sprint milestone in the provided repository.
   * @param repositoryName The name of the repository to create the new sprint milestone in.
   * @param sprintNumber The number of the sprint that the milestone will be associated with.
   * @param sprintEndDate The last day of the sprint.
   */
  public createSprintMilestone(repositoryName: string, sprintNumber: number, sprintEndDate: string, repositoryOwner = defaultRepositoryOwner): Promise<GitHubSprintMilestone | undefined> {
    const milestoneName = getSprintMilestoneName(sprintNumber);
    return this.createMilestone(repositoryName, milestoneName, { endDate: sprintEndDate, repositoryOwner: repositoryOwner })
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone);
      });
  }

  /**
   * Update the end date of an existing milestone in the provided repository.
   * @param repositoryName The name of the repository that contains the milestone to update.
   * @param milestoneNumber The number id of the milestone to update.
   * @param newSprintEndDate The new end date to update the existing milestone to.
   */
  public updateMilestoneEndDate(repositoryName: string, milestoneNumber: number, newSprintEndDate: string, repositoryOwner = defaultRepositoryOwner): Promise<GitHubMilestone> {
    newSprintEndDate = addOffset(newSprintEndDate);
    return new Promise((resolve, reject) => {
      this.github.issues.updateMilestone({
        owner: repositoryOwner,
        repo: repositoryName,
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

  public updateSprintMilestoneEndDate(repositoryName: string, sprintMilestone: GitHubSprintMilestone, newSprintEndDate: string, repositoryOwner = defaultRepositoryOwner): Promise<GitHubSprintMilestone> {
    return this.updateMilestoneEndDate(repositoryName, sprintMilestone.milestoneNumber!, newSprintEndDate, repositoryOwner)
      .then((githubMilestone: GitHubMilestone) => {
        return githubMilestoneToSprintMilestone(githubMilestone)!;
      });
  }

  public closeMilestone(repositoryName: string, milestoneNumber: number, repositoryOwner = defaultRepositoryOwner): Promise<void> {
    return new Promise((resolve, reject) => {
      this.github.issues.updateMilestone({
        owner: repositoryOwner,
        repo: repositoryName,
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

  public closeSprintMilestone(repositoryName: string, sprintMilestone: GitHubSprintMilestone, repositoryOwner = defaultRepositoryOwner): Promise<void> {
    return this.closeMilestone(repositoryName, sprintMilestone.milestoneNumber!, repositoryOwner);
  }

  /**
   * Get the pull requests in the respository with the provided name.
   * @param repositoryName The name of the repository.
   */
  public getPullRequests(repositoryName: string, options?: GitHubGetPullRequestsOptions): Promise<GitHubPullRequest[]> {
    let pullRequestState: "open" | "closed" | "all" = "all";
    if (options) {
      if (options.open === true) {
        pullRequestState = "open";
      } else if (options.open === false) {
        pullRequestState = "closed";
      }
    }

    const githubArguments: Octokit.PullRequestsGetAllParams = {
      owner: (options && options.repositoryOwner) || defaultRepositoryOwner,
      repo: repositoryName,
      state: pullRequestState
    };
    return this.github.pullRequests.getAll(githubArguments)
      .then((response: Octokit.AnyResponse) => this.getAllPageData<GitHubPullRequest>(response));
  }

  public addPullRequestAssignees(repositoryName: string, githubPullRequest: GitHubPullRequest, assignees: string | GitHubUser | (string | GitHubUser)[], repositoryOwner = defaultRepositoryOwner): Promise<void> {
    return new Promise((resolve, reject) => {
      let assigneeLogins: string[];
      if (typeof assignees === "string") {
        assigneeLogins = [assignees];
      } else if (!(assignees instanceof Array)) {
        assigneeLogins = [assignees.login];
      } else {
        assigneeLogins = arrays.map(assignees, (assignee: string | GitHubUser) => {
          return typeof assignee === "string" ? assignee : assignee.login;
        });
      }

      const currentAssigneeLogins: string[] = arrays.map(githubPullRequest.assignees, (assignee: GitHubUser) => assignee.login);
      const assigneeLoginsToAdd: string[] = arrays.where(assigneeLogins, (assigneeLogin: string) => !arrays.contains(currentAssigneeLogins, assigneeLogin));

      if (assigneeLoginsToAdd.length === 0) {
        resolve();
      } else {
        const updatedAssigneeLogins: string[] = [...currentAssigneeLogins, ...assigneeLoginsToAdd];
        this.github.issues.edit({
          owner: repositoryOwner,
          repo: repositoryName,
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

  /**
   * Add the provided labels to the provided GitHubPullRequest.
   * @param repositoryName The name of the repository where the pull request exists.
   * @param githubPullRequest The GitHubPullRequest that the labels will be added to.
   * @param labelNamesToAdd The name of the label or labels to add to the pull request.
   */
  public addPullRequestLabels(repositoryName: string, githubPullRequest: GitHubPullRequest, labelNames: string | string[], repositoryOwner = defaultRepositoryOwner): Promise<void> {
    return new Promise((resolve, reject) => {
      const labelNamesArray: string[] = (typeof labelNames === "string" ? [labelNames] : labelNames);

      const currentLabelNames: string[] = arrays.map(githubPullRequest.labels, (label: GitHubLabel) => label.name);
      const labelNamesToAdd: string[] = arrays.where(labelNamesArray, (labelName: string) => !arrays.contains(currentLabelNames, labelName));

      if (labelNamesToAdd.length === 0) {
        resolve();
      } else {
        const updatedLabelNamesArray: string[] = [...currentLabelNames, ...labelNamesToAdd];
        this.github.issues.edit({
          owner: repositoryOwner,
          repo: repositoryName,
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

  public setPullRequestMilestone(repositoryName: string, githubPullRequest: GitHubPullRequest, milestone: number | string | GitHubMilestone, repositoryOwner = defaultRepositoryOwner): Promise<void> {
    let milestoneNumberPromise: Promise<number>;
    if (typeof milestone === "number") {
      milestoneNumberPromise = Promise.resolve(milestone);
    } else if (typeof milestone === "string") {
      milestoneNumberPromise = this.getMilestone(repositoryName, milestone).then((githubMilestone: GitHubMilestone) => githubMilestone.number);
    } else {
      milestoneNumberPromise = Promise.resolve(milestone.number);
    }

    return milestoneNumberPromise
      .then((milestoneNumber: number) => {
        return new Promise<void>((resolve, reject) => {
          this.github.issues.edit({
            owner: repositoryOwner,
            repo: repositoryName,
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