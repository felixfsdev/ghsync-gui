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
  const noOfReposToClone = reposToClone.length;
  for (const [index, repoToClone] of reposToClone.entries()) {
    mainWindow.webContents.send(
      "syncProgress",
      `Cloning ${index + 1}/${noOfReposToClone}: ${repoToClone.full_name}`,
    );

    try {
      await runGitCommand(
        ["clone", repoToClone.clone_url, repoToClone.path, "--mirror"],
        repoToClone.path,
        pat,
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
