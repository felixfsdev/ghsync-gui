import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { loadConfig } from "./config";

export const logs: string[] = [];

type SyncStatus = "ignored" | "cloning" | "updating";

type SyncSummary = {
  downloaded: string[];
  failedToDownload: string[];
  updated: string[];
  failedToUpdate: string[];
  ignored: string[];
};

type Config = {
  usersAndOrgs: string[];
  storagePath: string;
  ignoredRepos?: string[];
  lfs?: "on" | "off";
};

export async function sync(mainWindow: BrowserWindow): Promise<void> {
  const config = loadConfig() as Config;

  ensureDirectoryExists(config.storagePath);

  const summary: SyncSummary = {
    downloaded: [],
    failedToDownload: [],
    updated: [],
    failedToUpdate: [],
    ignored: [],
  };

  for (const userOrOrg of config.usersAndOrgs) {
    await syncUserOrOrg({
      userOrOrg,
      config,
      summary,
      mainWindow,
    });
  }

  mainWindow.webContents.send("syncComplete", {
    message: buildSummaryMessage(summary),
  });
}

async function syncUserOrOrg({
  userOrOrg,
  config,
  summary,
  mainWindow,
}: {
  userOrOrg: string;
  config: Config;
  summary: SyncSummary;
  mainWindow: BrowserWindow;
}): Promise<void> {
  let repos: string[];

  try {
    repos = await getAllPublicGithubRepos(userOrOrg);
  } catch (error) {
    appendLog(`Failed to fetch repos for ${userOrOrg}: ${formatError(error)}`);
    return;
  }

  for (const fullRepoName of repos.sort()) {
    await syncRepository({
      fullRepoName,
      config,
      summary,
      mainWindow,
    });
  }
}

async function syncRepository({
  fullRepoName,
  config,
  summary,
  mainWindow,
}: {
  fullRepoName: string;
  config: Config;
  summary: SyncSummary;
  mainWindow: BrowserWindow;
}): Promise<void> {
  if (config.ignoredRepos?.includes(fullRepoName)) {
    sendSyncProgress(mainWindow, "ignored", fullRepoName);

    summary.ignored.push(fullRepoName);

    appendLog(`Ignored ${fullRepoName}`);

    return;
  }

  const repoPath = path.join(config.storagePath, fullRepoName);
  const cloneUrl = `https://github.com/${fullRepoName}.git`;

  if (!fs.existsSync(repoPath)) {
    await cloneRepository({
      fullRepoName,
      repoPath,
      cloneUrl,
      lfsEnabled: config.lfs === "on",
      summary,
      mainWindow,
    });

    return;
  }

  await updateRepository({
    fullRepoName,
    repoPath,
    lfsEnabled: config.lfs === "on",
    summary,
    mainWindow,
  });
}

async function cloneRepository({
  fullRepoName,
  repoPath,
  cloneUrl,
  lfsEnabled,
  summary,
  mainWindow,
}: {
  fullRepoName: string;
  repoPath: string;
  cloneUrl: string;
  lfsEnabled: boolean;
  summary: SyncSummary;
  mainWindow: BrowserWindow;
}): Promise<void> {
  appendLog(`Cloning ${fullRepoName}`);

  sendSyncProgress(mainWindow, "cloning", fullRepoName);

  try {
    ensureDirectoryExists(path.dirname(repoPath));

    await runGitCommand(["clone", "--mirror", cloneUrl, repoPath]);

    if (lfsEnabled) {
      await runLfs(repoPath);
    }

    summary.downloaded.push(fullRepoName);

    appendLog(`Successfully cloned ${fullRepoName}`);
  } catch (error) {
    summary.failedToDownload.push(fullRepoName);

    appendLog(`Failed to clone ${fullRepoName}: ${formatError(error)}`);
  }
}

async function updateRepository({
  fullRepoName,
  repoPath,
  lfsEnabled,
  summary,
  mainWindow,
}: {
  fullRepoName: string;
  repoPath: string;
  lfsEnabled: boolean;
  summary: SyncSummary;
  mainWindow: BrowserWindow;
}): Promise<void> {
  appendLog(`Updating ${fullRepoName}`);

  sendSyncProgress(mainWindow, "updating", fullRepoName);

  try {
    await runGitCommand(["fetch", "--verbose"], {
      cwd: repoPath,
    });

    if (lfsEnabled) {
      await runLfs(repoPath);
    }

    summary.updated.push(fullRepoName);

    appendLog(`Successfully updated ${fullRepoName}`);
  } catch (error) {
    summary.failedToUpdate.push(fullRepoName);

    appendLog(`Failed to update ${fullRepoName}: ${formatError(error)}`);
  }
}

async function getAllPublicGithubRepos(userOrOrg: string): Promise<string[]> {
  const response = await fetch(
    `https://api.github.com/users/${userOrOrg}/repos?per_page=100&type=public`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }

  const repos = (await response.json()) as Array<{
    full_name: string;
  }>;

  return repos.map((repo) => repo.full_name);
}

async function runLfs(repoPath: string): Promise<void> {
  await runGitCommand(["lfs", "install", "--local"], {
    cwd: repoPath,
  });

  await runGitCommand(["lfs", "fetch", "--all"], {
    cwd: repoPath,
  });
}

function runGitCommand(
  args: string[],
  options: SpawnOptionsWithoutStdio = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      ...options,
      shell: false,
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`git ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function sendSyncProgress(
  mainWindow: BrowserWindow,
  status: SyncStatus,
  repo: string,
): void {
  mainWindow.webContents.send("syncProgress", {
    status,
    repo,
  });
}

function ensureDirectoryExists(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, {
      recursive: true,
    });
  }
}

function appendLog(message: string): void {
  logs.push(message);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildSummaryMessage(summary: SyncSummary): string {
  return [
    "Sync complete. Summary:",
    `${summary.downloaded.length} downloaded.`,
    `${formatFailedList(summary.failedToDownload)} failed to download.`,
    `${summary.updated.length} updated.`,
    `${formatFailedList(summary.failedToUpdate)} failed to update.`,
    `${summary.ignored.length} ignored.`,
    summary.failedToDownload.length || summary.failedToUpdate.length
      ? "Delete failed repositories in the backup folder to trigger a reclone."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function formatFailedList(items: string[]): string {
  return items.length === 0 ? "0" : items.join(", ");
}
