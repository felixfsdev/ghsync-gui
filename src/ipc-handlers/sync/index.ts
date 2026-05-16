import cloneRepos from "./clone-repos";
import { dialog } from "electron";
import updateRepos from "./update-repos";
import { Repo, getAllRepos } from "./get-all-repos";
import Store from "electron-store";

const store = new Store() as any;

export async function sync(mainWindow: Electron.BrowserWindow) {
  const { storagePath, pat, ignoredRepos, lfs } = store.get("config") as {
    storagePath: string;
    pat: string;
    ignoredRepos: string[];
    lfs: boolean;
  };

  if (!storagePath) {
    dialog.showErrorBox(
      "Configuration Error",
      "Storage path is not configured.",
    );
    return;
  }

  if (!pat) {
    dialog.showErrorBox(
      "Configuration Error",
      "Personal Access Token (PAT) is not configured.",
    );
    return;
  }

  // Fetch repos from GitHub
  let allRepos: Repo[];
  try {
    allRepos = await getAllRepos(pat, storagePath);
  } catch (error) {
    if (error instanceof Error) {
      dialog.showErrorBox("Failed to fetch repos", error.message);
    } else {
      dialog.showErrorBox("Failed to fetch repos", "Unknown error");
    }
    return;
  }

  // Clone repos from GitHub
  try {
    await cloneRepos(mainWindow, pat, allRepos, ignoredRepos);
  } catch (error) {
    if (error instanceof Error) {
      dialog.showErrorBox("Failed to clone repos", error.message);
    } else {
      dialog.showErrorBox("Failed to clone repos", "Unknown error");
    }
    return;
  }

  // Update repos and fetch LFS files

  // Pending...

  mainWindow.webContents.send("outputChange", "Finished");
}
