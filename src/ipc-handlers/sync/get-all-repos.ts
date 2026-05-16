import path from "path";

export type Repo = {
  name: string; // example-repo
  full_name: string; // owner/example-repo
  clone_url: string; // https://github.com/owner/example-repo.git
  path: string; // storagePath + /owner/example-repo.git
};

export async function getAllRepos(
  pat: string,
  storagePath: string,
): Promise<Repo[]> {
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
    throw new Error(
      `Failed to fetch repos: ${response.status} ${response.statusText}`,
    );
  }

  const reposJSON = await response.json();
  const repos: Repo[] = reposJSON.map((repo: any) => ({
    name: repo.name,
    full_name: repo.full_name,
    clone_url: repo.clone_url,
    path: path.join(
      storagePath,
      repo.full_name.split("/")[0],
      repo.full_name.split("/")[1] + ".git",
    ),
  }));

  return repos;
}
