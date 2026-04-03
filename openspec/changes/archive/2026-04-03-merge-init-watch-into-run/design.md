## Context

Lattix currently exposes four CLI commands: `init`, `watch`, `submit`, and `status`. The `init` and `watch` commands have significant overlap—both detect OneDrive, run `SetupService.setup()`, and create config/symlinks. The `watch` command already self-bootstraps when no config exists (`watch.ts:85-104`), making `init` largely redundant for single-account users.

The `submit` and `status` commands fail with "Run lattix init first" when the tasks directory is missing, instead of self-initializing.

Current module structure:
- `src/commands/init.ts` — OneDrive detection → account selection → relink confirmation → setup
- `src/commands/watch.ts` — config load → (fallback: detection → selection) → setup → watcher loop
- `src/services/provider-selection.ts` — multi-account interactive prompts, relink confirmation, provider validation
- `src/services/setup.ts` — directory creation, symlinks, config persistence
- `src/services/onedrive-detector.ts` — registry/filesystem scanning for OneDrive paths

## Goals / Non-Goals

**Goals:**
- Replace `init` and `watch` with a single `run` command that auto-initializes then starts watching.
- Extract a shared bootstrap module so all commands (`run`, `submit`, `status`) can self-initialize.
- Remove multi-account selection, relink confirmation, and `--provider` option to simplify the codebase.
- Maintain all existing setup capabilities: OneDrive detection, directory creation, symlink management, config persistence, legacy migration.

**Non-Goals:**
- Supporting multiple OneDrive accounts on the same machine.
- Supporting providers other than OneDrive.
- Adding a `--reconfigure` flag (deferred to future work if needed).
- Changing the `submit` or `status` command interfaces (only their internal bootstrap path changes).

## Decisions

### Decision 1: New `bootstrap.ts` service module

**Choice**: Create `src/services/bootstrap.ts` that encapsulates the "ensure Lattix is configured" flow.

**Rationale**: Both `watch.ts:resolveSelection` and `init.ts` duplicate the pattern of "load config, if missing detect and setup." Extracting this into one place eliminates the duplication and makes it trivially reusable by `submit` and `status`.

**Interface**:
```typescript
export function bootstrap(deps?): LattixConfig
// 1. loadConfig() → if exists, return it after running setup() to validate symlinks
// 2. detectAccounts() → pick first account → setup() → return config
```

**Alternative considered**: Keep the logic inline in `run.ts`. Rejected because `submit` and `status` also need it.

### Decision 2: First-account-wins selection strategy

**Choice**: When `OneDriveDetector.detectAccounts()` returns multiple accounts, pick `accounts[0]` without prompting.

**Rationale**: The user explicitly asked to simplify away multi-account handling. Detection order is deterministic (registry scan order on Windows), so the result is stable across runs. If a user later needs to switch, they can edit `~/.lattix/config.json` directly or we can add a `--reconfigure` flag in the future.

**Alternative considered**: Prompt interactively on first run only. Rejected—adds complexity for a scenario the user says doesn't happen in practice.

### Decision 3: Delete `init.ts` and `watch.ts`, create `run.ts`

**Choice**: `src/commands/run.ts` replaces both files. It calls `bootstrap()` then starts the watcher (reusing existing `TaskWatcher`, `AgentExecutor`, `ResultWriter`).

**Rationale**: Clean break. The new command is shorter than either existing command because bootstrap logic is extracted. Keeping `watch.ts` alongside `run.ts` would create confusion.

**Alternative considered**: Rename `watch.ts` to `run.ts` and gut `init.ts`. Rejected—`run.ts` is conceptually different enough (always bootstraps, no fallback branching) that a fresh file is cleaner.

### Decision 4: Remove `normalizeProvider()`, `confirmRelink()`, multi-account prompt logic

**Choice**: Delete `normalizeProvider()`, `confirmRelink()`, the multi-account interactive branch in `chooseOneDriveAccount()`, and `ensureInteractiveTerminal()` from `provider-selection.ts`.

**Rationale**: With `--provider` gone and multi-account prompting removed, this code has no callers. Keeping dead code increases maintenance burden. The functions that remain (`createOneDriveSelection`, `selectionFromConfig`, `normalizeConfig`, `formatOneDriveSelection`) are still needed by bootstrap and setup.

### Decision 5: `submit` and `status` call `bootstrap()` instead of failing

**Choice**: Replace the "is initialized?" guard in `submit.ts:19-22` and `status.ts:11-14` with a call to `bootstrap()`.

**Rationale**: Users should never see "Run lattix init first" when the system can self-heal. This makes every command self-sufficient.

**Alternative considered**: Keep the guard but change the message to "Run lattix run first." Rejected—auto-bootstrap is strictly better UX.

## Test Strategy

**Test-first approach**: Write failing tests for the new `run` command and `bootstrap` module before implementing them.

**Tests to add:**
1. `run-command.test.js` — `run` command auto-initializes when no config exists (single account detected), then starts the watcher.
2. `run-command.test.js` — `run` command uses existing config when present, skips detection.
3. `bootstrap.test.js` — `bootstrap()` returns config from disk when available.
4. `bootstrap.test.js` — `bootstrap()` detects and selects first account when no config exists.
5. `bootstrap.test.js` — `bootstrap()` picks first account when multiple detected (no prompt).
6. `bootstrap.test.js` — `bootstrap()` throws when no OneDrive detected.

**Tests to remove:**
- `init-command.test.js` — entire file (command deleted).
- `watch-command.test.js` — entire file (command deleted; behavior covered by `run-command.test.js`).
- Multi-account prompt test in `init-command.test.js:160-194` (feature removed).

**Tests to update:**
- Any test referencing `lattix init` or `lattix watch` in CLI help output assertions.

## Risks / Trade-offs

- **[Breaking change]** → Users with existing scripts referencing `lattix init` or `lattix watch` will break. Mitigation: document in README migration section; this is a pre-1.0 tool with a small user base.
- **[No multi-account support]** → Users with both personal and business OneDrive cannot choose. Mitigation: first-detected account is used deterministically; manual config edit is an escape hatch; feature can be restored later with `--reconfigure`.
- **[No relink safety]** → If a user's OneDrive environment changes, `run` will silently pick the first detected account. Mitigation: `setup.ts` already validates existing symlinks and only recreates them if stale; config is only written when missing or when selection changes.
