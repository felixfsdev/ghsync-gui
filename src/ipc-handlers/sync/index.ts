import cloneRepos from "./clone-repos";

export async function sync() {
  await cloneRepos();
}
