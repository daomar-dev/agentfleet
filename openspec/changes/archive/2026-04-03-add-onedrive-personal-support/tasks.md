## 1. Test-first coverage

- [x] 1.1 Add or update CLI tests for `lattix init` so the suite covers `--provider`, the default `onedrive` provider, and unsupported provider errors.
- [x] 1.2 Add detector tests that cover one personal account, one business account, both account types together, and no supported OneDrive accounts.
- [x] 1.3 Add setup/re-initialization tests that cover persisted provider metadata, selected OneDrive target updates, and the confirmation gate before symlinks are deleted and recreated.

## 2. Provider-aware initialization

- [x] 2.1 Update the init command and config types to support provider-aware initialization, default `provider: "onedrive"`, and persisted provider/account metadata.
- [x] 2.2 Refactor `OneDriveDetector` to enumerate supported OneDrive candidates with account metadata instead of returning only the first business path.
- [x] 2.3 Update the `init` flow to auto-select a single detected account, prompt when multiple supported OneDrive accounts exist, and fail clearly when none are available.
- [x] 2.4 Update setup and config-handling paths so repeated `init` runs compare the saved target with the newly selected target and require confirmation before relinking.
- [x] 2.5 Update `watch` and any other setup consumers to reuse the persisted provider/account selection when available and remain compatible with legacy configs.

## 3. Documentation sync

- [x] 3.1 Explicitly review user-facing documentation impact for the provider option, personal-vs-business account selection, and repeated `init` behavior.
- [x] 3.2 Update `README.md` (and any other user-facing docs if needed) to document `lattix init --provider`, the OneDrive account selection flow, and the relink warning during reconfiguration.

## 4. Self-validation

- [x] 4.1 Run `npm run build` and fix any compilation issues introduced by the change.
- [x] 4.2 Run `npm test` and confirm the new and existing automated tests pass.
