import { ipcMain } from "electron";
import type { BrowserWindow } from "electron";
import { saveConfig, loadConfig } from "./config";
import { sync } from "./sync";

export default function registerIPCHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("saveConfig", (event, config: object) => {
    saveConfig(config);
  });

  ipcMain.handle("loadConfig", () => {
    return loadConfig();
  });
  ipcMain.handle("sync", async () => {
    await sync(mainWindow);
  });
}
