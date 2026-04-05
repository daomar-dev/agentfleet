## Context

Lattix is a CLI-only distributed agent orchestrator that coordinates work across machines via OneDrive-synced directories. Task files (JSON) live in `<OneDrive>/Lattix/tasks/`, result files in `<OneDrive>/Lattix/output/<taskId>/<HOSTNAME>-result.json`. There is no server — all state is in files on OneDrive.

The web dashboard adds a browser-based UI that reads and writes these same files via Microsoft Graph API, authenticated through Microsoft Entra ID (Azure AD). It is deployed as static files on GitHub Pages with no backend.

## Goals / Non-Goals

**Goals:**
- Authenticate users via Microsoft Entra ID (MSAL.js), supporting both personal Microsoft accounts and work/school accounts
- Read task files and result files from OneDrive via Microsoft Graph API
- Display enrolled nodes (machines) discovered from result file hostnames
- Display task history with per-machine execution results
- Allow task submission by writing task JSON to OneDrive via Graph API, with input sanitization and restricted fields
- Show onboarding guidance when no nodes/tasks exist, including account mismatch detection
- Deliver a PWA experience: installable, responsive, fast on mobile with paginated data loading
- Deploy via GitHub Pages using GitHub Actions workflow — no build artifacts committed to the repo
- Apply defense-in-depth security: CSP headers, session-scoped token storage, input sanitization

**Non-Goals:**
- No server-side logic, API proxy, or database
- No real-time updates (polling/manual refresh only)
- No changes to existing CLI code or file formats
- No custom domain DNS automation (CNAME record is a one-time manual step in Cloudflare Dashboard)
- No offline-first data caching (network required for Graph API)

## Decisions

### Decision 1: Vanilla TypeScript + Vite — no heavy framework

**Choice**: Build the SPA with vanilla TypeScript, a hash-based router, and a lightweight component pattern. Use Vite as the build/dev tool.

**Rationale**: The user explicitly requires a lightweight, performant, compatible web app. The dashboard has only 3–4 views (home/nodes, task list, task detail, submit form). A full framework (React, Vue) adds 30–100KB of runtime for minimal benefit. Vanilla TS with modern DOM APIs keeps the bundle under 50KB (excluding MSAL). Vite provides fast HMR during development and optimized production builds.

**Alternatives considered**:
- *Preact*: ~3KB runtime, React-compatible — reasonable but adds an unnecessary abstraction layer for this simple app
- *React/Vue*: Too heavy for the stated lightweight requirement
- *Plain HTML/JS without build tool*: No TypeScript support, no tree-shaking, harder to manage dependencies

### Decision 2: MSAL.js with SPA redirect flow

**Choice**: Use `@azure/msal-browser` with the authorization code flow (PKCE). The user provides an Entra ID app registration with redirect URI pointing to the GitHub Pages URL. The app requests `Files.Read` and `Files.ReadWrite` scopes for OneDrive access via Microsoft Graph.

**Configuration**: The Entra ID client ID is stored in a `config.js` file in the `web/public/` directory (copied to build output by Vite). The client ID is auto-populated during the Entra ID app registration step (via `az` CLI). The redirect URI defaults to `https://lattix.code365.xyz/`.

**Token scopes**:
- `Files.Read` — read task files and result files
- `Files.ReadWrite` — write new task files for submission
- `User.Read` — get user display name for the UI

**Alternatives considered**:
- *Popup flow*: Blocked by many mobile browsers; redirect is more reliable
- *Device code flow*: Not suitable for SPA — requires polling and is designed for input-limited devices

### Decision 3: Microsoft Graph API for OneDrive file access

**Choice**: Use Microsoft Graph REST API (`https://graph.microsoft.com/v1.0`) to access OneDrive files. Key endpoints:

- **List tasks**: `GET /me/drive/root:/Lattix/tasks:/children` — returns all task JSON files
- **Read task**: `GET /me/drive/items/{id}/content` — download individual task file content
- **List task results**: `GET /me/drive/root:/Lattix/output/{taskId}:/children` — list result files for a task
- **Read result**: `GET /me/drive/items/{id}/content` — download result file content
- **Submit task**: `PUT /me/drive/root:/Lattix/tasks/{filename}:/content` — create new task file

No SDK dependency — use `fetch()` with the MSAL access token in the `Authorization` header. This keeps the bundle minimal.

**Node discovery**: Scan all result files across all task output directories. Extract unique hostnames from filenames matching the pattern `<HOSTNAME>-result.json`. Each unique hostname represents a known Lattix node.

