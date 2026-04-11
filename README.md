<p align="center">
  <img src="assets/icon.svg" alt="AgentFleet icon" width="160" />
</p>

[English](README.md) | [简体中文](README.zh-CN.md)

# AgentFleet

> Distributed agent orchestration, without a control plane.

AgentFleet is a decentralized, multi-machine coding agent fabric built on top of OneDrive sync. Any enrolled machine can dispatch work. Every machine can execute it. There is no central scheduler, broker, or control plane to keep alive.

## Overview

AgentFleet lets you fan out coding tasks across all of your machines simultaneously. Submit a task from any machine, and every machine running AgentFleet will see the same task, execute it locally with its installed coding agent, and write back machine-scoped results.

**How it works:**
1. Your machines share a synced OneDrive workspace.
2. AgentFleet exposes stable local paths under `~/.agentfleet/`.
3. Any machine can create a task in the shared `tasks/` directory.
4. Every machine running `agentfleet run` picks up that task independently.
5. Results land in a shared `output/` directory with hostname-prefixed files to avoid collisions.

No servers, no databases, no control plane — just distributed coordination through sync.

## Prerequisites

- **Windows** with PowerShell, or **macOS**
- **Node.js** >= 18
- **OneDrive** installed and syncing, with either a personal account, a business account, or both
- A coding agent CLI (for example GitHub Copilot CLI or Claude Code)

## Installation

```bash
npx -y @daomar/agentfleet run
```

On first run, AgentFleet automatically creates `agentfleet` and `dma` shortcut commands in your npm global directory, so you can use either command directly without restarting the terminal. If you've already installed globally via `npm install -g @daomar/agentfleet`, shortcut creation is skipped.

Or install globally:

```bash
npm install -g @daomar/agentfleet
agentfleet run
```

## Usage

### Run

Start AgentFleet on this machine. On first use, it auto-detects OneDrive and creates the necessary symlinks and config. On subsequent runs, it loads the existing config and starts the task watcher. Only tasks that arrive **after** AgentFleet starts will be processed — existing tasks are never replayed, even after a restart or on a new machine.

```bash
agentfleet run
```

Options:
- `--poll-interval <seconds>` — Polling interval (default: `10`)
- `--concurrency <number>` — Maximum concurrent agent processes (default: `1`)
- `--daemon` or `-d` — Run as a background daemon process (detached from the terminal)
- `--log-file <path>` — Log file path when running as a daemon (default: `~/.agentfleet/agentfleet.log`)

#### Daemon Mode

Run AgentFleet in the background so it persists after you close the terminal:

```bash
agentfleet run --daemon
```

This spawns a detached process, writes its PID to `~/.agentfleet/agentfleet.pid`, and redirects all output to `~/.agentfleet/agentfleet.log`. Only one daemon instance is allowed at a time.

To use a custom log file:

```bash
agentfleet run --daemon --log-file /tmp/agentfleet.log
```

> **Note:** Only one AgentFleet instance is allowed at a time, whether foreground, daemon, or auto-start.

#### Auto-Start on Login

For machines that need AgentFleet to run permanently, set up auto-start on login:

```bash
npx -y @daomar/agentfleet install
```

This installs a platform-appropriate auto-start registration that runs `npx -y @daomar/agentfleet run -d` using the latest published version. The daemon starts immediately after installation. No administrator privileges are required on supported platforms.

- **Windows:** installs a Scheduled Task named `AgentFleet`, starts on login, and re-triggers after wake from sleep or hibernation.
- **macOS:** installs a LaunchAgent named `dev.daomar.agentfleet`, starts on login, and starts the daemon immediately after installation.

**Uninstall auto-start:**

```bash
npx -y @daomar/agentfleet uninstall
```

This stops the running instance and removes the current platform's auto-start registration.

### Stop

Stop the running AgentFleet instance:

```bash
agentfleet stop
```

