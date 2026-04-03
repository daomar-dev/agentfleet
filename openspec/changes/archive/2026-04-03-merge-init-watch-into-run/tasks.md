## 1. Bootstrap Service

- [x] 1.1 Write `test/bootstrap.test.js` with tests: returns existing config, detects single account, picks first of multiple accounts, throws when no OneDrive detected
- [x] 1.2 Create `src/services/bootstrap.ts` implementing the shared bootstrap function that loads config or auto-detects and sets up
- [x] 1.3 Verify bootstrap tests pass: `npm test`

## 2. Simplify Provider Selection

- [x] 2.1 Write tests in `test/provider-selection.test.js` for simplified behavior: `chooseOneDriveAccount` returns first account without prompting when multiple exist
- [x] 2.2 Remove `normalizeProvider()`, `confirmRelink()`, `ensureInteractiveTerminal()`, and the multi-account interactive prompt branch from `src/services/provider-selection.ts`
- [x] 2.3 Simplify `chooseOneDriveAccount()` to always return the first detected account (no interactive prompting)
- [x] 2.4 Verify provider-selection tests pass: `npm test`

## 3. Run Command

- [x] 3.1 Write `test/run-command.test.js` with tests: auto-initializes when no config, uses existing config, starts watcher, respects poll-interval and concurrency options
- [x] 3.2 Create `src/commands/run.ts` that calls `bootstrap()` then starts the task watcher (reuse TaskWatcher, AgentExecutor, ResultWriter)
- [x] 3.3 Verify run command tests pass: `npm test`

## 4. CLI Entrypoint Update

- [x] 4.1 Update `src/cli.ts`: remove `init` and `watch` commands, add `run` command with `--poll-interval` and `--concurrency` options
- [x] 4.2 Delete `src/commands/init.ts` and `src/commands/watch.ts`
- [x] 4.3 Verify build succeeds: `npm run build`

## 5. Auto-bootstrap Submit and Status

- [x] 5.1 Update `src/commands/submit.ts`: replace the "not initialized" guard with a call to `bootstrap()`
- [x] 5.2 Update `src/commands/status.ts`: replace the "not initialized" guard with a call to `bootstrap()`
- [x] 5.3 Verify build succeeds: `npm run build`

## 6. Test Cleanup

- [x] 6.1 Delete `test/init-command.test.js` and `test/watch-command.test.js`
- [x] 6.2 Update any remaining test files that reference `init` or `watch` commands in CLI help assertions
- [x] 6.3 Verify full test suite passes: `npm test`

## 7. Documentation

- [x] 7.1 Update `README.md`: replace all references to `lattix init` and `lattix watch` with `lattix run`, remove `--provider` documentation, update quick start and usage sections
- [x] 7.2 Update error messages and console output in `src/services/setup.ts` that reference `lattix init`

## 8. Final Verification

- [x] 8.1 Run full build and test suite: `npm run build && npm test`
- [x] 8.2 Verify `lattix --help` shows `run`, `submit`, `status` (no `init` or `watch`)
