import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { runGitCommand } from "./utils/run-git-command";
import path from "path";
/**
 * @returns number of repositories updated,
 * the full names of the repositories failed to update
 */
export default async function updateRepos(
  mainWindow: Electron.BrowserWindow,
  storagePath: string,
  lfs: boolean,
): Promise<{
  updated: number;
  failedToUpdate: string[];
}> {
  // Get the absolute paths to the repositories
  const absoluteBase = resolve(storagePath);
  const parents = await readdir(absoluteBase, { withFileTypes: true });

  const tasks = parents
    .filter((p) => p.isDirectory())
    .map(async (parent) => {
      const parentPath = join(absoluteBase, parent.name);
      const children = await readdir(parentPath, { withFileTypes: true });

      return children
        .filter((c) => c.isDirectory())
        .map((child) => join(parentPath, child.name));
    });

  const results = await Promise.all(tasks);
  const repoAbsPaths = results.flat();

  // Update repos
  let updated: number = 0;
  let failedToUpdate: string[] = [];
  const noOfReposToUpdate = repoAbsPaths.length;
  for (const [index, repoAbsPath] of repoAbsPaths.entries()) {
    const repoFullName = repoAbsPath
      .split(path.sep)
      .slice(-2)
      .join("/")
      .replace(/\.git$/, "");

    mainWindow.webContents.send(
      "syncProgress",
      `Updating ${lfs ? "and fetching LFS files" : ""} ${index + 1}/${noOfReposToUpdate}: ${repoFullName}`,
    );

    try {
      await runGitCommand(["fetch"], repoAbsPath);

      if (lfs) {
        await runGitCommand(["lfs", "fetch", "--all"], repoAbsPath);
      }

      updated++;
    } catch (error) {
      failedToUpdate.push(repoFullName);
    }
  }

  return {
    updated: updated,
    failedToUpdate: failedToUpdate,
  };
}