**Alternatives considered**:
- *Microsoft Graph JS SDK*: Adds ~50KB to bundle; raw fetch is sufficient for our simple read/write operations
- *OneDrive REST API directly*: Deprecated in favor of Microsoft Graph

### Decision 4: Hash-based SPA routing

**Choice**: Use `window.location.hash` for client-side routing (e.g., `#/`, `#/tasks`, `#/tasks/:id`). A minimal custom router (~50 lines) handles route matching and view rendering.

**Rationale**: GitHub Pages serves only `index.html`. Path-based routing (e.g., `/tasks/123`) would return 404 for any non-root path. Hash routing works natively without server-side rewrites or 404.html hacks.

**Routes**:
- `#/` — Home: node list + task summary + submit form
- `#/tasks` — Full task list with filters
- `#/tasks/:id` — Task detail with per-machine results
- `#/settings` — Default agent preference and about info

### Decision 5: PWA with service worker and web app manifest

**Choice**: Include a `manifest.json` for installability and a service worker for app shell caching.

**Manifest**: Configures app name ("Lattix"), icons, theme color, display mode (`standalone`), start URL, and orientation.

**Service worker strategy**:
- Cache the app shell (HTML, CSS, JS, icons) on install
- Network-first for Graph API calls (always fetch fresh data)
- Cache-first for static assets (app shell files)
- No offline data access (Graph API requires network)

**Icons**: Generate from existing `assets/icon.svg` in multiple sizes (192×192, 512×512) as PNG for the manifest.

### Decision 6: Project structure — `web/` source, GitHub Actions deploy

**Choice**:
```
web/                          # SPA source code
├── src/
│   ├── index.ts              # Entry point
│   ├── auth.ts               # MSAL authentication
│   ├── cache.ts              # Stale-while-revalidate localStorage cache
│   ├── graph.ts              # Microsoft Graph API client
│   ├── router.ts             # Hash-based SPA router
│   ├── sanitize.ts           # Input sanitization for task submission
│   ├── components/           # View components
│   │   ├── home.ts           # Home view (nodes + tasks + submit)
│   │   ├── login.ts          # Login prompt for unauthenticated users
│   │   ├── navbar.ts         # Top nav bar + mobile bottom tab bar
│   │   ├── task-list.ts      # Task list view
│   │   ├── task-detail.ts    # Task detail view
│   │   └── settings.ts       # Settings view (default agent, about)
│   ├── types.ts              # Shared TypeScript types
│   └── utils.ts              # Helpers (date formatting, etc.)
├── public/
│   ├── index.html            # SPA shell (includes CSP meta tag)
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   ├── config.js             # Entra ID config (client ID populated at build)
│   ├── favicon.svg           # SVG favicon
│   ├── CNAME                 # Custom domain for GitHub Pages
│   └── icons/                # PWA icons
├── styles/
│   └── main.css              # Responsive CSS
├── package.json              # Web-specific dependencies
├── vite.config.ts            # Vite build config
└── tsconfig.json             # TypeScript config for web

.github/workflows/
└── deploy-pages.yml          # GitHub Actions workflow for Pages deployment
```

**Build artifacts are NOT committed to the repo.** A GitHub Actions workflow (`deploy-pages.yml`) handles the full pipeline:
1. Triggers on push to `main` (when `web/` files change)
2. Installs dependencies and runs `npm run build` in `web/`
3. Uses `actions/upload-pages-artifact` to package the Vite output
4. Uses `actions/deploy-pages` to publish to GitHub Pages

This is the officially recommended GitHub Pages deployment method. The root `package.json` gets new scripts: `web:dev`, `web:build` (for local development only).

### Decision 7: Responsive design approach

**Choice**: CSS-only responsive design using CSS custom properties, flexbox, grid, and media queries. No CSS framework.

**Breakpoints**:
- `≤480px` — Phone: single column, stacked layout, larger touch targets
- `481–768px` — Tablet: two-column where appropriate
- `≥769px` — Desktop: full layout with top horizontal navigation

**Mobile navigation**: On screens ≤768px, the desktop top navigation links are hidden and replaced with a fixed bottom tab bar featuring SVG icons for Home, Tasks, and Settings. The user account dropdown remains in the top right. Safe area insets (`env(safe-area-inset-top/bottom)`) are applied to prevent PWA standalone mode from overlapping with the status bar or home indicator.

**Touch targets**: All interactive elements ≥ 44×44px per Apple HIG / Material guidelines.

**Performance budget**: Total bundle < 100KB gzipped (excluding MSAL ~35KB). First meaningful paint < 2s on 3G.

## Risks / Trade-offs

