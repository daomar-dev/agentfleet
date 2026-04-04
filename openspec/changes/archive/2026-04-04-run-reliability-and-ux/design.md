## Context

Lattix is a distributed agent orchestration CLI that uses OneDrive-synced directories for file-based task coordination. The system watches a shared `~/.lattix/tasks/` directory for new JSON task files and executes them via coding agents.

Three issues have been identified from production usage:

1. **Task replay**: `TaskWatcher.start()` calls `scanExisting()` which processes all tasks not in `processed.json`. On fresh installs, machine migrations, or `processed.json` loss, every historical task replays — potentially hundreds of agent executions.
2. **CLI friction**: Users invoke Lattix via `npx -y lattix <command>`, which is verbose. A shortcut is needed, but must preserve the "always latest" semantics of npx.
3. **Daemon loss after sleep**: The Windows scheduled task triggers only on login. If the daemon dies during sleep/hibernate, it's not restarted until the next login.

Current architecture:
- `TaskWatcher` uses chokidar + polling fallback to detect task files
- `DaemonService` manages PID files and detached process spawning
- `ScheduledTaskManager` creates Windows scheduled tasks with `AtLogOn` trigger
- Single-instance guard prevents duplicate daemons via PID file check

## Goals / Non-Goals

**Goals:**
- Prevent task replay on startup — only process tasks that arrive after the watcher starts
- Provide a `lattix` shortcut command, registered transparently on first `install`/`run` via npx
- Show a friendly submit hint after successful install/run to guide users on submitting tasks
- Restart the daemon after sleep/hibernate without user intervention
- Maintain backward compatibility with existing `processed.json` tracking

**Non-Goals:**
- Changing the task file format or syncing mechanism
- Supporting non-Windows platforms for shortcut registration or scheduled tasks (existing cross-platform behavior unchanged)
- Building a full package auto-updater with rollback
- Auto-updating globally-installed versions (deferred to future iteration)
- Replacing chokidar or changing the fundamental file-watching approach

## Decisions

### Decision 1: Startup timestamp filter for task watcher

**Choice**: Record a `startupTimestamp` (Date.now()) at watcher initialization. In `scanExisting()`, skip any task file whose `mtime` is older than the startup timestamp. New files detected by chokidar events bypass this filter (they are inherently new).

**Alternatives considered**:
- *Mark all existing tasks as processed on startup (方案 A)*: Simpler but permanently marks tasks — if a task genuinely needs reprocessing, it can never be picked up again. Also pollutes `processed.json` with IDs the machine never executed.
- *Remove polling fallback entirely*: Cleaner but risks missing tasks in OneDrive sync scenarios where chokidar events are unreliable.

**Rationale**: The timestamp approach is non-destructive — it doesn't modify `processed.json` for tasks it didn't execute. The polling fallback remains functional for tasks arriving after startup. This is the safest approach for the OneDrive sync use case.

### Decision 2: `.cmd` wrapper in `~/.lattix/bin/`

**Choice**: Only on `install` or `run` commands invoked via npx (detected by checking if `process.argv[1]` contains `_npx`), check:
1. Is `lattix` already globally available? (run `where lattix` and check if it resolves to something outside `_npx` cache)
2. If globally installed → skip wrapper creation (user already has a working `lattix` command)
3. If not globally installed → create `~/.lattix/bin/lattix.cmd` containing `@npx -y lattix %*`, add `~/.lattix/bin` to user PATH via `[Environment]::SetEnvironmentVariable`

After `install` or `run` starts successfully, print a friendly hint showing the submit command. The hint uses `lattix submit` if a shortcut is available (global install detected, or wrapper just created / already existed), otherwise falls back to `npx -y lattix submit`.

This narrow trigger scope (only `install`/`run` via npx) avoids unnecessary overhead on quick commands like `submit` or `status`, and avoids running the check when the user already has a working `lattix` command (global or wrapper).

**Implementation**: New `ShortcutService` class in `src/services/shortcut.ts`. Called from `cli.ts` as a pre-parse hook, gated by: (a) npx detection via script path, (b) command is `install` or `run` (parsed from `process.argv`). The `ensureShortcut()` method returns a result indicating whether a shortcut is available (global install, wrapper created, or wrapper already existed), which is used by the run/install commands to format the submit hint. The check uses a file-based guard (`~/.lattix/bin/lattix.cmd` existence) to avoid redundant work.

