## Context

`lattix init` and `lattix watch` currently depend on `OneDriveDetector.detect()` returning a single OneDrive for Business path. The detector filters out personal accounts, auto-picks the first business account when multiple business folders exist, and gives `SetupService` only a raw path string. `SetupService` can recreate stale symlinks automatically, but it has no confirmation flow for destructive relinking, and `config.json` does not remember which provider or OneDrive account the user intentionally selected.

This change needs to expand OneDrive support to include personal accounts while keeping the CLI aligned with the current file-based architecture. It also needs to create a provider-shaped initialization contract now, without prematurely introducing a full pluggable backend system.

## Goals / Non-Goals

**Goals:**
- Support both OneDrive for Business and personal OneDrive during initialization.
- Add a provider-aware `init` flow with `--provider`, defaulting to `onedrive`.
- Make account choice explicit and persistent so future runs can respect the selected sync root.
- Allow repeated `init` runs for provider/account switches, with a warning before symlinks are deleted and rebuilt.
- Keep the implementation grounded in the existing CLI, detector, setup, and config flows.
- Apply test-first development by defining failing or missing tests before implementation.

**Non-Goals:**
- Adding a second non-OneDrive provider in this change.
- Redesigning task storage outside the existing `~/.lattix` and synced `Lattix` directory model.
- Replacing the current interactive CLI with a GUI or OS-native picker.
- Refactoring every OneDrive-specific identifier in one pass if it is not required for this behavior change.

## Decisions

### 1. Introduce a provider-aware init contract, but keep implementation narrow

`lattix init` will accept `--provider <name>` and default to `onedrive`. The CLI will validate the provider name against a small internal registry that initially contains only `onedrive`.

This keeps the user-facing command surface extensible now, while avoiding speculative abstractions for providers that do not exist yet. Alternatives considered:
- Introduce a general plugin system now: rejected because only OneDrive is supported today and it would add framework code without immediate value.
- Keep `init` OneDrive-only and postpone provider support: rejected because it would force another CLI contract change soon after this feature lands.

### 2. Split account discovery from account selection

`OneDriveDetector` will evolve from “return one business path” to “return structured OneDrive account candidates” with metadata such as account type, display name, and path. `init` will own the selection flow:
- if exactly one usable account exists, auto-select it;
- if more than one usable account exists, prompt the user to choose;
- if none exist, fail with a clear provider-specific error.

This keeps detection reusable and testable, and it avoids hiding selection policy inside the detector. Alternatives considered:
- Keep selection inside `OneDriveDetector`: rejected because interactive prompting in the detector would make testing harder and couple discovery to CLI I/O.
- Always prefer business accounts automatically: rejected because the requested behavior is to allow either personal or business and only prompt when both are present.

### 3. Persist provider and selected account details in local config

`config.json` will store the chosen provider and the selected sync target metadata needed to repeat the setup predictably. The implementation should preserve compatibility with existing configs by defaulting missing provider data to `onedrive`.

To minimize churn, the config can keep the existing `onedrivePath` field for the effective sync root while adding provider/account fields rather than renaming every consumer immediately. Alternatives considered:
- Rename the config to fully generic path names now: rejected because it would broaden this change beyond the requested behavior.
- Store only the path and infer everything else later: rejected because provider/account intent would be lost, especially during re-init and future provider additions.

### 4. Add an explicit destructive relink confirmation step

When `init` would switch provider or selected OneDrive account and the resulting sync target differs from the current config, the CLI will show the current target, explain that existing `~/.lattix` symlinks will be deleted and recreated, and require explicit confirmation before proceeding.

`SetupService` should not silently replace symlinks during an intentional switch initiated by `init`. Instead, `init` should resolve the intended target first, compare it with the stored config, and only call the destructive relink path after confirmation. Alternatives considered:
- Keep the current automatic stale-symlink replacement behavior: rejected because it is too implicit for an intentional provider/account switch.
- Move confirmation into `SetupService`: rejected because the service should remain focused on file operations rather than interactive CLI prompts.

### 5. Reuse the persisted selection in watch mode when available

Although the user request focuses on `init`, the selected provider/account must remain meaningful after setup. `watch` should therefore prefer the stored config/provider selection when a valid config exists, then validate or repair symlinks against that target. Fresh environments can still fall back to detection/setup if no config exists.

This keeps `init` authoritative for account switching without unnecessarily breaking current workflows. Alternative considered:
- Require `init` before every `watch`: rejected because it is a larger CLI behavior shift than needed.

## Test Strategy

Implementation should begin with failing or missing automated tests that cover:
- CLI parsing for `lattix init --provider onedrive` and default provider behavior.
- OneDrive account discovery/selection behavior for one personal account, one business account, and both together.
- Repeated `init` flows that detect a target change and require confirmation before relinking.
- Setup/config persistence for provider metadata and selected sync path.
- README or other user-documentation updates that describe provider selection and re-init behavior.

The preferred testing approach is to extend the existing `node:test` suite with focused tests around CLI help/output, detector selection logic, and `SetupService` re-link behavior. Any interactive selection/confirmation code should be structured behind injectable helpers so tests can exercise the logic without requiring real terminal input.

## Risks / Trade-offs

- **[Risk] Interactive prompts can make automation or non-interactive runs fail unexpectedly.** → Mitigation: only prompt when multiple candidates or destructive relinking require a decision, and fail clearly when a prompt cannot be completed.
- **[Risk] Persisting provider/account metadata increases config shape complexity.** → Mitigation: default legacy configs to `provider: "onedrive"` and keep the current `onedrivePath` field for compatibility in this change.
- **[Risk] `watch` and `init` may diverge if one uses stored config and the other still uses raw detection.** → Mitigation: define the persisted selection as the preferred source of truth whenever config already exists.
- **[Risk] Symlink replacement can destroy the user’s working entry points if confirmation logic is incomplete.** → Mitigation: compare targets before setup, print the exact paths being replaced, and require explicit confirmation before deletion.

## Migration Plan

1. Extend config loading so legacy `config.json` files without provider metadata are treated as `provider: "onedrive"`.
2. Land new tests first for provider parsing, OneDrive candidate selection, and re-init confirmation behavior.
3. Implement provider-aware detection and config persistence.
4. Implement destructive relink confirmation and repeated-init flows.
5. Update README/init guidance to explain personal vs business selection and the reconfiguration warning.
6. Verify with `npm run build` and `npm test`.

Rollback is low risk because the change is local to initialization/config behavior. If rollback is needed, users can rerun `init` after reverting to regenerate symlinks and config with the previous behavior.

## Open Questions

- No open questions at proposal time; the requested provider default, OneDrive account-selection policy, and relink warning behavior are sufficiently specific to proceed.