**[Risk] Command injection via web-submitted prompts** → Mitigation: The web UI sanitizes prompt text (escape shell metacharacters). The optional agent command field is available for power users but does not expose `workingDirectory`. Defense-in-depth on top of the CLI's existing `JSON.stringify()` quoting. See Decision 11.

**[Risk] Token exposure via XSS** → Mitigation: MSAL tokens stored in `localStorage` for PWA persistence. Strict CSP meta tag restricts script sources. No inline scripts. Login uses redirect flow only (no popup). See Decision 12.

**[Risk] Account mismatch — user logs in with wrong Microsoft account** → Mitigation: Dashboard probes `Lattix/` path on login. If missing, shows guidance about signing in with the correct account. "Switch account" option available in navbar. See Decision 14.

**[Risk] Entra ID app registration required** → Mitigation: The app is auto-created via `az` CLI during infrastructure setup (task 1.1). The client ID is committed to `web/public/config.js`. Users only need to consent to permissions on first login.

**[Risk] Graph API rate limiting** → Mitigation: Conservative pagination (20 items/page), lazy loading, no auto-polling. Structured error handling with `Retry-After` support. See Decision 13.

**[Risk] Large number of tasks/results may slow listing** → Mitigation: Server-side pagination with `@odata.nextLink`. Only fetch recent tasks by default. Lazy-load result details on task click. Cache node list in sessionStorage. See Decision 15.

**[Risk] Concurrent task submission collision** → Mitigation: Task IDs use 8 bytes of `crypto.getRandomValues()` randomness. Graph API `@microsoft.graph.conflictBehavior: fail` header detects collisions. Auto-retry with new ID (up to 3 times). See Decision 11.

**[Risk] OneDrive path `Lattix/` may not exist yet** → Mitigation: If the path doesn't exist, show onboarding guidance explaining how to install and run Lattix CLI first. The dashboard does not create the OneDrive directory structure — that's the CLI's job.

**[Trade-off] No offline support** → Graph API requires network. The service worker caches only the app shell, not data. This is acceptable because the dashboard's value is in showing live state.

**[Trade-off] Build artifacts not in repo** → Developers cannot simply browse `docs/` to see the built app. But this is the standard GitHub Pages + Actions pattern, keeps the repo clean, and avoids merge conflicts on generated files.

**[Trade-off] Hostname privacy** → Result files expose machine hostnames. This is inherent in the existing CLI architecture (hostnames are used for result file naming). The web dashboard displays them as-is. A future enhancement could allow users to configure display aliases in `config.json`, but this is out of scope for the initial release.

## Test Strategy

### Authentication flow
- **Unit test**: MSAL configuration is correctly initialized with provided client ID and scopes
- **Unit test**: Auth token is attached to Graph API requests
- **Unit test**: Login redirect and token acquisition succeed (mocked MSAL)
- **Unit test**: Unauthenticated state shows login prompt
- **Unit test**: Token expiry triggers silent refresh; if silent fails, redirects to login
- **Unit test**: `cacheLocation` is set to `localStorage` (for PWA persistence)

### Account validation
- **Unit test**: After login, probe `Lattix/` path — if 404, show onboarding with account mismatch hint
- **Unit test**: If `Lattix/` exists, proceed to load nodes and tasks
- **Unit test**: "Switch account" triggers `loginRedirect` with `prompt: 'select_account'`

### Graph API data layer
- **Unit test**: Task file list parsing — JSON responses mapped to typed TaskFile objects
- **Unit test**: Result file discovery — hostnames correctly extracted from filename pattern
- **Unit test**: Node list aggregation — unique hostnames collected from all result files
- **Unit test**: Task submission — correct JSON payload and Graph API PUT call
- **Unit test**: Error handling for missing `Lattix/` directory (404 from Graph)
- **Unit test**: Pagination — `@odata.nextLink` followed for multi-page results
- **Unit test**: Error handling — 401 triggers token refresh, 429 respects `Retry-After`, 403 shows consent message, 5xx shows retry button
- **Unit test**: Conflict behavior — `@microsoft.graph.conflictBehavior: fail` header sent on task PUT; collision triggers ID regeneration and retry

### Input sanitization
- **Unit test**: Shell metacharacters (`; | & $ \` \\ > < ( )`) in prompt are escaped/rejected
- **Unit test**: Submitted task JSON does not contain `workingDirectory` field; `command` field is included only when explicitly provided
- **Unit test**: Title is truncated to 100 characters
- **Unit test**: Prompt is rejected if exceeds 10,000 characters
- **Unit test**: Task ID uses `crypto.getRandomValues()` for sufficient entropy

### Router
- **Unit test**: Hash routes correctly dispatch to view components
- **Unit test**: Route parameters (`:id`) are extracted correctly
- **Unit test**: Unknown routes fall back to home

