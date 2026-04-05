## Why

Lattix today is purely CLI-driven. Users must SSH or sit in front of each machine to check task status, see which nodes are active, or submit new work. There is no centralized view of the distributed fleet — no way to see at a glance which machines are enrolled, what tasks have been dispatched, or how each machine performed. Mobile access is impossible.

This creates friction for the primary use case: a single user managing multiple machines. They want to glance at their phone during commute or check from a browser tab without opening a terminal.

## What Changes

A new **web dashboard** is added to the Lattix repository as a single-page application (SPA) deployed via GitHub Pages using GitHub Actions. It requires no server, no separate infrastructure — the GitHub Actions workflow builds from `web/` source and deploys automatically on push to `main`.

Key user-facing outcomes:

- **Microsoft Entra ID login**: Users authenticate with their Microsoft account (the same one backing their OneDrive). Supports both OneDrive for Business and personal OneDrive. The app uses MSAL.js (Microsoft Authentication Library) with an Entra ID app registration auto-created via `az` CLI.
- **Node overview**: The home page lists all Lattix nodes (machines) that have participated in task execution, discovered by scanning result files in the shared OneDrive `output/` directory for unique hostnames.
- **Task history**: A list of all dispatched tasks with per-machine execution results (status, timing, exit codes). Users can drill into individual task details.
- **Onboarding guidance**: If no nodes or tasks are found, the dashboard displays clear instructions on how to install and start using Lattix.
- **Task submission**: A prominent form at the top of the page allows users to create new tasks directly from the browser, writing task JSON files to the OneDrive `tasks/` directory via Microsoft Graph API. The submit form exposes title, prompt, and an optional agent command (in a collapsible "Options" section). The `workingDirectory` field is not exposed, causing each machine to use its default working directory.
- **PWA / Mobile support**: The app is a Progressive Web App — installable on iPhone and Android home screens. Mobile layout features a bottom tab bar navigation (Home, Tasks, Settings) with SVG icons, safe area insets for PWA standalone mode, and stale-while-revalidate caching for instant page loads. API calls are paginated and lazy-loaded to minimize mobile data usage.

## Security Model

Lattix operates on a **trusted-owner model**: the OneDrive workspace is owned by a single user, and all machines running Lattix belong to that user. The web dashboard inherits this trust model — only the authenticated OneDrive owner can read/write task files. However, the web UI introduces a lower barrier to submission compared to the CLI, so additional safeguards are applied:

- **Input sanitization**: Task prompts submitted via the web UI are sanitized to remove shell metacharacters and injection patterns before being written as task JSON.
- **Optional agent command**: The web UI exposes an optional agent command field in a collapsible "Options" section. Users can also set a default agent in Settings. The `workingDirectory` field is not exposed.
- **Content Security Policy**: The SPA includes a strict CSP meta tag to mitigate XSS risks, given that the app handles Graph API access tokens with file write permissions.
- **Token handling**: MSAL.js manages token storage in `localStorage` for persistent login across browser sessions and PWA reopens. Tokens are refreshed silently via MSAL's built-in cache. The active account pattern (`setActiveAccount`/`getActiveAccount`) ensures reliable session restoration.
- **Account validation**: On login, the dashboard verifies the authenticated account's OneDrive contains a `Lattix/` directory. If not, it guides the user to sign in with the correct account.

## Capabilities

### New Capabilities
- `web-dashboard`: A GitHub Pages–hosted SPA providing authentication, node discovery, task listing, task submission, and onboarding — all powered by Microsoft Graph API against the user's OneDrive.

### Modified Capabilities
None. The existing CLI, task watcher, services, and file formats are unchanged. The web dashboard is a read/write client that operates on the same OneDrive file structure used by the CLI.

## Impact

- **Code**: New `web/` directory containing the SPA source (TypeScript, HTML, CSS). Vite builds to `web/dist/` locally; GitHub Actions workflow deploys to Pages. New `.github/workflows/deploy-pages.yml` for automated deployment. New npm scripts for web development.
- **Tests**: Automated tests for the web app's core logic (auth flow, Graph API data parsing, task file creation). No changes to existing CLI tests.
- **User experience**: Users gain a browser-based and mobile-friendly way to monitor and control their Lattix fleet without touching a terminal.
- **Breaking**: None. The web dashboard is purely additive and does not modify any existing CLI behavior, file format, or architecture.

## Infrastructure Automation

All infrastructure setup is automated via CLI tools — no manual portal clicks required:

- **GitHub Pages**: Configured via `gh` CLI — enable Pages with **GitHub Actions** deployment source (officially recommended), set custom domain to `lattix.code365.xyz`. A `.github/workflows/deploy-pages.yml` workflow handles building from `web/` and deploying automatically on push to `main`.
- **Custom domain DNS**: A CNAME record for `lattix.code365.xyz` → `chenxizhang.github.io` is created manually by the user in Cloudflare Dashboard (one-time setup).
- **Entra ID app registration**: Created via `az` CLI in tenant `91dde955-43a9-40a9-a406-694cffb04f28`. The app is configured as multi-tenant (supports both personal and work/school Microsoft accounts), with SPA platform redirect URIs pointing to the custom domain. Required API permissions (`Files.Read`, `Files.ReadWrite`, `User.Read`) are granted. The resulting client ID is injected into the web app's `config.js`.

## Non-Goals

- No backend server, API gateway, or database — everything runs client-side against Microsoft Graph.
- No real-time push notifications or WebSocket connections — the dashboard polls or refreshes on demand.
- No user management or multi-tenant features — the dashboard operates on whichever OneDrive the authenticated user owns.
- No modification to the existing CLI commands or task/result file formats.
