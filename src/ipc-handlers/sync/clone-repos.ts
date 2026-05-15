import Store from "electron-store";
import * as path from "path";

const store = new Store() as any;

type Repo = {
  name: string;
  full_name: string;
  url: string;
  path: string;
};

export default async function CloneRepos(): Promise<{
  success: boolean;
  message: string;
}> {
  const config = store.get("config");
  const pat = config.pat;
  if (!pat) {
    return {
      success: false,
      message: "Personal Access Token (PAT) not found. Please configure it.",
    };
  }

  const response = await getAllRepos(pat, config);

  if (!response.success) {
    return { success: false, message: response.message };
  }

  console.log("Fetched repos:");
  console.log(response.repos);

  return { success: true, message: "Success" };
}

async function getAllRepos(
  pat: string,
  config: any,
): Promise<{
  success: boolean;
  message: string;
  repos: Repo[] | null;
}> {
  try {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100",
      {
        method: "GET",
        headers: {
          Authorization: `token ${pat}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        message: `Failed to fetch repos: ${response.status} ${response.statusText}`,
        repos: null,
      };
    }

    const reposJSON = await response.json();
    const repos: Repo[] = reposJSON.map((repo: any) => ({
      name: repo.name,
      full_name: repo.full_name,
      url: repo.clone_url,
      path: path.join(config.storagePath, ...repo.full_name.split("/")),
    }));

    return {
      success: true,
      message: "Repos fetched successfully",
      repos,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to fetch repos due to an unknown error",
      repos: null,
    };
  }
}