This sends SIGTERM to the running process and cleans up the PID file. Works for all run modes (foreground, daemon, auto-start). If auto-start is configured, AgentFleet will restart on the next login. On Windows, Scheduled Task mode also restarts after wake from sleep or hibernation.

AgentFleet checks both OneDrive for Business and personal OneDrive accounts.

- If exactly one supported account is available, AgentFleet uses it automatically.
- If both personal and business OneDrive are available, AgentFleet picks the first one detected.
- On macOS, detection checks `~/Library/CloudStorage/OneDrive*` first, then legacy `~/OneDrive*` paths.

This creates `~/.agentfleet/` and points its `tasks/` and `output/` directories at your selected OneDrive workspace under `AgentFleet/`.

### Submit a Task

Create a task that every enrolled machine will execute:

```bash
agentfleet submit --prompt "Add error handling to all API endpoints" --title "Error handling" --working-dir "C:\work\myproject"
```

Options:
- `--prompt <text>` — The instruction for the coding agent (required)
- `--title <text>` — Short task title
- `--working-dir <path>` — Working directory for the agent (default: current directory)
- `--agent <command>` — Override the default agent command template

### Check Status

Show version info, running AgentFleet process info (PID, mode, log file), and list all tasks with their machine results:

```bash
agentfleet status
```

The status output shows:
- **Version**: Current version and latest version on npm (with upgrade prompt if outdated)
- **Process info**: PID, run mode (foreground / daemon / auto-start on login), log file location
- **Tasks**: All tasks with execution results per machine

View details for a specific task:

```bash
agentfleet status task-20260402120000-abc123
```

## Architecture

```text
~/.agentfleet/
├── config.json          # Local machine config (not synced)
├── processed.json       # IDs of tasks already executed on this machine
├── agentfleet.pid           # PID file (present when running in any mode)
├── agentfleet.log           # Log file (daemon and auto-start modes)
├── tasks/ → OneDrive    # Symlink to the selected <OneDrive>\AgentFleet\tasks
│   ├── task-001.json
│   └── task-002.json
└── output/ → OneDrive   # Symlink to the selected <OneDrive>\AgentFleet\output
    ├── task-001/
    │   ├── DESKTOP-A-result.json
    │   ├── DESKTOP-A-stdout.log
    │   ├── LAPTOP-B-result.json
    │   └── LAPTOP-B-stdout.log
    └── task-002/
        └── ...
```

Platform-specific auto-start files live outside `~/.agentfleet/`:
- **Windows:** `~/.agentfleet/start-agentfleet.vbs`
- **macOS:** `~/Library/LaunchAgents/dev.daomar.agentfleet.plist`

## Security & Compliance

AgentFleet is designed with a zero-infrastructure security model:

- **No tunnels** — Machines never open inbound connections or tunnels. There is nothing to attack from the outside.
- **No exposed ports** — No listening services, no open ports, no attack surface. Each machine only syncs files through OneDrive's existing, authenticated channel.
- **No data movement** — AgentFleet does not transfer, copy, or relay any data. Task files and results live in the user's own OneDrive (Business or Personal). Data never leaves the Microsoft 365 tenant boundary.
- **No central server** — There is no AgentFleet backend, broker, or control plane. Coordination happens entirely through OneDrive sync, which is already approved and managed by your organization's IT policies.

This architecture means AgentFleet inherits the security, compliance, and data residency guarantees of your existing OneDrive and Microsoft 365 environment — with nothing additional to audit, secure, or maintain.

## Task File Format

```json
{
  "id": "task-20260402120000-abc123",
  "title": "Add error handling",
  "prompt": "Add try-catch blocks to all API route handlers...",
  "workingDirectory": "C:\\work\\myproject",
  "createdAt": "2026-04-02T12:00:00Z",
  "createdBy": "DESKTOP-A"
}
```

Task files are immutable once written. AgentFleet only processes tasks that arrive after the daemon starts — old tasks are never replayed, ensuring safe restarts and new machine onboarding.

## Development

Build the CLI:

```bash
npm run build
```

Run the automated test suite:

```bash
npm test
```

