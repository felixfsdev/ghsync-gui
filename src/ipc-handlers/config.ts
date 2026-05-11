import Store from "electron-store";

const store = new Store() as any;

export function saveConfig(config: object) {
  store.set("config", config);
  console.log(store.get("config"));
}

export function loadConfig(): object {
  return store.get("config");
}
