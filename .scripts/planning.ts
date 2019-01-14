import * as fs from "fs";
import * as arrays from "../lib/arrays";
import { padLeft } from "../lib/common";
import { getSprintMilestoneName, GitHub, GitHubSprintMilestone } from "../lib/github";
import { joinPath } from "../lib/path";

interface SprintLabel {
  sprint: number;
  plannedColor?: string;
  startedColor?: string;
  unplannedColor?: string;
}

interface SprintMilestone {
  sprint: number;
  endDate?: string;
}

interface Repository {
  name: string;
  owner: string;
}

function repositoryToString(repository: Repository): string {
  return `${repository.owner ? repository.owner + "/" : ""}${repository.name}`;
}

interface Options {
  createMissingSprintLabels: boolean;
  fixUnexpectedSprintLabelColors: boolean;
  createMissingMilestones: boolean;
  fixUnexpectedMilestoneEndDates: boolean;
  closeCompletedMilestones: boolean;
  repositories: (string | Repository)[];
  expectedSprintLabels: SprintLabel[];
  expectedSprintMilestones: SprintMilestone[];
}

const options: Options = {
  "createMissingSprintLabels": true,
  "fixUnexpectedSprintLabelColors": true,
  "createMissingMilestones": true,
  "fixUnexpectedMilestoneEndDates": true,
  "closeCompletedMilestones": true,
  "repositories": [
    "autorest.nodejs",
    "autorest.typescript",
    "azure-sdk-for-js",
    "azure-sdk-for-node",
    "ms-rest-azure-env",
    "ms-rest-azure-js",
    "ms-rest-browserauth",
    "ms-rest-js",
    "ms-rest-nodeauth",
    "swagger-to-sdk-ts",
    { owner: "ts-common", name: "azure-js-dev-tools" }
  ],
  "expectedSprintLabels": [
    {
      "sprint": 119,
      "plannedColor": "f4e2a1",
      "startedColor": "0b8952",
      "unplannedColor": "25dd38"
    },
    {
      "sprint": 120,
      "plannedColor": "f4b975",
      "startedColor": "0b8952",
      "unplannedColor": "25dd38"
    },
    {
      "sprint": 121,
      "plannedColor": "9abcea",
      "startedColor": "5319e7",
      "unplannedColor": "63ffd2"
    },
    {
      "sprint": 122,
      "plannedColor": "f2997b",
      "startedColor": "006b75",
      "unplannedColor": "f98b95"
    },
    {
      "sprint": 123,
      "plannedColor": "fef2c0",
      "startedColor": "69d648",
      "unplannedColor": "53fcad"
    },
    {
      "sprint": 124,
      "plannedColor": "185b7c",
      "startedColor": "0900d2",
      "unplannedColor": "524866"
    },
    {
      "sprint": 125,
      "plannedColor": "12ba7f",
      "startedColor": "6d47c6",
      "unplannedColor": "e99695"
    },
    {
      "sprint": 126,
      "plannedColor": "006b75",
      "startedColor": "6875d6",
      "unplannedColor": "8837f2"
    },
    {
      "sprint": 127,
      "plannedColor": "47c436",
      "startedColor": "edc0f9",
      "unplannedColor": "f2b3cd"
    },
    {
      "sprint": 128,
      "plannedColor": "fbca04",
      "startedColor": "f490df",
      "unplannedColor": "301793"
    },
    {
      "sprint": 129,
      "plannedColor": "d34c45",
      "startedColor": "ba2901",
      "unplannedColor": "c0def7"
    },
    {
      "sprint": 130,
      "plannedColor": "d27aff",
      "startedColor": "e55c47",
      "unplannedColor": "4840ed"
    },
    {
      "sprint": 131,
      "plannedColor": "ea7e56",
      "startedColor": "5e6fd1",
      "unplannedColor": "fcf76c"
    }
  ],
  "expectedSprintMilestones": [
    {
      "sprint": 118,
      "endDate": "2018-05-28"
    },
    {
      "sprint": 119,
      "endDate": "2018-06-18"
    },
    {
      "sprint": 120,
      "endDate": "2018-07-09"
    },
    {
      "sprint": 121,
      "endDate": "2018-07-30"
    },
    {
      "sprint": 122,
      "endDate": "2018-08-20"
    },
    {
      "sprint": 123,
      "endDate": "2018-09-10"
    },
    {
      "sprint": 124,
      "endDate": "2018-10-01"
    },
    {
      "sprint": 125,
      "endDate": "2018-10-22"
    },
    {
      "sprint": 126,
      "endDate": "2018-11-12"
    },
    {
      "sprint": 127,
      "endDate": "2018-12-03"
    },
    {
      "sprint": 128,
      "endDate": "2018-12-24"
    },
    {
      "sprint": 129,
      "endDate": "2019-01-14"
    },
    {
      "sprint": 130,
      "endDate": "2019-02-04"
    },
    {
      "sprint": 131,
      "endDate": "2019-02-25"
    }
  ]
};

