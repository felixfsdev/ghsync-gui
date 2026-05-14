import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { loadConfig } from "./config";

function runGitCommand(
  args: string[],
  options: import("node:child_process").SpawnOptionsWithoutStdio = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      ...options,
      shell: false,
    });

    child.stdout?.on("data", (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`git ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function getAllGithubRepos(
  userOrOrg: string,
  pat?: string,
): Promise<string[]> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };

  if (pat) {
    headers.Authorization = `Bearer ${pat}`;
  }

  const response = await fetch(
    `https://api.github.com/users/${userOrOrg}/repos?per_page=100`,
    {
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repos for ${userOrOrg}`);
  }

  const repos = (await response.json()) as Array<{ name: string }>;

  return repos.map((repo) => repo.name);
}

async function runLfs(repoPath: string) {
  await runGitCommand(["lfs", "install", "--local"], { cwd: repoPath });
  await runGitCommand(["lfs", "fetch", "--all"], { cwd: repoPath });
}

export async function sync(mainWindow: BrowserWindow) {
  const config = loadConfig() as any;

  const { usersAndOrgs, pat, storagePath, ignoredRepos = [] } = config as any;

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const downloaded: string[] = [];
  const failedToDownload: string[] = [];
  const updated: string[] = [];
  const failedToUpdate: string[] = [];
  const ignored: string[] = [];

  for (const userOrOrg of usersAndOrgs) {
    let repos: string[] = [];

    try {
      repos = await getAllGithubRepos(userOrOrg, pat);
    } catch (error) {
      console.error(`Failed to fetch repos for ${userOrOrg}`, error);
      continue;
    }

    for (const repo of repos.sort()) {
      if (ignoredRepos.includes(repo)) {
        console.log(`Ignored ${repo}`);
        mainWindow.webContents.send("syncProgress", {
          status: "ignored",
          repo,
        });
        ignored.push(repo);
        continue;
      }

      const repoPath = path.join(storagePath, repo);

      if (!fs.existsSync(repoPath)) {
        console.log(`Cloning ${repo}`);
        mainWindow.webContents.send("syncProgress", {
          status: "cloning",
          repo,
        });

        const cloneUrl = pat
          ? `https://${userOrOrg}:${pat}@github.com/${userOrOrg}/${repo}.git`
          : `https://github.com/${userOrOrg}/${repo}.git`;

        try {
          await runGitCommand(["clone", "--mirror", cloneUrl, repoPath]);

          if (config.lfs === "on") {
            await runLfs(repoPath);
          }

          downloaded.push(repo);
        } catch (error) {
          console.error(`Failed to clone ${repo}`, error);
          failedToDownload.push(repo);
        }

        continue;
      }

      console.log(`Updating ${repo}`);
      mainWindow.webContents.send("syncProgress", {
        status: "updating",
        repo,
      });

      try {
        await runGitCommand(["fetch", "--verbose"], { cwd: repoPath });

        if (config.lfs === "on") {
          await runLfs(repoPath);
        }

        updated.push(repo);
      } catch (error) {
        console.error(`Failed to update ${repo}`, error);
        failedToUpdate.push(repo);
      }
    }
  }

  const summary = [
    "Sync complete. Summary:",
    `${downloaded.length} downloaded,`,
    `${failedToDownload.length === 0 ? "0" : failedToDownload.join(", ")} failed to download,`,
    `${updated.length} updated,`,
    `${failedToUpdate.length === 0 ? "0" : failedToUpdate.join(", ")} failed to update,`,
    `${ignored.length} ignored.`,
    failedToDownload.length || failedToUpdate.length
      ? "Delete the failed repositories in the backup folder to trigger a reclone."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  mainWindow.webContents.send("syncComplete", {
    message: summary,
  });
}
