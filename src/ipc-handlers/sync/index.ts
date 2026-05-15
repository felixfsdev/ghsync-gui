import cloneRepos from "./clone-repos";

export async function sync(mainWindow: Electron.BrowserWindow) {
  await cloneRepos(mainWindow);
}
