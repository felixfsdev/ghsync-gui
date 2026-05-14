import Store from "electron-store";

const store = new Store() as any;

export function saveConfig(config: any) {
  store.set("config", config);

  const maskedConfig = {
    ...config,
    pat: config.pat ? "*".repeat(config.pat.length) : undefined,
  };
  console.log("Saved configuration: " + JSON.stringify(maskedConfig));
}

export function loadConfig(): object {
  return store.get("config");
}
