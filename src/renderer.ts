/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

// @ts-ignore
import "./index.css";

const configForm = document.getElementById("configForm") as HTMLFormElement;

configForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(configForm);
  const usersAndOrgs = formData.get("usersAndOrgs") as string;
  const pat = formData.get("pat") as string;
  const ignoredRepos = formData.get("ignoredRepos") as string;

  window.api.saveConfig({
    usersAndOrgs: usersAndOrgs,
    pat: pat,
    ignoredRepos: ignoredRepos,
  });

  console.log("Loaded config: " + String(window.api.loadConfig()));
});
