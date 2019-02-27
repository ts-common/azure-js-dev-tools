import * as fs from "fs";
import * as arrays from "../lib/arrays";
import { padLeft } from "../lib/common";
import { getSprintMilestoneName, GitHub, GitHubSprintMilestone, RealGitHub, GitHubRepository, getRepositoryFullName, getGitHubRepository } from "../lib/github";
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

interface Options {
  createMissingSprintLabels: boolean;
  fixUnexpectedSprintLabelColors: boolean;
  createMissingMilestones: boolean;
  fixUnexpectedMilestoneEndDates: boolean;
  closeCompletedMilestones: boolean;
  repositories: string[];
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
    "Azure/autorest.nodejs",
    "Azure/autorest.typescript",
    "Azure/azure-sdk-for-js",
    "Azure/azure-sdk-for-node",
    "Azure/ms-rest-azure-env",
    "Azure/ms-rest-azure-js",
    "Azure/ms-rest-browserauth",
    "Azure/ms-rest-js",
    "Azure/ms-rest-nodeauth",
    "ts-common/azure-js-dev-tools",
  ],
  "expectedSprintLabels": [
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
    },
    {
      "sprint": 132,
      "plannedColor": "ea7e56",
      "startedColor": "5e6fd1",
      "unplannedColor": "fcf76c"
    },
    {
      "sprint": 133,
      "plannedColor": "ea7e56",
      "startedColor": "5e6fd1",
      "unplannedColor": "fcf76c"
    },
    {
      "sprint": 134,
      "plannedColor": "ea7e56",
      "startedColor": "5e6fd1",
      "unplannedColor": "fcf76c"
    },
    {
      "sprint": 135,
      "plannedColor": "ea7e56",
      "startedColor": "5e6fd1",
      "unplannedColor": "fcf76c"
    },
    {
      "sprint": 136,
      "plannedColor": "ea7e56",
      "startedColor": "5e6fd1",
      "unplannedColor": "fcf76c"
    }
  ],
  "expectedSprintMilestones": [
    {
      "sprint": 130,
      "endDate": "2019-02-04"
    },
    {
      "sprint": 131,
      "endDate": "2019-02-25"
    },
    {
      "sprint": 132,
      "endDate": "2019-03-18"
    },
    {
      "sprint": 133,
      "endDate": "2019-04-08"
    },
    {
      "sprint": 134,
      "endDate": "2019-04-29"
    },
    {
      "sprint": 135,
      "endDate": "2019-05-20"
    },
    {
      "sprint": 136,
      "endDate": "2019-06-10"
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

function addRepositoryProblem(problems: string[], repository: GitHubRepository, problem: string): void {
  addProblem(problems, `${getRepositoryFullName(repository)}: ${problem}`);
}

function authenticateWithGitHub(problems: string[]): GitHub | undefined {
  let result: GitHub | undefined;

  const githubAuthFilePath = joinPath(__dirname, "..", "github.auth");
  if (!fs.existsSync(githubAuthFilePath)) {
    addProblem(problems, `The file ${githubAuthFilePath} doesn't exist. Create a GitHub personal access token, create this file with the personal access token as its contents, and then run this application again.`);
  } else {
    const githubAuthToken: string = fs.readFileSync(githubAuthFilePath, { encoding: "utf-8" });

    try {
      result = new RealGitHub(githubAuthToken);
    } catch (error) {
      addProblem(problems, `Error while authenticating with GitHub: ${JSON.stringify(error)}`);
      result = undefined;
    }
  }

  return result;
}

async function createGitHubLabel(github: GitHub, repository: GitHubRepository, labelName: string, color: string, problems: string[]): Promise<void> {
  console.log(`Creating label "${labelName}" in repository ${getRepositoryFullName(repository)} with color "${color}"...`);
  try {
    await github.createLabel(repository, labelName, color);
  } catch (error) {
    addRepositoryProblem(problems, repository, `Error while creating label "${labelName}" with color "${color}": ${JSON.stringify(error)}`);
  }
}

async function updateGitHubSprintLabelColor(github: GitHub, repository: GitHubRepository, labelName: string, newColor: string, problems: string[]): Promise<void> {
  console.log(`Changing label "${labelName}" in repository ${getRepositoryFullName(repository)}" to color "${newColor}"...`);
  try {
    await github.updateLabelColor(repository, labelName, newColor);
  } catch (error) {
    addRepositoryProblem(problems, repository, `Error while updating the color for label "${labelName}" to "${newColor}".`);
  }
}

async function checkSprintLabelColor(github: GitHub, repository: GitHubRepository, sprintLabelName: string, expectedSprintLabelColor: string, actualSprintLabelColor: string | undefined, problems: string[], planningOptions: Options): Promise<void> {
  if (actualSprintLabelColor == undefined) {
    if (planningOptions.createMissingSprintLabels === true) {
      await github.createLabel(repository.name, sprintLabelName, expectedSprintLabelColor);
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

async function checkSprintLabels(github: GitHub, repository: GitHubRepository, options: Options, problems: string[]): Promise<void> {
  const expectedSprintLabels: SprintLabel[] = options.expectedSprintLabels;
  const githubSprintLabels: SprintLabel[] = await github.getSprintLabels(repository);

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

async function checkSprintMilestones(github: GitHub, repository: GitHubRepository, options: Options, problems: string[]): Promise<void> {
  const expectedSprintMilestones: SprintMilestone[] = options.expectedSprintMilestones;
  const githubSprintMilestones: GitHubSprintMilestone[] = await github.getSprintMilestones(repository);

  const now: string = getNow();

  for (const expectedSprintMilestone of expectedSprintMilestones) {
    const expectedSprintMilestoneNumber: number = expectedSprintMilestone.sprint;
    const expectedSprintMilestoneEndDate: string = addOffset(expectedSprintMilestone.endDate!);
    let githubSprintMilestone: GitHubSprintMilestone | undefined = arrays.first(githubSprintMilestones, (sprintMilestone: GitHubSprintMilestone) => sprintMilestone.sprint === expectedSprintMilestoneNumber);
    if (githubSprintMilestone == undefined) {
      if (options.createMissingMilestones === true) {
        console.log(`Creating sprint milestone "${expectedSprintMilestoneNumber}" in repository ${getRepositoryFullName(repository)} with end date ${expectedSprintMilestoneEndDate}...`);
        try {
          githubSprintMilestone = await github.createSprintMilestone(repository, expectedSprintMilestoneNumber, expectedSprintMilestoneEndDate);
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
          console.log(`Changing milestone "${milestoneName}" in repository ${getRepositoryFullName(repository)} to end date ${expectedSprintMilestoneEndDate}...`);
          try {
            githubSprintMilestone = await github.updateSprintMilestoneEndDate(repository, githubSprintMilestone, expectedSprintMilestoneEndDate);
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
              console.log(`Closing milestone "${milestoneName}" in repository "${getRepositoryFullName(repository)}"...`);
              try {
                await github.closeSprintMilestone(repository, githubSprintMilestone);
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
      const repository: GitHubRepository = getGitHubRepository(repositoryOrName);
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
