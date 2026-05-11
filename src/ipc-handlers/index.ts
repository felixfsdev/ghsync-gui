import { ipcMain } from "electron";

export default function registerIPCHandlers() {
  ipcMain.handle("config:save", () => {
    console.log("Saved by ipc handler");
  });

  ipcMain.handle("config:load", () => {
    console.log("Loaded by ipc handler");
  });
}
