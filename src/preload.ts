// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

const api = {
  saveConfig: (config: object) => {
    ipcRenderer.invoke("saveConfig", config);
  },
  loadConfig: () => {
    return ipcRenderer.invoke("loadConfig");
  },
  sync: async () => {
    await ipcRenderer.invoke("sync");
  },
  onSyncProgress: (
    callback: (data: { status: string; repo: string }) => void,
  ) => {
    ipcRenderer.on("syncProgress", (_: any, data: any) => callback(data));
  },
  onSyncComplete: (
    callback: (data: {
      downloaded: number;
      failedToDownload: number;
      updated: number;
      failedToUpdate: number;
      ignored: number;
    }) => void,
  ) => {
    ipcRenderer.on("syncComplete", (_: any, data: any) => callback(data));
  },
};

contextBridge.exposeInMainWorld("api", api);

export type API = typeof api;
