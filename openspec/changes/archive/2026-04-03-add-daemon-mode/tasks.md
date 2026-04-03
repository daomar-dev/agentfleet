## 1. Logger Service

- [x] 1.1 Write tests for `Logger` class: timestamp formatting, file-stream writes, console.log/console.error override and restore (`test/logger.test.js`)
- [x] 1.2 Create `src/services/logger.ts` implementing `Logger` with `setup(filePath)` to redirect console output to a timestamped log file, and `restore()` to undo redirection

## 2. Daemon Service

- [x] 2.1 Write tests for `DaemonService`: PID-file write/read/cleanup, stale-PID detection, duplicate-instance guard, detach spawn argument construction (`test/daemon.test.js`)
- [x] 2.2 Create `src/services/daemon.ts` implementing PID-file management (`writePid`, `readPid`, `removePid`, `isRunning`) and `spawnDetached(args, logFile)` that re-invokes the CLI with `detached: true` and `unref()`

## 3. CLI and Run Command Integration

- [x] 3.1 Update `src/cli.ts` to register `--daemon` and `--log-file <path>` options on the `run` command, and add the internal `--_daemon-child` flag (hidden)
- [x] 3.2 Update `RunOptions` interface and `runCommand` in `src/commands/run.ts` to handle `--daemon` (spawn detached child via `DaemonService`, print PID, exit parent) and `--_daemon-child` (activate `Logger`, write PID file, register PID cleanup on shutdown)
- [x] 3.3 Update existing tests in `test/run-command.test.js` to pass the new options and verify daemon-mode branching logic

## 4. Documentation and Verification

- [x] 4.1 Update `README.md` to document the `--daemon` and `--log-file` options with usage examples
- [x] 4.2 Run `npm run build` and verify no compilation errors
- [x] 4.3 Run `npm test` and verify all tests pass (existing + new)