The test suite covers task-watcher startup behavior, shortcut registration, Windows scheduled-task and macOS LaunchAgent auto-start behavior, daemon management, run/install/stop/uninstall commands, CLI branding, bootstrap, OneDrive detection, provider selection, result writing, and legacy workspace migration.

## Web Dashboard

A browser-based dashboard is available at **[https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/)**.

### What it does

- **Submit tasks** to all your AgentFleet machines simultaneously from any browser
- **Monitor nodes** — see which machines are active, their last activity, and task counts
- **Browse task history** — paginated list of all submitted tasks with status indicators
- **View task results** — per-machine results with exit codes, duration, and timestamps
- **Mobile-friendly** — progressive web app (PWA) installable on iOS and Android

### Access

Open **[https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/)** in your browser and sign in with the Microsoft account that owns the OneDrive where AgentFleet is installed.

> **Important:** Sign in with the **same Microsoft account** used by your machines' OneDrive sync. If your OneDrive is linked to `user@example.com`, log in with that account.

### Security model

- **Authentication:** Microsoft Entra ID with PKCE authorization code flow — no secrets stored in the browser
- **Token storage:** MSAL.js manages tokens in `localStorage` for persistent login across browser sessions and PWA reopens
- **Permissions:** `Files.Read`, `Files.ReadWrite`, and `User.Read` (delegated — only the signed-in user's files are accessible)
- **Input sanitization:** Shell metacharacters are stripped from task prompts before submission; `workingDirectory` field is not exposed in the UI; an optional agent command can be specified by power users
- **Content Security Policy:** Enforced via HTTP header; restricts scripts, styles, and connections to trusted origins only
- **No backend:** All API calls go directly from the browser to Microsoft Graph — no AgentFleet server is involved

### Mobile install (PWA)

**iOS (Safari):** Open [https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/) → tap the **Share** button → **Add to Home Screen**

**Android (Chrome):** Open [https://agentfleet.daomar.dev/](https://agentfleet.daomar.dev/) → tap the **⋮** menu → **Add to Home screen** (or wait for the install prompt)

### Entra ID app registration

The web dashboard uses a pre-registered Microsoft Entra ID application:

| Property | Value |
|---|---|
| Client ID | `b94f9687-adcf-48ea-9861-c4ce4b5c01a0` |
| Tenant | `91dde955-43a9-40a9-a406-694cffb04f28` (multi-tenant) |
| Sign-in audience | AzureAD and personal Microsoft accounts |
| Redirect URIs | `https://agentfleet.daomar.dev/`, `http://localhost:5173/` |
| Permissions | `Files.Read`, `Files.ReadWrite`, `User.Read` (delegated) |

To self-host the dashboard, register your own Entra ID app and update `web/public/config.js` with your `clientId`. See [Microsoft documentation](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) for app registration steps.

### Local development

```bash
cd web
npm install
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build to web/dist/
npm test           # Run unit tests (Vitest)
```

## Support

AgentFleet is free and open-source. If it helps your workflow, consider supporting the project:

<table>
  <tr>
    <td align="center"><strong>PayPal</strong><br/>(international)</td>
    <td align="center"><strong>WeChat Pay</strong><br/>(国内用户)</td>
  </tr>
  <tr>
    <td align="center"><a href="https://paypal.me/chenxizhang2026"><img src="assets/paypal-donation.png" alt="PayPal QR Code" width="200" /></a></td>
    <td align="center"><img src="assets/wechat-donation.jpg" alt="WeChat Pay QR Code" width="200" /></td>
  </tr>
</table>

### Supporters

<table>
  <tr>
    <td align="center" valign="top" width="128">
      <a href="https://github.com/hjunxu" title="@hjunxu">
        <img src="https://github.com/hjunxu.png?size=96" alt="@hjunxu" width="64" height="64" /><br />
        <sub><strong>hjunxu</strong></sub>
      </a>
    </td>
  </tr>
</table>

All supporters will be recognized on this page.

## License

ISC