### View rendering
- **Unit test**: Home view renders node list when nodes exist
- **Unit test**: Home view renders onboarding message when no nodes/tasks
- **Unit test**: Home view onboarding includes account mismatch guidance
- **Unit test**: Task list renders task items with status badges
- **Unit test**: Task list pagination — "Load more" button fetches next page
- **Unit test**: Task detail renders per-machine results
- **Unit test**: Submit form exposes title, prompt, and optional agent command fields
- **Unit test**: Submit form validates input before submission

### Security
- **Unit test**: CSP meta tag is present in index.html with correct directives
- **Unit test**: No inline scripts in index.html
- **Manual test**: Verify CSP blocks unauthorized script sources in browser console

### PWA
- **Unit test**: Service worker registers successfully
- **Unit test**: Manifest is valid and includes required fields
- **Integration test**: App installable in browser (manual verification)

### Responsive design
- **Manual test**: Layout verified at phone (375px), tablet (768px), desktop (1280px) widths
- **Manual test**: Touch targets meet 44×44px minimum on mobile
- **Manual test**: PWA install works on iOS Safari and Android Chrome

## Open Questions

None — the user's requirements are clear. Infrastructure (Entra ID, GitHub Pages, DNS) is fully automated via CLI.

## Infrastructure Decisions

### Decision 8: Entra ID app registration via `az` CLI

**Choice**: Use `az ad app create` to register a multi-tenant SPA application in tenant `91dde955-43a9-40a9-a406-694cffb04f28`. The app is configured with:

- **Supported account types**: `AzureADandPersonalMicrosoftAccount` (multi-tenant + personal) — required because Lattix supports both OneDrive for Business and personal OneDrive
- **SPA platform redirect URIs**: `https://lattix.code365.xyz/` and `http://localhost:5173/` (for local dev)
- **API permissions**: `Microsoft Graph` — `Files.Read`, `Files.ReadWrite`, `User.Read` (delegated)
- **App name**: `Lattix Web Dashboard`

The resulting client ID is written to `web/public/config.js` and committed. No client secret is needed — the SPA uses PKCE (public client).

**Commands**:
```bash
az ad app create --display-name "Lattix Web Dashboard" \
  --sign-in-audience AzureADandPersonalMicrosoftAccount \
  --web-redirect-uris [] \
  --enable-id-token-issuance false
# Then update SPA platform and permissions via az ad app update / az rest
```

### Decision 9: GitHub Pages via GitHub Actions deployment

**Choice**: Enable GitHub Pages on the `chenxizhang/lattix` repository using the **GitHub Actions** deployment source (officially recommended). A workflow file `.github/workflows/deploy-pages.yml` handles the build and deploy pipeline.

**Workflow structure**:
```yaml
name: Deploy Web Dashboard
on:
  push:
    branches: [main]
    paths: ['web/**']
  workflow_dispatch:

permissions:
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd web && npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: web/dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

**Setup via `gh` CLI**:
```bash
# Enable Pages with Actions source
gh api repos/chenxizhang/lattix/pages -X POST -f build_type=workflow
# Set custom domain
gh api repos/chenxizhang/lattix/pages -X PUT -f cname=lattix.code365.xyz
```

A `CNAME` file is included in the Vite `public/` directory so it is present in every build artifact.

**Rationale**: GitHub Actions deployment is the officially recommended approach. It keeps build artifacts out of the repo, runs builds in CI, and integrates with GitHub's Pages infrastructure for atomic deployments.

### Decision 10: Cloudflare DNS (manual)

The CNAME record `lattix.code365.xyz` → `chenxizhang.github.io` is created manually by the user in the Cloudflare Dashboard. This is a one-time setup step.

### Decision 11: Task submission security — input sanitization and field restriction

**Choice**: The web dashboard's task submission form restricts what users can submit:

1. **Exposed fields**: `title` (optional, max 100 chars), `prompt` (required, max 10,000 chars), and `command` (optional agent command, in a collapsible "Options" section) are exposed in the submit form. Users can also configure a default agent command in Settings.
2. **Hidden fields**: The `workingDirectory` field is **not** exposed in the web UI. Tasks submitted from the web omit this, causing each machine to use its locally configured defaults.
3. **Input sanitization**: The prompt text is sanitized before writing to OneDrive — shell metacharacters (`; | & $ \` \\ > < ( )`) are escaped or rejected. This is defense-in-depth; the CLI already quotes prompts when constructing shell commands, but the web layer adds a second barrier.
4. **Task ID collision prevention**: Task IDs use `crypto.getRandomValues()` for 8 bytes of randomness (instead of `Date.now()` alone), making collisions effectively impossible even with concurrent submissions.

