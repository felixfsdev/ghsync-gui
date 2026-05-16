import { readdir } from "fs/promises";
import { join, resolve } from "path";
import Store from "electron-store";
import { runGitCommand } from "./run-git-command";
import path from "path";
const store = new Store() as any;

/**
 *
 * @param mainWindow
 * @returns Status of the operation and the full names (e.g., owner/repo)
 * of updated and failed to update repos.
 */
export default async function updateRepos(
  mainWindow: Electron.BrowserWindow,
): Promise<{
  success: boolean;
  updated: string[];
  failedToUpdate: string[];
}> {
  const repoAbsPaths = await getRepoAbsPaths();

  console.log(repoAbsPaths);

  let updated: string[] = [];
  let failedToUpdate: string[] = [];

  for (const repoPath of repoAbsPaths) {
    mainWindow.webContents.send(
      "outputChange",
      `Updating ${repoPath.split(path.sep).slice(-2).join("/")}`,
    );

    try {
      const fetchResponse = await runGitCommand(["fetch"], repoPath);
      if (!fetchResponse.success) {
        failedToUpdate.push(repoPath.split(path.sep).slice(-2).join("/"));
      } else {
        updated.push(repoPath.split(path.sep).slice(-2).join("/"));
      }
    } catch (error) {
      failedToUpdate.push(repoPath.split(path.sep).slice(-2).join("/"));
    }
  }

  return {
    success: true,
    updated: updated,
    failedToUpdate: failedToUpdate,
  };
}

async function getRepoAbsPaths(): Promise<string[]> {
  const storagePath = store.get("config").storagePath;

  if (!storagePath) {
    return [];
  }

  const absoluteBase = resolve(storagePath);
  const parents = await readdir(absoluteBase, { withFileTypes: true });

  const tasks = parents
    .filter((p) => p.isDirectory())
    .map(async (parent) => {
      const parentPath = join(absoluteBase, parent.name);
      const children = await readdir(parentPath, { withFileTypes: true });

      return children
        .filter((c) => c.isDirectory())
        .map((child) => join(parentPath, child.name)); // Joins into a full absolute string
    });

  const results = await Promise.all(tasks);
  return results.flat();
}
