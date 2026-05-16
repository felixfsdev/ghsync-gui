import Store from "electron-store";
import * as path from "path";
import { promises as fs } from "fs";
import { runGitCommand } from "./run-git-command";
import { Repo, getAllRepos } from "./get-all-repos";

const store = new Store() as any;

export default async function cloneRepos(
  mainWindow: Electron.BrowserWindow,
): Promise<{
  success: boolean;
  message: string;
  cloned: string[];
  failedToClone: string[];
  ignored: string[];
}> {
  const config = store.get("config");
  const pat = config.pat;
  if (!pat) {
    return {
      success: false,
      message: "Personal Access Token (PAT) not found. Please configure it.",
      cloned: [],
      failedToClone: [],
      ignored: [],
    };
  }

  const getResponse = await getAllRepos(pat, config.storagePath);

  if (!getResponse.success || !getResponse.repos) {
    return {
      success: false,
      message: getResponse.message,
      cloned: [],
      failedToClone: [],
      ignored: [],
    };
  }

  console.log(`Fetched repos: ${getResponse.repos?.length}`);

  // Filter out repos that already exist on disk
  const toClone = [];

  for (const repo of getResponse.repos) {
    try {
      await fs.access(repo.path);
      // Path exists, do nothing (skip cloning)
    } catch {
      // Path does not exist, add to clone list
      toClone.push(repo);
    }
  }

  console.log(`Repos to clone: ${toClone.length}`);

  const { cloned, failedToClone, ignored } = await cloneReposFromRepos(
    mainWindow,
    toClone,
    config,
  );

  return {
    success: true,
    message: "Cloned",
    cloned: cloned,
    failedToClone: failedToClone,
    ignored: ignored,
  };
}

async function cloneReposFromRepos(
  mainWindow: Electron.BrowserWindow,
  repos: Repo[],
  config: any,
): Promise<{
  cloned: string[];
  failedToClone: string[];
  ignored: string[];
}> {
  let cloned: string[] = [];
  let failedToClone: string[] = [];
  let ignored: string[] = [];

  for (const repo of repos) {
    if (config.ignoredRepos.includes(repo.full_name)) {
      ignored.push(repo.full_name);
      console.log(`Ignored ${repo.full_name}`);
      continue;
    }

    const authenticatedUrl = repo.url.replace(
      "https://",
      `https://${config.pat}@`,
    );

    mainWindow.webContents.send("outputChange", `Cloning ${repo.full_name}...`);

    const response = await runGitCommand(
      ["clone", authenticatedUrl, repo.path, "--mirror"],
      repo.path,
    );
    if (response.success) {
      cloned.push(repo.full_name);
    } else {
      failedToClone.push(repo.full_name);
    }
  }

  return {
    cloned: cloned,
    failedToClone: failedToClone,
    ignored: ignored,
  };
}
