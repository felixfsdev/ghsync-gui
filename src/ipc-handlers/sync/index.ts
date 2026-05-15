import cloneRepos from "./clone-repos";
import { dialog } from "electron";

export async function sync(mainWindow: Electron.BrowserWindow) {
  const cloneResponse = await cloneRepos(mainWindow);

  if (!cloneResponse.success) {
    dialog.showErrorBox("Clone Failed", cloneResponse.message);
  }

  mainWindow.webContents.send("outputChange", "");
}
