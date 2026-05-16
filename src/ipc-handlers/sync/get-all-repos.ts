import path from "path";

export type Repo = {
  name: string; // shoop
  full_name: string; // faseehfs-archive/shoop
  url: string; // https://github.com/faseehfs-archive/shoop.git
  path: string; // C:\\Users\\fasee\\Temp\\backups\\faseehfs-archive\\shoop
};

export async function getAllRepos(
  pat: string,
  storagePath: string,
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
      path: path.join(storagePath, ...repo.full_name.split("/")),
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
