## 1. Infrastructure: Entra ID, GitHub Pages, Cloudflare DNS

- [x] 1.1 Register Entra ID app via `az` CLI: `az ad app create` in tenant `91dde955-43a9-40a9-a406-694cffb04f28`, display name "Lattix Web Dashboard", sign-in audience `AzureADandPersonalMicrosoftAccount`
- [x] 1.2 Configure SPA platform with redirect URIs: `https://lattix.code365.xyz/`, `http://localhost:5173/`
- [x] 1.3 Add required API permissions: Microsoft Graph — `Files.Read`, `Files.ReadWrite`, `User.Read` (delegated)
- [x] 1.4 Admin-consent the permissions (if possible) or document that users must consent on first login
- [x] 1.5 Capture the application (client) ID and write it to `web/public/config.js`
- [ ] 1.6 Create CNAME DNS record manually in Cloudflare Dashboard: `lattix` CNAME → `chenxizhang.github.io` (proxied) in zone `code365.xyz`
- [x] 1.7 Create `web/public/CNAME` file containing `lattix.code365.xyz` (included in every build artifact)
- [x] 1.8 Create `.github/workflows/deploy-pages.yml` — GitHub Actions workflow: trigger on push to `main` (paths: `web/**`), build Vite app, deploy via `actions/upload-pages-artifact` + `actions/deploy-pages`
- [x] 1.9 Enable GitHub Pages via `gh` CLI with Actions source: `gh api repos/chenxizhang/lattix/pages -X POST -f build_type=workflow`, then set custom domain: `gh api repos/chenxizhang/lattix/pages -X PUT -f cname=lattix.code365.xyz`
- [ ] 1.10 Verify `https://lattix.code365.xyz/` resolves and serves content after first workflow run

## 2. Project Scaffolding

- [x] 2.1 Create `web/` directory structure: `src/`, `src/components/`, `public/`, `public/icons/`, `styles/`
- [x] 2.2 Create `web/package.json` with dependencies: `@azure/msal-browser`, `vite`, `typescript`; scripts: `dev`, `build`, `preview`, `test`
- [x] 2.3 Create `web/tsconfig.json` targeting ES2020, strict mode, DOM lib
- [x] 2.4 Create `web/vite.config.ts` with build output to `dist/` (default), base path `/`
- [x] 2.5 Create `web/public/index.html` — minimal SPA shell with `<div id="app">`, meta viewport, manifest link, theme-color meta, service worker registration script
- [x] 2.6 Create `web/public/config.js` — configuration file with `LATTIX_CLIENT_ID` (populated from step 1.5), `LATTIX_REDIRECT_URI` = `https://lattix.code365.xyz/`
- [x] 2.7 Add `web:dev` and `web:build` scripts to root `package.json`
- [x] 2.8 Run `npm install` in `web/` directory and verify `npm run build` produces output in `web/dist/`

## 3. Authentication (MSAL.js)

- [x] 3.1 Write tests for auth module: MSAL config initialization, login redirect trigger, token acquisition, logout, unauthenticated state detection, token expiry → silent refresh → login redirect fallback
- [x] 3.2 Create `web/src/auth.ts` — initialize `PublicClientApplication` from `config.js` values with `cacheLocation: 'sessionStorage'`; export `login()`, `logout()`, `getToken(scopes)`, `getAccount()`, `isAuthenticated()`, `switchAccount()`
- [x] 3.3 Handle redirect promise on page load (`handleRedirectPromise()`) to complete the auth flow after redirect back from Entra ID
- [x] 3.4 Request scopes: `Files.Read`, `Files.ReadWrite`, `User.Read`
- [x] 3.5 Implement silent token refresh: call `acquireTokenSilent()` first, fall back to `acquireTokenRedirect()` on `InteractionRequiredAuthError`
- [x] 3.6 Implement `switchAccount()`: calls `loginRedirect({ prompt: 'select_account' })` to let user pick a different Microsoft account
- [ ] 3.7 Verify login flow works end-to-end in browser with a test Entra ID app (manual)

## 4. Microsoft Graph API Client

