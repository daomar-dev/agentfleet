## 1. Account-scoped localStorage

- [x] 1.1 Write tests for account-scoped cache in `web/src/cache.test.ts`: verify `getCache`/`setCache` produce keys containing `homeAccountId`, verify different accounts get isolated entries, verify fallback prefix when no account is signed in
- [x] 1.2 Modify `web/src/cache.ts` to accept an account ID resolver and include the account identifier in all cache and settings keys. Import `getAccount` from `auth.ts` and use `getAccount()?.homeAccountId` as the scope segment. Format: `lattix_{accountId}_cache_{key}` and `lattix_{accountId}_pref_{key}`. Fall back to empty string when no account is available.
- [x] 1.3 Remove stale `sessionStorage` node cache in `web/src/graph.ts:discoverNodes()` — delete the `sessionStorage.getItem('lattix_nodes')` caching to prevent stale data across navigations

## 2. Task loading reliability

- [x] 2.1 Write tests in `web/src/graph.test.ts` for parallel task fetching: test that when `readFileContent` is called for multiple items, failures in some items do not prevent others from being returned
- [x] 2.2 Refactor `web/src/components/home.ts` to use `Promise.allSettled()` for reading task file contents instead of sequential `for...of` loop. Filter for `status: 'fulfilled'` results. When all settle as rejected and items existed, show a toast error and display "Failed to load tasks" message
- [x] 2.3 Refactor `web/src/components/task-list.ts` to use `Promise.allSettled()` for reading task file contents instead of sequential `for...of` loop, with the same error handling pattern as home.ts
- [x] 2.4 Update `renderRecentTasks` in `home.ts` to accept a `loadFailed` flag to distinguish between "no tasks exist" (show "No tasks yet") and "tasks failed to load" (show "Failed to load tasks. Please try again.")
- [x] 2.5 Update `renderList` in `task-list.ts` to similarly distinguish between zero results and load failures

## 3. Node task count display

- [x] 3.1 Change the label in `web/src/components/home.ts:renderNodes()` from `${node.taskCount} task(s) executed` to `${node.taskCount} result(s)` for clarity

## 4. User menu UX

- [x] 4.1 Write tests in `web/src/components/navbar.test.ts` (new file): verify rendered HTML does NOT contain "Switch Account" button, verify a backdrop element is created when dropdown opens
- [x] 4.2 Remove the "Switch Account" button from `web/src/components/navbar.ts`: remove the HTML for `#switch-account-btn`, remove the event listener for `#switch-account-btn`, remove the `switchAccount` import from `auth.ts`
- [x] 4.3 Add a backdrop overlay `<div class="dropdown-backdrop">` in `navbar.ts` that is inserted when the dropdown opens and removed when it closes. Clicking the backdrop closes the dropdown.
- [x] 4.4 Update `web/styles/main.css` mobile dropdown positioning: change `.navbar-user-dropdown` in the `@media (max-width: 768px)` block from `bottom: calc(60px + ...)` to `top: auto; top: calc(var(--safe-top) + 52px); right: var(--spacing-sm); left: var(--spacing-sm);`. Add `.dropdown-backdrop` styles (fixed, full-screen, transparent, z-index: 199).

## 5. Verification

- [x] 5.1 Run `cd web && npm run build` and verify no TypeScript or build errors
- [x] 5.2 Run `cd web && npm test` and verify all tests pass including new tests
- [x] 5.3 Run root `npm run build && npm test` to verify no regressions in the CLI package

## 6. Documentation

- [x] 6.1 Check if `web/` has its own README or if the root README mentions the web dashboard — update any relevant docs to note that the "Switch Account" feature has been removed (users should log out and log in with a different account)
