import cloneRepos from "./clone-repos";
import { dialog } from "electron";
import updateRepos from "./update-repos";
import { Repo, getAllRepos } from "./get-all-repos";
import Store from "electron-store";

const store = new Store() as any;

export async function sync(mainWindow: Electron.BrowserWindow) {
  // Reset progress
  mainWindow.webContents.send("syncProgress", "");

  // Get configuration from electron-store
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
      dialog.showErrorBox(
        "Failed to fetch repos",
        error.message +
          "\n\nCheck your internet connection or PAT and try again.",
      );
    } else {
      dialog.showErrorBox("Failed to fetch repos", "Unknown error");
    }
    return;
  }

  // Clone repos from GitHub
  let cloneReposResult;
  try {
    cloneReposResult = await cloneRepos(
      mainWindow,
      pat,
      allRepos,
      ignoredRepos,
    );
  } catch (error) {
    if (error instanceof Error) {
      dialog.showErrorBox("Failed to clone repos", error.message);
    } else {
      dialog.showErrorBox("Failed to clone repos", "Unknown error");
    }
    return;
  }
  const { cloned, ignored, failedToClone } = cloneReposResult;

  // Update repos and fetch LFS files

  // Pending...

  // Show errorbox in case of errors
  if (failedToClone.length) {
    dialog.showErrorBox(
      "Failed to clone some repositories",
      `The following repositories could not be cloned:\n\n${failedToClone.join(" ")}` +
        "Please check your internet connection or PAT and try again.",
    );
  }

  // Send final message to syncProgress
  const finalMessage =
    `Finished${failedToClone.length ? " with ERRORS" : ""}. Summary: ` +
    [
      `${cloned} cloned`,
      `${ignored} ignored`,
      `${failedToClone.length} failed to clone`,
    ].join(", ") +
    ".";
  mainWindow.webContents.send("syncProgress", finalMessage);
}
