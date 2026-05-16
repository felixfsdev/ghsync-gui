import { promises as fs } from "fs";
import { runGitCommand } from "./utils/run-git-command";
import { Repo } from "./get-all-repos";

/**
 *
 * @param ignoredRepos strings in the format owner/repo-name
 * @returns
 */
export default async function cloneRepos(
  mainWindow: Electron.BrowserWindow,
  pat: string,
  allRepos: Repo[],
  ignoredRepos: string[],
): Promise<{
  cloned: number;
  ignored: number;
  failedToClone: Repo[];
}> {
  let cloned = 0;
  let ignored = 0;
  let failedToClone: Repo[] = [];

  let reposToClone: Repo[] = [];

  // Filter repos
  for (const repo of allRepos) {
    try {
      await fs.access(repo.path);
    } catch {
      if (ignoredRepos.includes(repo.full_name)) {
        ignored++;
        continue;
      }
      reposToClone.push(repo);
    }
  }

  // Clone repos
  for (const repoToClone of reposToClone) {
    const authenticatedUrl = repoToClone.clone_url.replace(
      "https://",
      `https://${pat}@`,
    );

    mainWindow.webContents.send(
      "syncProgress",
      `Cloning ${repoToClone.full_name}...`,
    );

    try {
      await runGitCommand(
        ["clone", authenticatedUrl, repoToClone.path, "--mirror"],
        repoToClone.path,
      );
    } catch (error) {
      failedToClone.push(repoToClone);
    } finally {
      cloned++;
    }
  }

  return {
    cloned: cloned,
    failedToClone: failedToClone,
    ignored: ignored,
  };
}
