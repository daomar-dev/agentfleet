## Why

Three critical reliability and usability issues were identified from real-world testing of Lattix v1.1.x:

1. **Task replay on startup (Critical)**: When `lattix run` starts, it scans and executes all existing task files not in `processed.json`. This causes massive replay of old tasks — especially problematic on new machines, after `processed.json` loss, or after system reinstall. The agent should only process tasks that arrive *after* startup.
2. **CLI invocation friction**: Users must type `npx -y lattix <command>` every time, which is verbose and error-prone. A simpler `lattix` shortcut should be available while still ensuring the latest version is always used.
3. **Daemon lost after sleep/hibernate**: The scheduled task only triggers on login (`AtLogOn`). If the computer sleeps or hibernates and the Node.js daemon process dies, there is no mechanism to restart it until the next login.

## What Changes

- **Task watcher startup behavior**: Instead of executing existing unprocessed tasks on startup, the watcher records a startup timestamp and only processes tasks whose file modification time is *after* that timestamp. Existing tasks are silently marked as known. The polling fallback also respects this timestamp filter.
- **Shortcut command registration**: When the `install` or `run` command is invoked via npx (detected by the script path containing `_npx`), the system checks whether a global `lattix` command is already available. If not, it creates a `lattix.cmd` wrapper in `~/.lattix/bin/` that delegates to `npx -y lattix %*`, and adds that directory to the user's PATH. This provides a convenient `lattix` alias that always fetches the latest version. Other commands (e.g., `submit`, `status`) skip this check entirely.
- **Friendly submit hint after install/run**: After `install` or `run` starts successfully, the system prints a friendly hint showing the user how to submit tasks (e.g., `lattix submit --prompt "..."` or `npx -y lattix submit --prompt "..."`), choosing the appropriate form based on whether a `lattix` shortcut is available (global install or wrapper created).
- **Sleep/hibernate recovery trigger**: The scheduled task registration adds an additional event-based trigger that fires when Windows resumes from sleep or hibernation (System log, Power-Troubleshooter, EventID 1). Combined with the existing single-instance guard in `run`, this safely restarts the daemon only when it has died.

## Capabilities

### New Capabilities
- `shortcut-command`: Automatic registration of a `lattix` CLI shortcut via a `.cmd` wrapper in `~/.lattix/bin/`, with PATH management and global-install detection. Includes a friendly submit hint after successful install/run.

### Modified Capabilities
- `task-watcher`: Startup scan behavior changes from "execute unprocessed tasks" to "mark existing tasks as known; only process tasks arriving after startup timestamp".
- `scheduled-task`: Add a system-wake event trigger (Power-Troubleshooter EventID 1) alongside the existing AtLogOn trigger for daemon recovery after sleep/hibernate.

## Impact

- **Code**: `src/services/task-watcher.ts` (startup scan logic), `src/services/windows-service.ts` (trigger registration), new shortcut registration service, CLI entrypoint hook.
- **Tests**: Existing task-watcher tests need updating for the new startup behavior. New tests for shortcut detection, wrapper creation, and wake-trigger registration.
- **User experience**: Eliminates task replay; simplifies CLI invocation; improves daemon reliability on laptops and desktops that frequently sleep.
- **Breaking**: The change to startup scan behavior is intentionally breaking — old tasks will no longer auto-execute on a fresh start. This is the desired fix.
