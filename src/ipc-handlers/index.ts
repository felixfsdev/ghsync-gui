import { ipcMain } from "electron";
import { saveConfig, loadConfig } from "./config";

export default function registerIPCHandlers() {
  ipcMain.handle("saveConfig", (event, config: object) => {
    saveConfig(config);
  });

  ipcMain.handle("loadConfig", () => {
    return loadConfig();
  });
}
