## Why

Lattix currently supports two run modes: foreground (interactive terminal) and daemon (detached background process). Both require the user to manually start Lattix after each system reboot. For machines that serve as long-running agent workers, a third mode is needed: installing Lattix as a **Windows Service** that starts automatically on boot and recovers from crashes—without any user intervention.

## What Changes

- Add `lattix install` command that registers Lattix as a Windows Service, starts it immediately, and configures automatic startup on boot with crash recovery.
- Add `lattix uninstall` command that stops the running service and removes the registration.
- Extend single-instance enforcement so all three modes (foreground, daemon, service) are mutually exclusive.
- Enhance `lattix stop` to detect service mode and stop the service via SCM (preserving the registration so it auto-starts on next boot), rather than only supporting PID-based SIGTERM.
- Enhance `lattix status` to display "Windows Service" as the run mode when applicable, querying SCM (`sc query`) for authoritative state.
- Add `node-windows` as a runtime dependency for service lifecycle management.
- Display current version and latest npm version in `status` and `help` output, with upgrade prompt when a newer version is available.

## Capabilities

### New Capabilities
- `windows-service`: Covers Windows Service installation, uninstallation, SCM integration, admin privilege detection, and service-mode single-instance enforcement.

### Modified Capabilities
- `cli-entrypoint`: Add `install` and `uninstall` commands to the CLI.
- `daemon-mode`: Extend single-instance enforcement, `run`, `stop`, and `status` commands to be service-mode aware. The `run` command must resume a stopped service via SCM. The `stop` command must stop the service via SCM (preserving registration). The `status` command must show "Windows Service" mode via SCM query.

## Impact

- **New dependency**: `node-windows` npm package for service registration.
- **Affected code**: `src/cli.ts` (new commands), `src/commands/stop.ts` (service-aware logic), `src/commands/status.ts` (SCM query for mode detection), `src/commands/run.ts` (resume stopped service).
- **New files**: `src/services/windows-service.ts`, `src/services/version-checker.ts`, `src/commands/install.ts`, `src/commands/uninstall.ts`.
- **New directory**: `~/.lattix/app/` — a stable copy of the Lattix package used by the service. Created on `install`, deleted on `uninstall`, updated on re-`install` (upgrade). This ensures compatibility with the `npx`-first workflow where the npx cache path is not stable.
- **Privilege requirement**: `install` and `uninstall` commands require administrator privileges; must detect and report clearly when not elevated.
- **Testing**: Unit tests with mocked `node-windows` Service; integration tests for SCM query parsing. No actual service installation in CI.
