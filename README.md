<h1 align="center">ghsync-gui</h1>

<p align="center">Successor of ghsync. Built with Electron. Backup your GitHub repositories with just a click.<p>

<p align="center">
  <img src="assets/screenshot.png" width="460">
</p>

---

## How to use

1. Paste the path to your backup folder
2. Paste your PAT (classic, not fine-grained; must have at least _repo_ scope)
3. Click Sync

And your repositories will be backed up to your computer.

## How it works

When you click Sync, the GitHub repositories you have access to (includes your own repos, repos of your organizations, and others) are retrieved from the GitHub API using your Personal Access Token (PAT).

Each repository is then cloned as a mirror using `git clone --mirror` into the configured directory, but only if it has not already been cloned locally. After that, each repository is updated using `git fetch` (and `git lfs fetch --all` if enabled), keeping the local mirror in sync with GitHub.

> Note: These clones are bare mirrors intended for backup purposes and do not include a working directory.

## Why this exists

GitHub is a highly reliable code hosting platform, but it is not a backup system with guaranteed restore semantics. Some recovery options exist (for example, for recently deleted repositories), but they are limited and time-dependent. Force pushes can also rewrite branch history, making older states hard to recover through normal interfaces.

This app maintains a complete local mirror of your repositories—including full history, branches, and references—so you retain an independent copy for recovery, migration, or archival.

## PAT configuration

This app requires a GitHub Personal Access Token (PAT) to fetch your repositories from the GitHub API. Luckily, it is very easy to get one.

1. Go to [github.com](https://github.com)
2. Click your profile picture and click Settings
3. Scroll down the left sidebar and click Developer Settings (usually at the very end)
4. Open the _Personal access tokens_ dropdown and click _Tokens (classic)_
5. Click _Generate new token_ and select _classic_ (**not** fine-grained)
6. Add a note (e.g., `ghsync-gui-pat`)
7. Select an expiration date (or use the default)
8. Select scope _repo_ (this should automatically select everything underneath)
9. Scroll down and click _Generate token_
10. Copy the generated token (you won't be able to see it again, it starts with `ghp_`)

After that, paste the token into the PAT field in the app. The token is stored locally and is never transmitted elsewhere except the GitHub API.

> Note: You should use a classic GitHub PAT instead of a fine-grained PAT, otherwise `git lfs fetch` would fail. We currently don't know the exact reason for this failure. If you keep LFS turned off, you can _probably_ use a fine-grained PAT.

## Known limitations

Currently, the app attempts to update all the repositories eventhough some might not have been changed. While this isn't problematic, it is innefficient. In later versions, we are planning on checking the `last_updated` field to only update the repositories that have been changed.

## Thanks

Thanks for sticking with this project to the end. If you found it useful or interesting, please consider starring the official repository—it genuinely helps increase visibility and support continued development.

If you run into any problems, don’t hesitate to open an issue; detailed reports are especially valuable and help fixes happen faster. Feature ideas, improvements, and critiques are not just welcome but actively encouraged—they shape the direction of the project.

You can also contribute by sharing the project, submitting pull requests, or simply spreading the word.
