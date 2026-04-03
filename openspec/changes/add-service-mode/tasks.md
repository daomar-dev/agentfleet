## 1. Dependencies

- [x] 1.1 Install `node-windows` as a runtime dependency: `npm install node-windows`

## 2. Windows Service Manager

- [x] 2.1 Write tests for `WindowsServiceManager` in `test/windows-service.test.js`: SCM query parsing (running, stopped, not-installed), admin detection, install/uninstall/startService/stopService method calls, copyPackage to ~/.lattix/app/
- [x] 2.2 Create `src/services/windows-service.ts` implementing `WindowsServiceManager` with `install(scriptPath, args, logFile)`, `uninstall()`, `startService()`, `stopService()`, `queryServiceState()`, `isAdmin()`, `copyPackage()`, `removePackageCopy()`, and `WindowsServiceDependencies` interface for testability

## 3. Install Command

- [x] 3.1 Write tests for install command in `test/install-command.test.js`: successful install (copies package + registers service), upgrade path (re-install updates app and restarts), blocked by existing non-service instance, blocked without admin
- [x] 3.2 Create `src/commands/install.ts` implementing the install command: check admin, check single instance (PID + SCM), copy package to `~/.lattix/app/`, register service via `WindowsServiceManager`, handle upgrade (stop → update → restart), print confirmation

## 4. Uninstall Command

- [x] 4.1 Write tests for uninstall command in `test/uninstall-command.test.js`: successful uninstall, not installed, blocked without admin
- [x] 4.2 Create `src/commands/uninstall.ts` implementing the uninstall command: check admin, stop and deregister service via `WindowsServiceManager`, delete `~/.lattix/app/`, clean up PID file, print confirmation

## 5. CLI Registration

- [x] 5.1 Update `src/cli.ts` to register `install` and `uninstall` commands with `--poll-interval` and `--concurrency` options on `install`

## 6. Extend Existing Commands for Service Awareness

- [x] 6.1 Add tests in `test/stop-command.test.js`: stop detects running service and stops it via SCM; stop blocked without admin when service is running
- [x] 6.2 Update `src/commands/stop.ts` to query SCM before killing PID; if service is running, check admin privileges, stop the service via `WindowsServiceManager.stopService()` and clean up PID file
- [x] 6.3 Add test in `test/status-command.test.js`: status shows "Windows Service" mode when SCM reports running
- [x] 6.4 Update `src/commands/status.ts` `showProcessInfo()` to query SCM and display "Windows Service" mode with service name
- [x] 6.5 Add tests in `test/run-command.test.js`: run resumes stopped service via SCM; run blocked when service is already running; run resume blocked without admin
- [x] 6.6 Update `src/commands/run.ts` single-instance check to query SCM: if service registered+stopped → check admin, start service and exit; if service running → block with error

## 7. Version Check

- [x] 7.1 Write tests for version checker in `test/version-check.test.js`: fetches latest version from registry, handles network failure gracefully, compares versions correctly
- [x] 7.2 Create `src/services/version-checker.ts` implementing `checkVersion()`: reads current version from `package.json`, queries npm registry, returns `{ current, latest, updateAvailable }`, gracefully handles offline/timeout
- [x] 7.3 Update `src/commands/status.ts` to call version checker and display version info at the top of status output
- [x] 7.4 Update `src/cli.ts` help output to display version info (e.g., via Commander `addHelpText`)

## 8. Documentation

- [x] 8.1 Update `README.md` with `lattix install` and `lattix uninstall` usage, Windows Service section, administrator privilege note, and version check behavior

## 9. Verification

- [x] 9.1 Run `npm run build` and verify no compilation errors
- [x] 9.2 Run `npm test` and verify all tests pass (existing + new)
