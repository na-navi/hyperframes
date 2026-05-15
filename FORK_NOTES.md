# Fork notes

This is a personal fork of [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) used for local CLI experiments.

## Current focus

- `--no-open` for `hyperframes preview` and `hyperframes play`
- externally managed Chrome / CDP / Playwright workflows
- possible local-only experiments:
  - `--browser-path`
  - `--user-data-dir`
  - `--remote-debugging-port`

## Policy

- Upstream-compatible changes are proposed as small, focused PRs.
- Local workflow experiments may remain fork-only.
- PR branches contain **only** the minimal diff for upstream.
- This file is **never** included in upstream PRs.
