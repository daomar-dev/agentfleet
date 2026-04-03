## Context

Lattix currently supports two run modes: **foreground** (interactive, dies with terminal) and **daemon** (detached process, survives terminal close). Both are managed via PID files at `~/.lattix/lattix.pid` with single-instance enforcement.

For long-running agent workers, a third mode is needed: **Windows Service**—auto-starts on boot, recovers from crashes, managed by the Windows Service Control Manager (SCM).

The primary usage model for Lattix is via `npx lattix <command>`, which always runs the latest published version. This creates a challenge for service mode: `npx` stores packages in a cache directory with hash-based paths that may change between versions or cache cleanups, making them unsuitable as a stable service script path.

The existing architecture uses dependency injection throughout (`RunDependencies`, `DaemonDependencies`, `StopDependencies`) making it straightforward to extend commands with service-awareness.

## Goals / Non-Goals

**Goals:**
- Install Lattix as a Windows Service via `lattix install`, auto-started and crash-recoverable
- Uninstall cleanly via `lattix uninstall` (stop + deregister)
- Mutual exclusion across all three run modes (foreground, daemon, service)
- `status` command shows "Windows Service" mode when applicable (via SCM query)
- `stop` command detects service mode and stops the service via SCM (keeps registration for auto-start on boot)
- Administrator privilege detection with clear error messaging

**Non-Goals:**
- Linux/macOS service support (systemd, launchd) — Windows only for now
- Configurable service name — fixed as "Lattix"
- GUI service manager — CLI only

## Decisions

### Decision 1: Use `node-windows` for service lifecycle

**Choice**: Use the `node-windows` npm package to register, start, stop, and uninstall the Windows Service.

**Alternatives considered**:
- **WinSW / nssm**: More mature, but require distributing additional binary executables. Adds deployment complexity.
- **Direct `sc.exe` calls**: No dependency, but requires implementing the Windows Service protocol (service entry point, SCM handshake) which Node.js cannot do natively.

**Rationale**: `node-windows` wraps a generated `.exe` stub that handles the SCM protocol and launches the Node.js script. It's ~3000 stars, maintained by the nvm-windows author, and the Windows Service API itself is extremely stable. Our usage is minimal (install/uninstall), so low maintenance risk.

### Decision 2: Copy package to `~/.lattix/app/` for stable service path

**Choice**: When `lattix install` runs, the command SHALL copy the entire Lattix package (from the currently executing location, whether npx cache or global install) to `~/.lattix/app/`. The Windows Service is registered to execute `node ~/.lattix/app/dist/cli.js run --_daemon-child --log-file <path>`. This reuses the existing daemon-child code path (PID file write, logger setup, watcher startup) without any service-specific branching in `run.ts`.

**Re-running `lattix install` acts as an upgrade**: If the service is already registered, the command SHALL stop the service, overwrite `~/.lattix/app/` with the current version, and restart the service.

**`lattix uninstall` cleans up**: Stops the service, removes the SCM registration, and deletes `~/.lattix/app/`.

**Alternatives considered**:
- **Use npx cache path directly**: Unreliable — hash-based paths change between versions and cache cleanups.
- **Auto `npm install -g`**: Modifies user's global npm environment without consent. Also doesn't guarantee latest version on each `npx` invocation.
- **Resolve `process.argv[1]` at install time**: Works for global installs but breaks for npx users (the primary use case).

**Rationale**: `~/.lattix/app/` is a stable, self-contained copy under Lattix's own data directory. It's consistent with the existing `~/.lattix/` layout and fully compatible with the npx-first workflow. Maximum code reuse — the service just runs the copied CLI script in daemon-child mode.

### Decision 3: SCM query for service-mode detection

**Choice**: Use `sc query Lattix` to determine if a "Lattix" service exists and its state (RUNNING, STOPPED, etc.). This is used by `run`, `status`, and `stop` commands.

**Alternatives considered**:
- **Marker file** (`~/.lattix/service-installed`): Simpler but can get out of sync if the service is removed externally (e.g., via `sc delete`).
- **Environment variable**: Set by the service wrapper, but fragile across process boundaries.

**Rationale**: SCM is the authoritative source for service state. `sc query` doesn't require admin privileges and returns structured output parseable with a simple regex.

### Decision 4: New `WindowsServiceManager` service class

**Choice**: Create `src/services/windows-service.ts` with a `WindowsServiceManager` class encapsulating all `node-windows` and `sc query` interactions. Follows the existing DI pattern with a `WindowsServiceDependencies` interface for testability.

