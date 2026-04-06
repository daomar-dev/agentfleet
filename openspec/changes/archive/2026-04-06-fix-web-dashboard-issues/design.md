## Context

The Lattix web dashboard (`web/`) is a single-page application that communicates with Microsoft Graph API to read/write task files in OneDrive. It uses MSAL for authentication and localStorage for caching. The dashboard is used on both desktop and mobile browsers.

Current state of the affected areas:
- **Task loading** (`graph.ts` → `home.ts` / `task-list.ts`): `listTaskFiles()` fetches a directory listing, then each task file's content is read **sequentially** via `readFileContent()`. All errors are silently caught, so if any read fails the task is simply omitted. On mobile with slow connections, this results in timeouts and empty lists.
- **Node discovery** (`graph.ts:discoverNodes()`): Scans all `Lattix/output/` subdirectories and counts `*-result.json` files per hostname. This counts all historical results regardless of when a node was first enrolled.
- **User menu** (`navbar.ts` + `main.css`): On mobile, the dropdown is CSS-positioned at `bottom: calc(60px + safe-area)` (fixed to page bottom) rather than near the trigger button. No backdrop overlay exists.
- **Cache** (`cache.ts`): All keys use a flat `lattix_cache_` / `lattix_pref_` prefix with no account identifier.

## Goals / Non-Goals

**Goals:**
- Task lists load reliably on mobile — users see their tasks or a clear error message.
- Node task counts reflect the actual number of tasks each node has executed.
- The user profile dropdown appears in an intuitive position on mobile with clear dismissal affordance.
- localStorage data is isolated per Microsoft account.

**Non-Goals:**
- Offline support or service worker caching strategy.
- Redesigning the overall mobile layout or navigation.
- Adding real-time task status updates (e.g., WebSocket/polling).
- Changing the CLI-side result file format or task structure.

## Decisions

### D1: Parallel task content fetching with `Promise.allSettled`

**Choice**: Replace the sequential `for...of` + `readFileContent()` loop with `Promise.allSettled()` to fetch all task contents in parallel.

**Rationale**: Sequential fetching of 10-20 files on a mobile connection is the primary cause of the long loading times. `Promise.allSettled` (not `Promise.all`) ensures that individual failures don't abort the entire batch — settled results with `status: 'fulfilled'` are used, others are logged.

**Alternative considered**: Batching in groups of 5. Rejected because Graph API doesn't impose per-second rate limits for read operations at this scale, and parallelism keeps the code simpler.

### D2: Surface errors to the user instead of silently swallowing

**Choice**: When task loading fails completely (zero tasks loaded but items exist in the directory listing), show a toast error message: "Failed to load task details. Please try again." When partial failures occur, show the successfully loaded tasks and log errors to console.

**Rationale**: Users currently see "no tasks" and assume the system is broken. Surfacing errors lets them retry or report the issue.

### D3: Count only result files created after node enrollment

**Choice**: Keep the current `discoverNodes()` approach of scanning `Lattix/output/` result files, but filter by the result file's `lastModifiedDateTime` — only count results whose `lastModifiedDateTime` is within the node's observable activity window (i.e., since the node's earliest known result file).

**Revised approach**: Actually, the simpler and more accurate fix is: the `taskCount` for a node should count the number of distinct task directories where that hostname has a result file. The current code already does this, but the user's concern may stem from old result files from a previous installation. We should use the result file's `lastModifiedDateTime` to only count recent results (e.g., within the last 30 days) OR simply make the label clearer: show "X results" instead of "X tasks executed" and add a time qualifier.

**Final decision**: Change the label to show result count with a time context, and let `discoverNodes()` use only the most recent 50 output directories (which it already does via `$top=50`). The count is accurate for what it measures — each result file IS a task execution. The issue is likely stale data from prior installations. We'll also clear the `sessionStorage` node cache on page refresh to avoid stale counts.

### D4: Mobile dropdown repositioned to top-right with backdrop overlay

**Choice**: On mobile, position the dropdown as `position: fixed; top: <navbar-height>; right: 8px` instead of bottom-anchored. Add a transparent backdrop `<div>` behind the dropdown when open, so the user sees a tappable "close" affordance.

**Alternative considered**: Bottom sheet (sliding up from bottom). Rejected as over-engineering for a small dropdown with only 2 items.

### D5: Remove Switch Account button

**Choice**: Remove the "Switch Account" button from the navbar dropdown and remove the `switchAccount()` export from `auth.ts`. Keep the function code in auth.ts but unexport it, in case it's needed later.

**Rationale**: Users can achieve the same result by logging out and logging back in. The extra button adds confusion.

### D6: Account-scoped localStorage keys

**Choice**: Modify `cache.ts` to accept an account identifier and include it in all cache keys. The identifier will be derived from `getAccount()?.homeAccountId` (a stable MSAL identifier). Format: `lattix_{accountId}_cache_{key}` and `lattix_{accountId}_pref_{key}`.

**Fallback**: If no account is available (pre-login), use the current unscoped prefix. On login, the app naturally re-renders and uses the scoped prefix.

**Cache clearing**: When `getAccount()` returns a different `homeAccountId` than the previously stored one, do NOT clear old data — it will simply be invisible to the current account. This avoids data loss if the user switches back.

**Alternative considered**: Clearing all `lattix_*` keys on logout. Rejected because the user might log back in with the same account and lose their cache.

## Risks / Trade-offs

- **[Parallel fetching may trigger Graph API throttling]** → Mitigation: 10-20 parallel reads are well within Graph API limits (typically hundreds of requests per minute). The existing 429 retry handler in `graphFetch()` provides a safety net.
- **[Account ID not available during first render]** → Mitigation: Cache functions fall back to unscoped prefix; data is re-fetched after login anyway.
- **[Removing Switch Account is a UX regression for multi-account users]** → Mitigation: Logout + re-login achieves the same outcome with one extra step.

## Test Strategy

Tests will be written/updated before implementation using Vitest (web dashboard test framework):

1. **`web/src/cache.test.ts`** (new): Test that `getCache`/`setCache`/`getSetting`/`setSetting` produce account-scoped keys. Test that different account IDs produce isolated caches.
2. **`web/src/components/navbar.test.ts`** (new or update existing): Verify the rendered HTML does NOT contain a "Switch Account" button. Verify backdrop overlay is rendered when dropdown is open.
3. **`web/src/graph.test.ts`** (update): Test that `listTaskFiles` + parallel `readFileContent` handles partial failures correctly (some succeed, some fail → returns successful ones).
4. **Build verification**: `cd web && npm run build` must pass. `cd web && npm test` must pass.

## Open Questions

_(none — all decisions are informed by the existing codebase)_
