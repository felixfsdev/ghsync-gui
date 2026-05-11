// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge } = require("electron");

const api = {
  config: {
    save: () => {
      console.log("Saved");
    },
    load: () => {
      console.log("Loaded");
    },
  },
};

contextBridge.exposeInMainWorld("api", api);

export type API = typeof api;
