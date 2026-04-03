## Why

Lattix currently requires users to learn two commands (`init` then `watch`) for the most common workflow: start the agent on a machine. In practice, `watch` already contains nearly all of `init`'s logic (OneDrive detection, setup, config creation), making `init` feel redundant for the majority of users. A single `run` command that auto-initializes when needed and then starts watching removes this friction, reduces cognitive overhead, and makes the first-run experience seamless.

## What Changes

- **BREAKING**: Remove the `init` command entirely.
- **BREAKING**: Remove the `watch` command entirely.
- **BREAKING**: Remove the `--provider` option (only `onedrive` was supported; hardcode it).
- Add a new `run` command that replaces both `init` and `watch`:
  - On first use (no config): auto-detect OneDrive, run setup, then start the task watcher.
  - On subsequent uses (config exists): load config, validate setup, then start the task watcher.
  - Accepts `--poll-interval` and `--concurrency` options (same as current `watch`).
- Remove multi-account interactive selection and relink confirmation flows. Assume a single usable OneDrive account per machine; if multiple are detected, pick the first one deterministically.
- Update `submit` and `status` commands to auto-bootstrap (call shared setup logic) instead of failing with "Run lattix init first".
- Extract shared bootstrap logic into a reusable module so all commands share one initialization path.
- Update README, CLI help text, and all user-facing messages to reference `lattix run`.

## Capabilities

### New Capabilities
- `run-command`: The unified `run` command that auto-initializes and starts the task watcher in a single step.
- `auto-bootstrap`: Shared setup logic that any command can call to ensure Lattix is initialized before proceeding.

### Modified Capabilities
- `cli-entrypoint`: Remove `init` and `watch` commands, add `run` command. Remove `--provider` option. Update help text.
- `provider-selection`: Remove multi-account interactive prompts, relink confirmation, and `normalizeProvider()`. Always use `onedrive`. Always pick the first detected account.
- `onedrive-detection`: No spec-level requirement change (detection still works the same), but the consumer changes from two commands to one shared bootstrap path.

## Impact

- **Breaking CLI change**: Users with scripts or docs referencing `lattix init` or `lattix watch` must update to `lattix run`.
- **Code removals**: `src/commands/init.ts` deleted. `src/commands/watch.ts` replaced by `src/commands/run.ts`. Multi-account prompt and `confirmRelink` logic in `provider-selection.ts` removed.
- **Code additions**: `src/services/bootstrap.ts` (shared setup resolution). `src/commands/run.ts` (new command).
- **Modified files**: `src/cli.ts`, `src/commands/submit.ts`, `src/commands/status.ts`, `src/services/provider-selection.ts`, `README.md`.
- **Tests**: Existing `init-command.test.js` and `watch-command.test.js` replaced by `run-command.test.js`. Tests for multi-account selection and relink confirmation removed. New tests for auto-bootstrap added.
