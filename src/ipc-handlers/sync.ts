import { spawn, type SpawnOptionsWithoutStdio } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { loadConfig } from "./config";
import { dialog } from "electron";

type SyncSummary = {
  downloaded: string[];
  failedToDownload: string[];
  updated: string[];
  failedToUpdate: string[];
  ignored: string[];
};

export async function sync(mainWindow: BrowserWindow): Promise<void> {
  const config = loadConfig() as any;

  fs.mkdirSync(config.storagePath, { recursive: true });

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

  mainWindow.webContents.send("outputChange", buildSummaryMessage(summary));
}

async function syncUserOrOrg({
  userOrOrg,
  config,
  summary,
  mainWindow,
}: {
  userOrOrg: string;
  config: any;
  summary: SyncSummary;
  mainWindow: BrowserWindow;
}): Promise<void> {
  let repos: string[];

  try {
    repos = await getAllPublicGithubRepos(userOrOrg);
  } catch (error) {
    dialog.showMessageBox({
      type: "error",
      title: "Failed to fetch repos",
      message: `Failed to fetch the repositories of ${userOrOrg}.`,
      buttons: ["OK"],
    });

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
  config: any;
  summary: SyncSummary;
  mainWindow: BrowserWindow;
}): Promise<void> {
  if (config.ignoredRepos?.includes(fullRepoName)) {
    summary.ignored.push(fullRepoName);
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
  mainWindow.webContents.send("outputChange", `Cloning ${fullRepoName}`);

  try {
    fs.mkdirSync(path.dirname(repoPath), { recursive: true });

    await runGitCommand(["clone", "--mirror", cloneUrl, repoPath]);

    if (lfsEnabled) {
      await runLfs(repoPath);
    }

    summary.downloaded.push(fullRepoName);
  } catch (error) {
    summary.failedToDownload.push(fullRepoName);
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
  mainWindow.webContents.send("outputChange", `Updating ${fullRepoName}`);

  try {
    await runGitCommand(["fetch"], {
      cwd: repoPath,
    });

    if (lfsEnabled) {
      await runLfs(repoPath);
    }

    summary.updated.push(fullRepoName);
  } catch (error) {
    summary.failedToUpdate.push(fullRepoName);
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

function buildSummaryMessage(summary: SyncSummary): string {
  const failedDownloads =
    summary.failedToDownload.length === 0
      ? "0"
      : summary.failedToDownload.join(", ");

  const failedUpdates =
    summary.failedToUpdate.length === 0
      ? "0"
      : summary.failedToUpdate.join(", ");

  return [
    "Sync complete. Summary:",
    `${summary.downloaded.length} downloaded.`,
    `${failedDownloads} failed to download.`,
    `${summary.updated.length} updated.`,
    `${failedUpdates} failed to update.`,
    `${summary.ignored.length} ignored.`,
    summary.failedToDownload.length || summary.failedToUpdate.length
      ? "Delete failed repositories in the backup folder to trigger a reclone."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
