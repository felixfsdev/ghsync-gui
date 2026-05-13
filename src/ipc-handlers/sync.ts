import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";

type SyncResult = {
  downloaded: number;
  failedToDownload: number;
  updated: number;
  failedToUpdate: number;
  ignored: number;
};

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

export async function sync(): Promise<SyncResult> {
  const config = loadConfig();

  const { usersAndOrgs, pat, storagePath, ignoredRepos = [] } = config as any;

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  let downloaded = 0;
  let failedToDownload = 0;
  let updated = 0;
  let failedToUpdate = 0;
  let ignored = 0;

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
        ignored++;
        continue;
      }

      const repoPath = path.join(storagePath, repo);

      if (!fs.existsSync(repoPath)) {
        console.log(`Cloning ${repo}`);

        const cloneUrl = pat
          ? `https://${userOrOrg}:${pat}@github.com/${userOrOrg}/${repo}.git`
          : `https://github.com/${userOrOrg}/${repo}.git`;

        try {
          await runGitCommand(["clone", "--mirror", cloneUrl, repoPath]);
          downloaded++;
        } catch (error) {
          console.error(`Failed to clone ${repo}`, error);
          failedToDownload++;
        }

        continue;
      }

      console.log(`Updating ${repo}`);

      try {
        await runGitCommand(["fetch", "--verbose"], { cwd: repoPath });
        updated++;
      } catch (error) {
        console.error(`Failed to update ${repo}`, error);
        failedToUpdate++;
      }
    }
  }

  console.log(`
Downloaded: ${downloaded}
Failed to download: ${failedToDownload}
Updated: ${updated}
Failed to update: ${failedToUpdate}
Ignored: ${ignored}
`);

  return {
    downloaded,
    failedToDownload,
    updated,
    failedToUpdate,
    ignored,
  };
}