**Key methods**:
- `install(scriptPath, args, logFile)` — Register and start service
- `uninstall()` — Stop and deregister service
- `startService()` — Start a registered but stopped service (used by `run` command)
- `stopService()` — Stop a running service without removing registration (used by `stop` command)
- `queryServiceState()` — Returns `'running' | 'stopped' | 'not-installed'`
- `isAdmin()` — Checks if current process has admin privileges
- `copyPackage(targetDir)` — Copy the Lattix package to a stable directory
- `removePackageCopy(targetDir)` — Delete the copied package directory

### Decision 5: `run` command resumes stopped services

**Choice**: When `lattix run` (with or without `--daemon`) detects a registered but stopped "Lattix" service via SCM, it SHALL start the service via SCM and exit, rather than launching a new foreground/daemon process. This keeps the run mode consistent—once installed as a service, `run` always operates through the service.

**Rationale**: Avoids confusing state where a service is registered but a separate foreground/daemon process is running. The user's intent is clear: "start Lattix". If they installed it as a service, that's how it should run.

### Decision 6: Service MUST run under the current user's account

**Choice**: The Windows Service SHALL be configured to run under the current user's account by using the node-windows default behavior (omit the `user` configuration field). This requires NO password input.

**Why SYSTEM doesn't work**:
- `os.homedir()` for SYSTEM resolves to `C:\Windows\system32\config\systemprofile`, not the user's home. All `~/.lattix/` paths (config, PID, symlinks) would be wrong.
- OneDrive sync runs in the user's session. Files written by SYSTEM to the OneDrive folder may not sync if the user isn't logged in.

**Implementation**: node-windows defaults to the current user when no `user` field is set in the Service configuration. Since `lattix install` is already run with admin privileges, the service will be registered under that user automatically.

### Decision 7: Admin privilege detection

**Choice**: Check admin privileges by attempting to read from `\\.\PHYSICALDRIVE0` or by running `net session` and checking the exit code. Display a clear error message if not elevated.

**Rationale**: Standard lightweight check. No additional dependencies needed.

### Decision 8: Version check via npm registry

**Choice**: Always query `https://registry.npmjs.org/lattix/latest` to fetch the latest published version. Compare with the current CLI version from `package.json`. Display both in `status` and `help` output, with an upgrade prompt if the current version is behind. This covers all usage patterns (npx, global install, service mode) uniformly. If the registry is unreachable (offline, timeout), gracefully show only the current version without failing.

**Rationale**: Lightweight single HTTP GET to a public API. No authentication needed. Helps users know when to upgrade, especially important for service mode where the running copy in `~/.lattix/app/` may fall behind.

## Risks / Trade-offs

**[Risk] node-windows creates a `.exe` stub on disk** → The generated service executable is stored alongside the script. This is expected behavior and documented by node-windows. The `uninstall` command cleans it up.

**[Risk] Admin privilege requirement creates UX friction** → Mitigation: Clear error message with instructions: "Run this command as Administrator" or "Right-click terminal → Run as administrator".

**[Risk] `sc query` output format varies by Windows locale** → Mitigation: Parse the `STATE` line using the numeric state code (e.g., `4 RUNNING`) which is locale-independent.

**[Trade-off] node-windows dependency** → Adds ~50KB to node_modules. Acceptable given it eliminates the need to distribute or download external binaries.

## Test Strategy

**Test-first approach**: Write failing tests before implementation for each new module.

### Tests to add before implementation

**`test/windows-service.test.js`** (new, ~8 tests):
- `install()` calls node-windows Service.install with correct script path and args
- `install()` exits with error when not admin
- `install()` exits with error when service already installed
- `uninstall()` calls node-windows Service.uninstall
- `uninstall()` exits with error when service not installed
- `queryServiceState()` parses "RUNNING" state from sc query output
- `queryServiceState()` parses "STOPPED" state
- `queryServiceState()` returns "not-installed" when service doesn't exist

**`test/install-command.test.js`** (new, ~4 tests):
- Successful install copies package to ~/.lattix/app/ and registers service
- Install blocked when another non-service instance running (PID file exists with live process)
- Install blocked when not admin
- Re-install (upgrade) stops service, updates ~/.lattix/app/, restarts service

**`test/uninstall-command.test.js`** (new, ~3 tests):
- Successful uninstall prints confirmation
- Uninstall when service not installed shows informational message
- Uninstall blocked when not admin

**`test/stop-command.test.js`** (update, +1 test):
- Stop detects service mode and stops the service via SCM

**`test/status-command.test.js`** (update, +1 test):
- Status displays "Windows Service" mode when SCM reports running

**`test/version-check.test.js`** (new, ~3 tests):
- Fetches latest version from npm registry and compares with current
- Handles network failure gracefully (returns current version only)
- Correctly identifies when update is available

All tests use dependency injection to mock `node-windows` and `sc query` — no actual service installation in tests.

