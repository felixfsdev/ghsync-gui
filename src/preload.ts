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
};

contextBridge.exposeInMainWorld("api", api);

export type API = typeof api;