function addOffset(date: string): string {
  if (date) {
    if (!date.includes("T")) {
      const now = new Date();
      const totalOffsetInMinutes: number = now.getTimezoneOffset() + 1;
      const offsetHours: string = padLeft(Math.floor(totalOffsetInMinutes / 60), 2, "0");
      const offsetMinutes: string = padLeft(totalOffsetInMinutes % 60, 2, "0");
      date += `T${offsetHours}:${offsetMinutes}:00`;
    }
    if (!date.endsWith("Z")) {
      date += "Z";
    }
  }
  return date;
}

function addProblem(problems: string[], problem: string): void {
  if (!problems.includes(problem)) {
    problems.push(problem);
  }
}

function addRepositoryProblem(problems: string[], repository: Repository, problem: string): void {
  addProblem(problems, `${repositoryToString(repository)}: ${problem}`);
}

function authenticateWithGitHub(problems: string[]): GitHub | undefined {
  let result: GitHub | undefined;

  const githubAuthFilePath = joinPath(__dirname, "..", "github.auth");
  if (!fs.existsSync(githubAuthFilePath)) {
    addProblem(problems, `The file ${githubAuthFilePath} doesn't exist. Create a GitHub personal access token, create this file with the personal access token as its contents, and then run this application again.`);
  } else {
    const githubAuthToken: string = fs.readFileSync(githubAuthFilePath, { encoding: "utf-8" });

    try {
      result = new GitHub(githubAuthToken);
    } catch (error) {
      addProblem(problems, `Error while authenticating with GitHub: ${JSON.stringify(error)}`);
      result = undefined;
    }
  }

  return result;
}

async function createGitHubLabel(github: GitHub, repository: Repository, labelName: string, color: string, problems: string[]): Promise<void> {
  console.log(`Creating label "${labelName}" in repository ${repositoryToString(repository)} with color "${color}"...`);
  try {
    await github.createLabel(repository.name, labelName, color, repository.owner);
  } catch (error) {
    addRepositoryProblem(problems, repository, `Error while creating label "${labelName}" with color "${color}": ${JSON.stringify(error)}`);
  }
}

async function updateGitHubSprintLabelColor(github: GitHub, repository: Repository, labelName: string, newColor: string, problems: string[]): Promise<void> {
  console.log(`Changing label "${labelName}" in repository ${repositoryToString(repository)}" to color "${newColor}"...`);
  try {
    await github.updateLabelColor(repository.name, labelName, newColor, repository.owner);
  } catch (error) {
    addRepositoryProblem(problems, repository, `Error while updating the color for label "${labelName}" to "${newColor}".`);
  }
}

