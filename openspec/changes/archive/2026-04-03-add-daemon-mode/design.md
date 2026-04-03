## Context

Lattix is a CLI tool for distributed agent orchestration that runs a file-watching loop in the foreground via `lattix run`. The process must stay alive to detect and execute tasks. Currently, users who want persistent operation must manage their own background wrappers (e.g., `nohup`, `pm2`, or Task Scheduler), which is error-prone and undocumented.

The codebase uses `console.log` / `console.error` throughout all services (`task-watcher.ts`, `agent-executor.ts`, `bootstrap.ts`, etc.) for status output. In daemon mode these calls need to be captured into a log file since there is no attached terminal.

## Goals / Non-Goals

**Goals:**
- Let users start Lattix as a detached background process with a single `--daemon` flag.
- Redirect all output to a log file (`--log-file` configurable, defaults to `~/.lattix/lattix.log`).
- Prevent duplicate daemon instances via a PID file at `~/.lattix/lattix.pid`.
- Enforce single instance across all run modes (foreground and daemon share the same PID-file guard).
- Keep the implementation within Node.js built-in modules — no new npm dependencies.

**Non-Goals:**
- Windows Service or systemd unit management.
- Log rotation or log-level filtering.
- A dedicated `lattix restart` command (future work).
- Changing the default foreground behavior of `lattix run`.

## Decisions

### 1. Daemon via `child_process.spawn` with `detached: true` + `unref()`

**Rationale**: Node.js natively supports detaching a child process. The parent re-spawns itself with an internal `--_daemon-child` flag, then exits. The child inherits all original CLI arguments minus `--daemon`.

**Alternatives considered**:
- *Fork-based*: `cluster.fork()` adds unnecessary IPC complexity.
- *External process manager*: Adds a dependency and defeats the "zero extra deps" goal.

### 2. PID file for single-instance guard (all run modes)

Every `lattix run` invocation — foreground or daemon — checks `~/.lattix/lattix.pid` on startup. If a live process owns the PID file, the new invocation prints an error and exits. Both foreground and daemon child modes write their own PID on start and remove it on shutdown. This prevents any combination of duplicate instances (foreground+foreground, daemon+foreground, daemon+daemon).

**Rationale**: Simple, widely understood pattern. No lock-file or IPC needed. Applying the guard uniformly avoids confusion about which mode "owns" exclusivity.

### 3. Log file via stream redirection

The daemon child opens a writable file stream to the log path and passes it as `stdio: ['ignore', logFd, logFd]` when spawning. A thin `Logger` utility wraps writes with ISO-8601 timestamps and level tags so that existing `console.log` calls produce structured output.

**Rationale**: Redirecting `stdout`/`stderr` at the file-descriptor level captures output from the Node.js process and any child agent processes, without needing to patch every `console.*` call site.

### 4. New modules

| Module | Responsibility |
|--------|---------------|
| `src/services/daemon.ts` | Spawn detached child, PID-file read/write/check, cleanup |
| `src/services/logger.ts` | Timestamped log writer; swaps `console.log`/`console.error` when a log file is active |

These follow the project convention of small, composable service modules.

## Test Strategy

**Test-first approach** — the following test files will be created or updated before implementation:

| Test file | Covers |
|-----------|--------|
| `test/daemon.test.js` | PID-file write/read/cleanup, duplicate-instance guard, detach spawn arguments |
| `test/logger.test.js` | Timestamp formatting, file-stream writes, console override/restore |
| `test/run-command.test.js` (update) | New `--daemon` and `--log-file` options pass through correctly; daemon mode invokes `DaemonService` |

Unit tests will use dependency injection (matching the existing `RunDependencies` pattern) so that no real process spawning is needed in tests.

## Risks / Trade-offs

- **[Cross-platform PID check]** → `process.kill(pid, 0)` works on both Windows and Unix for liveness checks; no platform-specific code needed.
- **[Orphan PID file]** → If the daemon crashes without cleanup, a stale PID file remains. Mitigation: the liveness check (`kill(pid, 0)`) detects dead processes and overwrites the stale file.
- **[Log file growth]** → Without rotation, the log file can grow unbounded. Mitigation: documented as a non-goal; users can truncate or rotate externally. A future change can add rotation.
- **[Agent child output]** → Agent processes spawned by `AgentExecutor` write to their own pipes; their output is captured by the executor, not directly by the daemon's log file. The executor's `console.log` summaries will appear in the log.
