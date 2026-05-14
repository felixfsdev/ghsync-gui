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

async function loadDefaultConfig() {
  const config = await window.api.loadConfig();
  const usersAndOrgsInput = document.getElementById(
    "usersAndOrgs",
  ) as HTMLInputElement;
  const patInput = document.getElementById("pat") as HTMLInputElement;
  const storagePathInput = document.getElementById(
    "storagePath",
  ) as HTMLInputElement;
  const ignoredReposInput = document.getElementById(
    "ignoredRepos",
  ) as HTMLInputElement;
  const lfsInput = document.getElementById("lfs") as HTMLInputElement;

  usersAndOrgsInput.value = config.usersAndOrgs.join(" ");
  patInput.value = config.pat;
  storagePathInput.value = config.storagePath;
  ignoredReposInput.value = config.ignoredRepos.join(" ");
  lfsInput.checked = config.lfs === "on";
}

loadDefaultConfig();

// Save config
const configForm = document.getElementById("configForm") as HTMLFormElement;

configForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(configForm);
  const usersAndOrgs = formData.get("usersAndOrgs") as string;
  const pat = formData.get("pat") as string;
  const storagePath = formData.get("storagePath") as string;
  const ignoredRepos = formData.get("ignoredRepos") as string;
  const lfs = formData.get("lfs") as string;

  await window.api.saveConfig({
    usersAndOrgs: usersAndOrgs.split(" "),
    pat: pat,
    storagePath: storagePath,
    ignoredRepos: ignoredRepos.split(" "),
    lfs: lfs,
  });
});

// Sync
const syncBtn = document.getElementById("syncBtn") as HTMLButtonElement;
const progressEl = document.getElementById("progress") as HTMLParagraphElement;
const outputEl = document.getElementById("output") as HTMLParagraphElement;

// Listen for progress updates
window.api.onSyncProgress((data: { status: string; repo: string }) => {
  const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  progressEl.innerText = `${statusText}: ${data.repo}`;
});

// Listen for sync completion
window.api.onSyncComplete((data) => {
  progressEl.innerText = "";
  progressEl.classList.add("hidden");

  outputEl.innerText = data.message;
});

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  syncBtn.innerText = "Syncing...";
  progressEl.innerText = "";
  progressEl.classList.remove("hidden");
  outputEl.innerText = "";

  await window.api.sync();

  syncBtn.disabled = false;
  syncBtn.innerText = "Sync Again";
});