async function checkSprintLabelColor(github: GitHub, repository: Repository, sprintLabelName: string, expectedSprintLabelColor: string, actualSprintLabelColor: string | undefined, problems: string[], planningOptions: Options): Promise<void> {
  if (actualSprintLabelColor == undefined) {
    if (planningOptions.createMissingSprintLabels === true) {
      await github.createLabel(repository.name, sprintLabelName, expectedSprintLabelColor, repository.owner);
    } else {
      addRepositoryProblem(problems, repository, `No "${sprintLabelName}" label found.`);
    }
  } else if (actualSprintLabelColor !== expectedSprintLabelColor) {
    if (planningOptions.fixUnexpectedSprintLabelColors === true) {
      await updateGitHubSprintLabelColor(github, repository, sprintLabelName, expectedSprintLabelColor, problems);
    } else {
      addRepositoryProblem(problems, repository, `Label "${sprintLabelName}" should have been color "${expectedSprintLabelColor}" but was "${actualSprintLabelColor}" instead.`);
    }
  }
}

async function checkSprintLabels(github: GitHub, repository: Repository, options: Options, problems: string[]): Promise<void> {
  const expectedSprintLabels: SprintLabel[] = options.expectedSprintLabels;
  const githubSprintLabels: SprintLabel[] = await github.getSprintLabels(repository.name, repository.owner);

  for (const expectedSprintLabel of expectedSprintLabels) {
    const expectedSprintNumber: number = expectedSprintLabel.sprint;

    const githubSprintLabel: SprintLabel | undefined = arrays.first(githubSprintLabels, (sprintLabel: SprintLabel) => sprintLabel.sprint === expectedSprintNumber);
    if (githubSprintLabel == undefined) {
      if (options.createMissingSprintLabels === true) {
        await createGitHubLabel(github, repository, `Unplanned-Sprint-${expectedSprintNumber}`, expectedSprintLabel.unplannedColor!, problems);
        await createGitHubLabel(github, repository, `Planned-Sprint-${expectedSprintNumber}`, expectedSprintLabel.plannedColor!, problems);
        await createGitHubLabel(github, repository, `Started-Sprint-${expectedSprintNumber}`, expectedSprintLabel.startedColor!, problems);
      } else {
        addRepositoryProblem(problems, repository, `No labels found for sprint ${expectedSprintNumber}.`);
      }
    } else {
      await checkSprintLabelColor(github, repository, `Unplanned-Sprint-${expectedSprintNumber}`, expectedSprintLabel.unplannedColor!, githubSprintLabel.unplannedColor, problems, options);
      await checkSprintLabelColor(github, repository, `Planned-Sprint-${expectedSprintNumber}`, expectedSprintLabel.plannedColor!, githubSprintLabel.plannedColor, problems, options);
      await checkSprintLabelColor(github, repository, `Started-Sprint-${expectedSprintNumber}`, expectedSprintLabel.startedColor!, githubSprintLabel.startedColor, problems, options);
    }
  }
}

function getNow(): string {
  const now = new Date();
  let result = `${now.getUTCFullYear()}-${padLeft(now.getUTCMonth() + 1, 2, "0")}-${padLeft(now.getUTCDate(), 2, "0")}`;

  const totalOffsetInMinutes: number = now.getTimezoneOffset();
  const offsetHours: string = padLeft(Math.floor(totalOffsetInMinutes / 60), 2, "0");
  const offsetMinutes: string = padLeft(totalOffsetInMinutes % 60, 2, "0");
  result += `T${offsetHours}:${offsetMinutes}:00`;

  return result;
}

