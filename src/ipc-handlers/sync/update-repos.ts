import { readdir } from "fs/promises";
import { join, resolve } from "path";
import Store from "electron-store";

const store = new Store() as any;

export default async function updateRepos(
  mainWindow: Electron.BrowserWindow,
): Promise<{
  success: boolean;
  updated: string[];
  failedToUpdate: string[];
}> {
  const repoAbsPaths = await getRepoAbsPaths();

  console.log(repoAbsPaths);

  return {
    success: false,
    updated: [],
    failedToUpdate: [],
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