**Alternatives considered**:
- *PowerShell profile alias*: Only works in PowerShell, not CMD or other terminals
- *npm install -g on first run*: Would pin a version rather than always fetching latest
- *Global npm link*: Requires the source code to be present locally

### Decision 3: Power-Troubleshooter event trigger for scheduled task

**Choice**: Add a second trigger to the scheduled task that fires on Windows system resume from sleep/hibernate. The event source is `Microsoft-Windows-Power-Troubleshooter` (EventID 1) in the System log.

**Implementation**: Modify `ScheduledTaskManager.install()` to register two triggers:
- `$trigger1`: `AtLogOn` (existing)
- `$trigger2`: Event trigger on System log, source `Power-Troubleshooter`, EventID 1

The `run` command's existing single-instance guard (PID file + process check) ensures that if the daemon is still alive after wake, the triggered run simply exits without starting a duplicate.

**PowerShell for wake trigger**:
```powershell
$trigger2 = New-ScheduledTaskTrigger -AtStartup  # placeholder, overridden below
$trigger2.Subscription = '<QueryList><Query Id="0" Path="System"><Select Path="System">*[System[Provider[@Name=''Microsoft-Windows-Power-Troubleshooter''] and EventID=1]]</Select></Query></QueryList>'
# But CIM-based approach is more reliable:
$class = Get-CimClass MSFT_TaskEventTrigger root/Microsoft/Windows/TaskScheduler
$trigger2 = $class | New-CimInstance -ClientOnly
$trigger2.Enabled = $true
$trigger2.Subscription = '...'
```

**Alternatives considered**:
- *Watchdog polling task*: A separate scheduled task running every 5 minutes to check daemon health. More complex, adds another task to manage.
- *Node.js self-restart*: The daemon detects sleep/wake via `process.hrtime()` gaps and restarts itself. Unreliable — if the process is dead, it can't restart itself.

## Risks / Trade-offs

**[Risk] Timestamp filter misses legitimately new tasks synced with old mtime** → Mitigation: OneDrive typically preserves original mtime. However, the file `add` event from chokidar fires regardless of mtime, so newly synced files will still be caught by the watcher event handler. The timestamp filter only applies to the polling fallback scan. In the worst case, a task synced during a poll interval with an old mtime is picked up on the next chokidar event.

**[Risk] PATH modification requires terminal restart** → Mitigation: After adding to PATH, print a clear message telling the user to restart their terminal. The shortcut works immediately in new terminal sessions.

**[Risk] Wake trigger fires but npx is slow to start** → Mitigation: The VBS launcher runs npx asynchronously. The daemon startup includes bootstrap and single-instance checks that tolerate slow starts. No user-visible impact.

**[Risk] `where lattix` false positive from npx cache** → Mitigation: Filter `where` results to exclude paths containing `_npx` or `npm-cache`. Only count results pointing to global npm bin or user-installed locations.

**[Trade-off] Submit hint may show `lattix submit` before terminal restart** → The wrapper is created but PATH isn't effective until terminal restart. The hint still says `lattix submit` because the wrapper exists and will work after restart. A note about restarting the terminal is printed alongside.

## Test Strategy

### Task watcher startup behavior
- **New test**: Watcher starts with pre-existing task files → none are executed; only files created after start are processed
- **New test**: Polling fallback after startup → only picks up files with mtime > startupTimestamp
- **Modified test**: Update existing startup scan tests to expect the new "skip old tasks" behavior

### Shortcut command registration
- **New test**: When `lattix` is not globally installed and no wrapper exists → wrapper `.cmd` file is created with correct content
- **New test**: When `lattix` is globally installed → wrapper creation is skipped
- **New test**: When wrapper already exists → skip creation entirely
- **New test**: `ensureShortcut()` returns correct shortcut availability status for submit hint formatting

### Submit hint after install/run
- **New test**: After successful `run` start, submit hint is printed using `lattix submit` when shortcut is available
- **New test**: After successful `run` start, submit hint uses `npx -y lattix submit` when no shortcut is available

### Scheduled task wake trigger
- **New test**: `install()` creates a task with both `AtLogOn` and event triggers
- **New test**: Wake trigger subscription XML contains correct Provider and EventID
- **Modified test**: Update existing install tests to verify two triggers instead of one

## Open Questions

None at this time.