async function checkSprintMilestones(github: GitHub, repository: Repository, options: Options, problems: string[]): Promise<void> {
  const expectedSprintMilestones: SprintMilestone[] = options.expectedSprintMilestones;
  const githubSprintMilestones: GitHubSprintMilestone[] = await github.getSprintMilestones(repository.name, { repositoryOwner: repository.owner });

  const now: string = getNow();

  for (const expectedSprintMilestone of expectedSprintMilestones) {
    const expectedSprintMilestoneNumber: number = expectedSprintMilestone.sprint;
    const expectedSprintMilestoneEndDate: string = addOffset(expectedSprintMilestone.endDate!);
    let githubSprintMilestone: GitHubSprintMilestone | undefined = arrays.first(githubSprintMilestones, (sprintMilestone: GitHubSprintMilestone) => sprintMilestone.sprint === expectedSprintMilestoneNumber);
    if (githubSprintMilestone == undefined) {
      if (options.createMissingMilestones === true) {
        console.log(`Creating sprint milestone "${expectedSprintMilestoneNumber}" in repository ${repositoryToString(repository)} with end date ${expectedSprintMilestoneEndDate}...`);
        try {
          githubSprintMilestone = await github.createSprintMilestone(repository.name, expectedSprintMilestoneNumber, expectedSprintMilestoneEndDate, repository.owner);
        } catch (error) {
          addRepositoryProblem(problems, repository, `Error while creating sprint milestone "${expectedSprintMilestoneNumber}" with end date "${expectedSprintMilestoneEndDate}": ${JSON.stringify(error)}`);
        }
      } else {
        addRepositoryProblem(problems, repository, `No milestone found for sprint ${expectedSprintMilestoneNumber}.`);
      }
    } else {
      const githubSprintMilestoneEndDate = addOffset(githubSprintMilestone.endDate);
      if (githubSprintMilestoneEndDate !== expectedSprintMilestoneEndDate) {
        if (options.fixUnexpectedMilestoneEndDates === true) {
          const milestoneName: string = getSprintMilestoneName(expectedSprintMilestoneNumber);
          console.log(`Changing milestone "${milestoneName}" in repository ${repositoryToString(repository)} to end date ${expectedSprintMilestoneEndDate}...`);
          try {
            githubSprintMilestone = await github.updateSprintMilestoneEndDate(repository.name, githubSprintMilestone, expectedSprintMilestoneEndDate, repository.owner);
          } catch (error) {
            addRepositoryProblem(problems, repository, `Error while updating the end date for milestone "${milestoneName}" to "${expectedSprintMilestoneEndDate}": ${JSON.stringify(error)}`);
          }
        } else {
          addRepositoryProblem(problems, repository, `The end date for Sprint-${expectedSprintMilestoneNumber} was ${addOffset(githubSprintMilestone.endDate!)} instead of ${addOffset(expectedSprintMilestone.endDate!)}.`);
        }
      }
    }

    if (githubSprintMilestone) {
      if (githubSprintMilestone.open) {
        if (expectedSprintMilestoneEndDate < now) {
          const milestoneName = getSprintMilestoneName(expectedSprintMilestoneNumber);
          if (githubSprintMilestone.openIssueCount === 0) {
            if (options.closeCompletedMilestones) {
              console.log(`Closing milestone "${milestoneName}" in repository "${repositoryToString(repository)}"...`);
              try {
                await github.closeSprintMilestone(repository.name, githubSprintMilestone, repository.owner);
              } catch (error) {
                addRepositoryProblem(problems, repository, `Error while closing milestone "${milestoneName}": ${JSON.stringify(error)}`);
              }
            } else {
              addRepositoryProblem(problems, repository, `Milestone ${milestoneName} should be closed because it is past its end date and it has no open issues.`);
            }
          } else {
            addRepositoryProblem(problems, repository, `Milestone ${milestoneName} is past its end date and it has open issues.`);
          }
        }
      }
    }
  }
}

async function main(): Promise<void> {
  const problems: string[] = [];
  const github: GitHub | undefined = authenticateWithGitHub(problems);

  if (github && options) {
    for (const repositoryOrName of options.repositories) {
      const repository: Repository = typeof repositoryOrName === "string" ? { owner: "Azure", name: repositoryOrName } : repositoryOrName;
      await checkSprintLabels(github, repository, options, problems);
      await checkSprintMilestones(github, repository, options, problems);
    }
    console.log();
  }

  if (problems.length === 0) {
    console.log("No problems found. Everything is good.");
  } else {
    console.log(`Found ${problems.length} problems:`);
    for (let i = 0; i < problems.length; ++i) {
      console.log(`${i + 1}. ${problems[i]}`);
    }
  }
}

main()
  .catch((error: Error) => {
    console.log(`Error in main(): ${error}`);
  });