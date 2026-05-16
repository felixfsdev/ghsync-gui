import Store from "electron-store";

const store = new Store() as any;

export function saveConfig(config: any) {
  store.set("config", config);

  console.log(
    "Saved configuration: " +
      JSON.stringify({
        ...config,
        pat: config.pat ? "*".repeat(config.pat.length) : undefined,
      }),
  );
}

export function loadConfig(): object {
  const config = store.get("config");
  console.log(
    "Loaded config: " +
      JSON.stringify({ ...config, pat: "*".repeat(config.pat.length) }),
  );
  return config;
}
