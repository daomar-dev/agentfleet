## Why

Lattix's `run` command currently runs exclusively in the foreground, tying up a terminal window. Users who want Lattix to run persistently (e.g., on a server or workstation) must manage their own background-process wrappers. Adding a `--daemon` flag lets the process detach from the terminal and run in the background, with a log file for troubleshooting since there is no longer a visible console.

## What Changes

- Add a `--daemon` CLI option to the `run` command that spawns a detached background process and exits the parent immediately.
- Add a `--log-file <path>` CLI option to redirect all console output (stdout and stderr) to a file when running in daemon mode; default to `~/.lattix/lattix.log`.
- Write a PID file (`~/.lattix/lattix.pid`) so users can identify and stop the daemon.
- Prevent launching a second daemon when one is already running (PID-file guard).
- Add a lightweight logging utility that writes timestamped entries to the log file, replacing bare `console.log`/`console.error` calls when running as a daemon.

### Non-goals

- No Windows Service or systemd integration — this is a simple process-detach.
- No log rotation — users can manage log files externally for now.
- No new `stop` or `restart` commands in this change (may follow later).

## Capabilities

### New Capabilities
- `daemon-mode`: Covers the `--daemon` flag, process detach/re-spawn logic, PID-file management, duplicate-instance guard, and log-file output redirection.

### Modified Capabilities
- `cli-entrypoint`: The `run` command gains the `--daemon` and `--log-file` options.

## Impact

- **Code**: `src/commands/run.ts` (new options + daemon logic), `src/cli.ts` (option registration), new `src/services/daemon.ts` and `src/services/logger.ts` modules.
- **Tests**: New tests for daemon spawning, PID-file lifecycle, and log-file writing. Existing `run-command` tests updated to pass the new options through.
- **Dependencies**: Uses only Node.js built-in modules (`child_process`, `fs`, `path`, `os`) — no new npm dependencies.
