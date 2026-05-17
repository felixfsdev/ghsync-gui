# ghsync-gui

Successor of ghsync. Built with Electron.

<p align="center">
  <img src="assets/screenshot.png" width="460">
</p>

## How to use

Configure a PAT, click "sync", and your repositories will be backed up to your computer.

## How it works

When you trigger sync, your repositories (including personal and organization-owned ones) are retrieved from the GitHub API using your Personal Access Token (PAT).

Each repository is then cloned as a mirror using `git clone --mirror` into the configured directory, but only if it has not already been cloned locally. After that, each repository is updated using `git fetch` (and `git lfs fetch --all` if enabled), keeping the local mirror in sync with GitHub.

> Note: These clones are bare mirrors intended for backup purposes and do not include a working directory.

## Why this exists

GitHub is a highly reliable code hosting platform, but it is not a backup system with guaranteed restore semantics. Some recovery options exist (for example, for recently deleted repositories), but they are limited and time-dependent. Force pushes can also rewrite branch history, making older states hard to recover through normal interfaces.

This app maintains a complete local mirror of your repositories—including full history, branches, and references—so you retain an independent copy for recovery, migration, or archival.

## PAT configuration

This app requires a GitHub Personal Access Token (PAT) to fetch your repositories from the GitHub api. Luckily, it is very easy to get one.

1. Go to [github.com](https://github.com).
2. Click your profile picture and click Settings.
3. Scroll down the left sidebar and click Developer Settings (usually at the very end).
4. Open the _Personal access tokens_ dropdown and click _Fine grained token_.
5. Click _Generate new token_ and give it a name (e.g., `ghsync-gui-pat`).
6. Select an expiration date if required.
7. Scroll down to _Repository access_ and select _All repositories_.
8. Under the _permissions_ section, click _Add permission_ and select _Contents_. Now, you should see _Contents_ and _Metadata_ appear in the box. **Ensure Contents access is set to _Read-only_**.
9. Click _Generate token_.
10. Copy the token (it starts with `github_pat_`). **You can only copy it now**. If you close the page without copying, you will have to generate a new one.

After that, paste the token into the PAT field in the app. The token is stored locally and is never transmitted elsewhere. Please don't forget to click Save before clicking Sync. Happy syncing!
