// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

const api = {
  config: {
    save: () => {
      ipcRenderer.invoke("config:save");
    },
    load: () => {
      ipcRenderer.invoke("config:load");
    },
  },
};

contextBridge.exposeInMainWorld("api", api);

export type API = typeof api;
