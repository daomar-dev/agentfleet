## Why

The Lattix web dashboard is unusable on mobile devices. Task lists (both "Recent Tasks" on the home page and the "All Tasks" page) never display content — they show a loading spinner for an extended period and then fall back to "no tasks" / "no tasks found," even though tasks exist in OneDrive. Additionally, node task counts are inaccurate, the user profile dropdown is poorly positioned on mobile, and localStorage-cached data is not scoped to the signed-in account, causing data leakage when switching users.

## What Changes

- **Fix task loading reliability**: Replace sequential `readFileContent()` calls with parallel fetching, add proper error handling instead of silently swallowing failures, and surface meaningful error messages when tasks cannot be loaded.
- **Fix node task count accuracy**: Change `discoverNodes()` to count only tasks that were actually assigned to each node after it was registered, rather than counting all historical result files.
- **Improve mobile user menu UX**: Reposition the user profile dropdown on mobile so it appears near the trigger button (top-right) instead of at the page bottom. Add a backdrop overlay so users understand they can tap outside to dismiss. Remove the "Switch Account" button — users can log out and log in with a different account instead.
- **Scope localStorage by account**: Key all cache and settings entries in localStorage with the signed-in user's account identifier, so that switching accounts does not expose stale data from another user.

## Capabilities

### New Capabilities

- `web-task-loading`: Covers how the web dashboard fetches, caches, and displays task lists from OneDrive, including error handling, parallelism, and loading states.
- `web-user-menu`: Covers the user profile dropdown behavior, positioning, dismissal UX, and available actions (logout only, no switch-account).
- `web-account-cache`: Covers how the web dashboard scopes localStorage cache and settings to the currently signed-in Microsoft account.

### Modified Capabilities

_(none — no existing specs cover web dashboard behavior)_

## Impact

- **Code**: `web/src/graph.ts` (task fetching, node discovery), `web/src/components/home.ts` and `web/src/components/task-list.ts` (rendering), `web/src/components/navbar.ts` (user menu), `web/src/cache.ts` (localStorage scoping), `web/src/auth.ts` (remove `switchAccount` export).
- **CSS**: `web/styles/main.css` (mobile dropdown positioning, overlay).
- **Testing**: New or updated Vitest tests for cache scoping, task loading error handling, and navbar rendering.
- **User-facing**: Mobile users will see task data load reliably; dropdown menu will appear in the expected position; "Switch Account" button will be removed.
