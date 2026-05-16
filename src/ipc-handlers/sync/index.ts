import cloneRepos from "./clone-repos";
import { dialog } from "electron";
import updateRepos from "./update-repos";

export async function sync(mainWindow: Electron.BrowserWindow) {
  // Clone repos from GitHub
  const cloneResponse = await cloneRepos(mainWindow);

  if (!cloneResponse.success) {
    dialog.showErrorBox("Clone Failed", cloneResponse.message);
  }

  console.log(`Cloned: ${cloneResponse.cloned}`);
  console.log(`Failed to Clone: ${cloneResponse.failedToClone}`);
  console.log(`Ignored: ${cloneResponse.ignored}`);

  const updateResponse = await updateRepos(mainWindow);

  mainWindow.webContents.send(
    "outputChange",
    [
      `Cloned: ${cloneResponse.cloned.length}`,
      `Failed to Clone: ${cloneResponse.failedToClone.length ? cloneResponse.failedToClone.join(", ") : "0"}`,
      `Ignored: ${cloneResponse.ignored.length}`,
      `Updated: ${updateResponse.updated.length}`,
      `Failed to Update: ${updateResponse.failedToUpdate.length ? updateResponse.failedToUpdate.join(", ") : "0"}`,
    ].join(". "),
  );
}