- [x] 4.1 Write tests for graph module: list tasks, read task content, list results for a task, read result content, discover nodes from results, submit task, pagination, error handling for 401/403/404/429/5xx, conflict behavior on PUT (all with mocked fetch)
- [x] 4.2 Create `web/src/graph.ts` — authenticated `fetch` wrapper that attaches Bearer token; on 401 automatically trigger silent token refresh and retry once
- [x] 4.3 Implement structured error handling: 401 → token refresh + retry, 403 → consent prompt, 404 → return empty/onboarding, 429 → respect `Retry-After` + auto-retry, 5xx → user-friendly error with retry button
- [x] 4.4 Implement `listTaskFiles(nextLink?)`: `GET /me/drive/root:/Lattix/tasks:/children?$top=20&$orderby=lastModifiedDateTime desc` — paginated, returns array of DriveItem metadata + nextLink; handles 404 gracefully
- [x] 4.5 Implement `readFileContent(itemId)`: `GET /me/drive/items/{id}/content` — downloads and parses JSON file content
- [x] 4.6 Implement `listTaskResults(taskId)`: `GET /me/drive/root:/Lattix/output/{taskId}:/children` — returns result file metadata for a specific task
- [x] 4.7 Implement `discoverNodes()`: scan result directories of the first 50 tasks; extract unique hostnames from `<HOSTNAME>-result.json` filename pattern; cache results in sessionStorage
- [x] 4.8 Implement `submitTask(task)`: `PUT /me/drive/root:/Lattix/tasks/{filename}:/content` with JSON body and `@microsoft.graph.conflictBehavior: fail` header; generate task ID with `crypto.getRandomValues()` (8 bytes); on 409 conflict regenerate ID and retry (up to 3 times)
- [x] 4.9 Implement `checkWorkspaceExists()`: `GET /me/drive/root:/Lattix:/` — returns boolean; used for account validation on login
- [x] 4.10 Create `web/src/types.ts` — reuse `TaskFile` and `ResultFile` interfaces from `src/types/index.ts` (copy the relevant type definitions for the web app)

## 5. SPA Router

- [x] 5.1 Write tests for router: hash change dispatches correct handler, route parameters extracted, unknown routes fall back to home
- [x] 5.2 Create `web/src/router.ts` — minimal hash-based router supporting routes: `#/` (home), `#/tasks` (task list), `#/tasks/:id` (task detail), `#/settings`
- [x] 5.3 Router renders view components into `<div id="app">` container
- [x] 5.4 Integrate router with auth — unauthenticated users always see login prompt regardless of route

## 6. View Components

- [x] 6.1 Write tests for home view: renders node list when data exists, renders onboarding when empty, renders submit form
- [x] 6.2 Create `web/src/components/home.ts` — home view with three sections:
  - **Submit form** (top, prominent): title input (max 100 chars), prompt textarea (max 10,000 chars), submit button. No agent command or working directory fields exposed.
  - **Node list**: cards showing hostname, last active time, total tasks executed
  - **Recent tasks**: compact list of last 10 tasks with status badges, "View all" link to #/tasks
  - **Onboarding**: shown when no nodes/tasks found — installation instructions (`npx -y lattix run`), note about signing in with the correct Microsoft account
- [x] 6.3 Write tests for task list view: renders task items, shows status per machine, handles empty state
- [x] 6.4 Create `web/src/components/task-list.ts` — paginated list of tasks (20 per page), showing: task ID, title, created time, created-by machine, result count, overall status. "Load more" button fetches next page via `@odata.nextLink`. Click navigates to detail.
- [x] 6.5 Write tests for task detail view: renders task metadata and per-machine results
- [x] 6.6 Create `web/src/components/task-detail.ts` — full task info + table of per-machine results (hostname, status, exit code, duration, started/completed timestamps). Option to view stdout/stderr logs.
- [x] 6.7 Create `web/src/components/settings.ts` — displays current Entra ID configuration (client ID, tenant), link to Azure Portal for app registration, instructions for updating `config.js`
- [x] 6.8 Create `web/src/components/login.ts` — login prompt shown to unauthenticated users with "Sign in with Microsoft" button
- [x] 6.9 Create `web/src/components/navbar.ts` — top navigation bar with Lattix logo, nav links (Home, Tasks, Settings), signed-in account display name + email, "Switch account" button, logout button. Responsive hamburger menu on mobile.

## 7. Styles and Responsive Design

