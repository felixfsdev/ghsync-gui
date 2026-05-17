import cloneRepos from "./clone-repos";
import { dialog } from "electron";
import updateRepos from "./update-repos";
import { Repo, getAllRepos } from "./get-all-repos";
import Store from "electron-store";
import { runGitCommand } from "./utils/run-git-command";

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

  // Validate configuration
  if (!storagePath) {
    dialog.showErrorBox(
      "Configuration Error",
      "Path to the backup folder is not configured.",
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

  // Check git installation
  try {
    console.log(await runGitCommand(["version"], process.cwd()));
  } catch (error) {
    dialog.showErrorBox(
      "Git not installed",
      "Please ensure git is installed and added to PATH.",
    );
    return;
  }

  // Check git lfs installation
  try {
    console.log(await runGitCommand(["lfs", "version"], process.cwd()));
  } catch (error) {
    dialog.showErrorBox(
      "LFS not installed",
      "Please install LFS and try again.",
    );
    return;
  }

  // Initialize lfs
  try {
    await runGitCommand(["lfs", "install"], process.cwd());
  } catch (error) {
    if (error instanceof Error) {
      dialog.showErrorBox(
        "Failed to initialize LFS",
        "We tried to run `git lfs install` but failed with the following error message: " +
          error.message,
      );
      return;
    } else {
      dialog.showErrorBox(
        "Failed to initialize LFS",
        "We tried to run `git lfs install` but failed with an unknown error.",
      );
      return;
    }
  }

  // Fetch repos from GitHub
  let allRepos: Repo[];
  try {
    allRepos = await getAllRepos(pat, storagePath);
  } catch (error) {
    if (error instanceof Error) {
      dialog.showErrorBox(
        "Failed to fetch repos",
        error.message === "fetch failed"
          ? "Please check your internet connection and try again."
          : error.message,
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
  const { updated, failedToUpdate } = await updateRepos(
    mainWindow,
    storagePath,
    lfs,
  );

  // Show errorbox in case of errors
  if (failedToClone.length) {
    dialog.showErrorBox(
      "Failed to clone some repositories",
      `The following repositories could not be cloned:\n\n${failedToClone.join(" ")}` +
        "\n\nPlease check your internet connection or PAT and try again.",
    );
  }
  if (failedToUpdate.length) {
    dialog.showErrorBox(
      "Failed to update some repositories",
      `The following repositories could not be updated:\n\n${failedToUpdate.join(" ")}` +
        "\n\nPlease check your internet connection or PAT and try again.",
    );
  }

  // Send final message to syncProgress
  const finalMessage =
    `Finished${failedToClone.length || failedToUpdate.length ? " with ERRORS" : ""}. Summary: ` +
    [
      `${cloned} cloned`,
      `${ignored} ignored`,
      `${failedToClone.length} failed to clone`,
      `${updated} updated`,
      `${failedToUpdate.length} failed to update`,
    ].join(", ") +
    ".";

  mainWindow.webContents.send("syncProgress", finalMessage);
}
