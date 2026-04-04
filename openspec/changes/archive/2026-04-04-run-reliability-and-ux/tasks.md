## 1. Task Watcher: Skip Old Tasks on Startup

- [x] 1.1 Write tests for new startup behavior: watcher starts with pre-existing task files → none are executed; only files created after start are processed
- [x] 1.2 Write tests for polling fallback: polling only picks up files with mtime > startupTimestamp; ignores pre-existing tasks
- [x] 1.3 Add `startupTimestamp` field to `TaskWatcher` constructor, initialized to `Date.now()` at construction time
- [x] 1.4 Modify `scanExisting()` to filter out task files whose `fs.statSync(filePath).mtimeMs` is less than or equal to `startupTimestamp`
- [x] 1.5 Keep chokidar `add` event handler unchanged (it only fires for genuinely new files due to `ignoreInitial: true`)
- [x] 1.6 Remove the initial `scanExisting()` call from `start()` — the startup scan is no longer needed since we only want post-startup tasks
- [x] 1.7 Update existing task-watcher tests that expect startup scan execution behavior
- [x] 1.8 Verify build passes: `npm run build`
- [x] 1.9 Verify all tests pass: `npm test`

## 2. Scheduled Task: Wake Trigger for Sleep/Hibernate Recovery

- [x] 2.1 Write tests for `install()`: verify the PowerShell command registers both an AtLogOn trigger and a system-wake event trigger with the correct subscription XML
- [x] 2.2 Modify `ScheduledTaskManager.install()` to create a CIM-based event trigger for `Microsoft-Windows-Power-Troubleshooter` EventID 1 alongside the existing AtLogOn trigger
- [x] 2.3 Update the `Register-ScheduledTask` PowerShell command to pass an array of triggers `@($trigger1, $trigger2)`
- [x] 2.4 Update existing scheduled-task tests to expect two triggers
- [x] 2.5 Verify build passes: `npm run build`
- [x] 2.6 Verify all tests pass: `npm test`

## 3. Shortcut Command: Auto-Register lattix CLI Wrapper

- [x] 3.1 Create `src/services/shortcut.ts` with `ShortcutService` class containing: `isNpxInvocation()`, `isGloballyInstalled()`, `wrapperExists()`, `createWrapper()`, `addToPath()`, `ensureShortcut()` methods. `ensureShortcut()` returns a result object indicating whether a shortcut is available (for submit hint formatting).
- [x] 3.2 Write tests for `isNpxInvocation()`: detects `_npx` in script path
- [x] 3.3 Write tests for `isGloballyInstalled()`: detects global install, excludes npx cache paths, handles `where` command failure
- [x] 3.4 Write tests for `createWrapper()`: creates `~/.lattix/bin/lattix.cmd` with correct content, skips if already exists
- [x] 3.5 Write tests for `addToPath()`: adds `~/.lattix/bin` to user PATH via `[Environment]::SetEnvironmentVariable`, skips if already present
- [x] 3.6 Implement `ShortcutService` methods per the spec and design
- [x] 3.7 Write tests for `ensureShortcut()` integration: full flow — checks global install, creates wrapper, returns shortcut availability status
- [x] 3.8 Hook `ShortcutService.ensureShortcut()` into `cli.ts`, gated by two conditions: (a) script path contains `_npx` (npx invocation), (b) command is `install` or `run` (parsed from `process.argv`). Store the result for use by run/install commands.
- [x] 3.9 Add friendly submit hint to `run` command output (after "Lattix is running" message): print `lattix submit --prompt "..."` if shortcut available, else `npx -y lattix submit --prompt "..."`
- [x] 3.10 Add friendly submit hint to `install` command output (after "Lattix started" message): same logic as run
- [x] 3.11 Verify build passes: `npm run build`
- [x] 3.12 Verify all tests pass: `npm test`

## 4. Documentation and Final Verification

- [x] 4.1 Update README.md: document the `lattix` shortcut command, explain that it auto-registers on first use, and note the terminal restart requirement
- [x] 4.2 Update README.md: document the sleep/hibernate recovery behavior for the scheduled task
- [x] 4.3 Update README.md: note the startup behavior change (old tasks are no longer replayed)
- [x] 4.4 Full build and test verification: `npm run build && npm test`
- [ ] 4.5 Manual smoke test: run `npx -y lattix run` with pre-existing tasks and confirm none are replayed