**Rationale**: Lattix's CLI executes prompts via `shell: true` with `spawn()`. While the CLI applies `JSON.stringify()` quoting, the web UI should not rely solely on downstream defenses. Sanitizing prompt text provides defense-in-depth. The optional agent command allows power users to specify a different agent while keeping the default experience simple.

### Decision 12: Token security and MSAL cache strategy

**Choice**: Use MSAL.js's built-in browser cache (`cacheLocation: 'localStorage'`) for token storage. Do not manually handle or store tokens.

**Details**:
- **localStorage** (not sessionStorage): Tokens persist across browser sessions and PWA reopens, providing seamless re-authentication. This is required for PWA standalone mode where sessionStorage would lose login state on every app close.
- **Active account pattern**: MSAL's `setActiveAccount()`/`getActiveAccount()` is used to reliably track the signed-in user across page loads and redirect flows.
- **Automatic token refresh**: MSAL.js silently refreshes tokens before expiry using hidden iframes
- **Token expiry handling**: If silent refresh fails (e.g., session expired), redirect user to login
- **No popup auth**: `loginRedirect()` is used exclusively — `loginPopup()` is unreliable in PWA standalone mode and causes `interaction_in_progress` errors on retry
- **PWA logout**: In standalone mode, `logoutPopup()` is used (with local cache clear fallback) to keep the user within the PWA window
- **CSP meta tag**: The `index.html` includes a strict Content Security Policy: `default-src 'self'; script-src 'self'; connect-src https://graph.microsoft.com https://login.microsoftonline.com https://login.live.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src https://login.microsoftonline.com https://login.live.com`

**Rationale**: localStorage is necessary for PWA login persistence — sessionStorage is cleared when the standalone app window closes, forcing re-login on every app open. MSAL's built-in cache handles the complexity of token lifecycle. The CSP restricts script execution to our own bundle and limits network connections to Microsoft endpoints only.

### Decision 13: Graph API error handling and resilience

**Choice**: Implement structured error handling for all Graph API calls:

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 401 | Token expired/invalid | Silent token refresh → retry once → redirect to login if still fails |
| 403 | Permission denied | Show user-friendly message: "Please grant the required permissions" with re-consent link |
| 404 | Path not found (Lattix/ missing) | Show onboarding guidance — not an error |
| 429 | Rate limited | Respect `Retry-After` header, show "Loading..." with auto-retry |
| 507 | OneDrive quota exceeded | Show clear error: "OneDrive storage is full" |
| 5xx | Server error | Show "Microsoft service temporarily unavailable, please retry" with manual retry button |

**Conflict prevention for task submission**: Use `@microsoft.graph.conflictBehavior: fail` header on PUT requests. If a filename collision occurs, regenerate task ID and retry (up to 3 attempts).

### Decision 14: Account validation and multi-account handling

**Choice**: After successful MSAL login, the dashboard immediately probes `GET /me/drive/root:/Lattix:/` to check if the authenticated account's OneDrive contains the Lattix workspace.

**Scenarios**:
- **Lattix/ exists**: Proceed normally — load nodes and tasks
- **Lattix/ does not exist (404)**: Show differentiated onboarding:
  - If no tasks and no output → "No Lattix workspace found. Install Lattix on your first machine: `npx -y lattix run`"
  - Include a note: "Make sure you signed in with the same Microsoft account used by your machines' OneDrive"
- **User has multiple accounts**: Show the currently signed-in account prominently in the navbar. Provide a "Switch account" option that calls `msalInstance.loginRedirect({ prompt: 'select_account' })` to let users pick a different account.

### Decision 15: Pagination and mobile data optimization

**Choice**: All Graph API list operations use server-side pagination with conservative defaults:

- **Task list**: Fetch 20 tasks per page (sorted by `lastModifiedDateTime` descending — most recent first). "Load more" button fetches next page using `@odata.nextLink`.
- **Node discovery**: Performed lazily — scan result directories of the first 50 tasks only. Cache discovered hostnames in `localStorage` (via cache module) to provide stale-while-revalidate behavior — cached data shows instantly on page load, fresh data replaces it in the background.
- **Result files**: Only fetched on-demand when user opens a specific task detail view, not eagerly for all tasks.
- **Auto-refresh**: Disabled by default. Manual "Refresh" button. Optional 60-second auto-refresh toggle (disabled on mobile by default to save data).

**Rationale**: Conservative pagination + lazy loading minimizes API calls and data transfer, which is critical for the mobile commute use case.