- [x] 7.1 Create `web/styles/main.css` — CSS custom properties for theming (colors, spacing, typography), base reset, responsive grid/flexbox layouts
- [x] 7.2 Implement mobile-first responsive breakpoints: phone (≤480px), tablet (481–768px), desktop (≥769px)
- [x] 7.3 Ensure all interactive elements have touch targets ≥ 44×44px
- [x] 7.4 Style task status badges: completed (green), failed (red), timeout (amber), running (blue)
- [x] 7.5 Style the submit form for prominence — visually distinct section at the top of the home page
- [x] 7.6 Style onboarding section with clear call-to-action and code snippets
- [x] 7.7 Add loading states (skeleton screens or spinners) for async data fetching
- [ ] 7.8 Verify layout at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1280px (desktop) — manual

## 8. PWA Setup

- [x] 8.1 Create `web/public/manifest.json` — app name "Lattix", short_name "Lattix", start_url, display "standalone", theme_color, background_color, icons array (192×192, 512×512)
- [x] 8.2 Generate PWA icon PNGs from `assets/icon.svg` at 192×192 and 512×512 sizes, place in `web/public/icons/`
- [x] 8.3 Create `web/public/sw.js` — service worker with install (cache app shell), activate (clean old caches), fetch (cache-first for static assets, network-first for API calls)
- [x] 8.4 Add service worker registration in `index.html` — register on load, handle updates
- [x] 8.5 Add Apple-specific meta tags in `index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`
- [ ] 8.6 Verify PWA install prompt appears in Chrome and Safari (manual)

## 9. Entry Point and Integration

- [x] 9.1 Create `web/src/index.ts` — app entry point: load config, initialize MSAL, handle redirect, validate account (check Lattix/ exists), set up router, render initial view
- [x] 9.2 Create `web/src/utils.ts` — shared helpers: date formatting, task ID generation (with `crypto.getRandomValues()`), debounce, error display toast
- [x] 9.3 Create `web/src/sanitize.ts` — input sanitization: escape shell metacharacters in prompt text, enforce title max length (100 chars), enforce prompt max length (10,000 chars), strip `agent`/`command`/`workingDirectory` fields from submitted task JSON
- [x] 9.4 Wire all components together: auth → account validation → router → views → graph API
- [x] 9.5 Add global error handling: catch unhandled promise rejections, display user-friendly error messages via toast component
- [ ] 9.6 Verify full flow: login → account validation → home (nodes + tasks) → submit task → see new task in list → view task detail → switch account → logout

## 10. Security Hardening

- [x] 10.1 Write tests for input sanitization: shell metacharacters escaped, max lengths enforced, restricted fields stripped
- [x] 10.2 Add CSP meta tag to `index.html`: `default-src 'self'; script-src 'self'; connect-src https://graph.microsoft.com https://login.microsoftonline.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src https://login.microsoftonline.com`
- [x] 10.3 Write test verifying CSP meta tag is present in built `index.html`
- [x] 10.4 Write test verifying no inline `<script>` tags exist in `index.html`
- [x] 10.5 Write tests for account validation flow: workspace exists → proceed, workspace missing → onboarding with account hint, switch account → re-login with prompt
- [x] 10.6 Write tests for Graph API error handling: 401 → refresh + retry, 403 → consent message, 429 → retry-after, 5xx → error + retry button
- [x] 10.7 Write tests for task ID collision prevention: conflictBehavior header sent, 409 → regenerate ID + retry

## 11. Build, Deploy, and Documentation

- [x] 11.1 Run `web:build` locally and verify `web/dist/` contains all required files: `index.html`, `assets/`, `manifest.json`, `sw.js`, `config.js`, `icons/`, `CNAME`
- [x] 11.2 Commit and push to `main` — verify GitHub Actions workflow runs and deploys to `https://lattix.code365.xyz/`
- [x] 11.3 Add `.gitignore` entries: `web/node_modules/`, `web/dist/`
- [x] 11.4 Update `README.md`: add Web Dashboard section documenting — what it does, how to access it at `https://lattix.code365.xyz/`, security model, mobile install instructions
- [x] 11.5 Document Entra ID app registration in README (for reference — the app is already created by task 1.1)
- [x] 11.6 Final build verification: `cd web && npm run build` succeeds with no errors
- [x] 11.7 Final test verification: `cd web && npm test` — all unit tests pass
