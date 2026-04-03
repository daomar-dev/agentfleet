## Why

Lattix currently assumes OneDrive for Business is required, which blocks users who only have personal OneDrive available and makes account switching cumbersome. We need to broaden OneDrive support without locking the CLI to a single storage backend so `init` can evolve toward provider-based setup in the future.

## What Changes

- Extend OneDrive detection and initialization to support both OneDrive for Business and personal OneDrive.
- Add a `provider` concept to `init`, defaulting to `onedrive`, so additional sync backends can be introduced later without redesigning the command surface.
- Change `init` account selection behavior so it checks both OneDrive for Business and personal OneDrive, auto-selects when exactly one usable account is present, and prompts the user when multiple usable OneDrive accounts are available.
- Allow `init` to be run repeatedly to switch provider or switch between personal and business OneDrive accounts.
- Require `init` to warn before deleting and recreating existing Lattix symlinks during provider/account switches.
- Update user-facing documentation for the new `init` behavior, provider option, and account switching flow.
- Call out testing updates for CLI option parsing, account selection, re-initialization, and symlink recreation safeguards.

## Capabilities

### New Capabilities
- `provider-selection`: Define provider-aware initialization and account selection behavior for `init`.

### Modified Capabilities
- `onedrive-detection`: Expand OneDrive detection from business-only behavior to support both personal and business accounts, including interactive selection when more than one candidate exists.
- `cli-entrypoint`: Extend `init` command behavior with provider selection, repeatable initialization, and user prompts before destructive relinking.
- `symlink-setup`: Update setup requirements so re-initialization can safely remove and recreate symlinks after explicit user confirmation.

## Impact

- Affected code: `src\cli.ts`, `src\commands\init.ts`, `src\commands\watch.ts`, `src\services\onedrive-detector.ts`, `src\services\setup.ts`, and config types/storage.
- Affected specs: `openspec\specs\onedrive-detection\spec.md`, `openspec\specs\cli-entrypoint\spec.md`, `openspec\specs\symlink-setup\spec.md`, plus a new provider-focused capability spec.
- User impact: `lattix init` gains provider-aware setup, interactive account selection when needed, safer reconfiguration messaging, and README updates for the new workflow.
