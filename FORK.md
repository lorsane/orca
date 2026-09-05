# Fork notes

A fork of [stablyai/orca](https://github.com/stablyai/orca) that reshapes the
workspace board and the sidebar around a monorepo workflow: most work happens in
plain folders rather than git worktrees, one workspace holds several agents at
once, and the list has to stay short.

## What differs from upstream

| Area | Change |
| --- | --- |
| Board | Folder workspaces get cards, not just git worktrees |
| Board | A workspace with more than one tab becomes one card per tab, each with its own status |
| Board | Any row can be taken off the board, or forced onto it against a sidebar filter |
| Sidebar | "Active within" recency filter — Any / Today / + Yesterday, on calendar-day bounds |
| Sidebar | Individual workspaces and whole projects can be hidden and brought back |
| Sidebar | The Pinned section splits into one lane per board status |
| Build | **This build never updates itself** — see below |

Every behaviour above has an off-switch in the sidebar filter menu, the
workspace options menu, or the board settings menu.

## Auto-update is disabled on purpose

The packaged update feed points at the upstream repository, so an enabled
updater would download an upstream release and replace this build — silently
removing every change listed above. It is gated in three places:

- `src/main/window/main-window-updater.ts` never wires the updater at startup,
  so there is no scheduler, no listeners, and `electron-updater` is never loaded.
- The `updater:check` / `updater:download` / `updater:quitAndInstall` IPC
  handlers are no-ops, so the Settings buttons cannot reach it either.
- `config/electron-builder.config.cjs` bakes the fork's own repository into
  `app-update.yml`, so even a re-enabled updater could not see upstream releases.

The switch is `FORK_AUTO_UPDATE_DISABLED` in `src/shared/fork-auto-update.ts`.
`attach-main-window-services.test.ts` asserts the updater stays unwired, so
re-enabling it by accident fails the suite.

Upgrading means rebuilding from source. That is deliberate.

## Building

Requires Node 24 and pnpm 12 (`corepack prepare pnpm@12.0.0 --activate`).

```sh
pnpm install
pnpm build:mac          # dist/orca-macos-arm64.dmg + dist/mac-arm64/Orca.app
```

Local macOS builds are ad-hoc signed in `afterPack`. Without that they do not
launch on Apple Silicon: with no Developer ID, electron-builder skips signing
the bundle entirely and leaves its resources unsealed. They are not notarized,
so macOS may re-ask for Documents/Downloads access after each rebuild.

## Tracking upstream

```sh
git fetch upstream
git merge upstream/main
```

The changes are kept small and additive. The files most likely to conflict are
the shared lists every preference has to be added to — `src/shared/constants.ts`,
`src/shared/persisted-ui-state-types.ts`,
`src/renderer/src/store/slices/ui/ui-slice-contract-preferences.ts` — where a
conflict is normally two neighbouring additions rather than a real disagreement.

Verify a merge with `pnpm tc`, `oxlint src/`, and `pnpm test`. Three suites fail
without a real `claude` / `codex` binary on the machine and are unrelated to this
fork: `claude-structured-real-cli`, `claude-tui-resume-real-binary.integration`,
and `codex-fetcher-pty-settle`.
