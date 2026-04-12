<p align="center">
  <img src="assets/icon.svg" alt="AgentFleet" width="160" />
</p>

<h3 align="center">Distributed agent orchestration, without a control plane.</h3>

<p align="center">
  Fan out coding tasks across all your machines — no servers, no config, no infrastructure.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/v/@daomar/agentfleet" alt="npm version" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/actions"><img src="https://img.shields.io/github/actions/workflow/status/daomar-dev/agentfleet/release.yml" alt="build status" /></a>
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/dm/@daomar/agentfleet" alt="npm downloads" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/blob/main/LICENSE"><img src="https://img.shields.io/github/license/daomar-dev/agentfleet" alt="license" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

---

<p align="center">
  <em>Demo GIF coming soon — see <a href="#quick-start">Quick Start</a> to try it now</em>
</p>

<!-- TODO: Replace with actual demo GIF once recorded (task 4.2)
<p align="center">
  <img src="assets/demo.gif" alt="AgentFleet demo" width="720" />
</p>
-->

---

## Why AgentFleet?

Most distributed task systems need servers, brokers, or cloud infrastructure. AgentFleet needs none of that — it uses **OneDrive sync** as the coordination layer.

<table>
  <tr>
    <th></th>
    <th>AgentFleet</th>
    <th>SSH Scripts</th>
    <th>Ansible</th>
    <th>Cloud CI</th>
  </tr>
  <tr>
    <td><strong>Infrastructure</strong></td>
    <td>None (OneDrive)</td>
    <td>SSH server per machine</td>
    <td>Control node + SSH</td>
    <td>Cloud provider account</td>
  </tr>
  <tr>
    <td><strong>Network</strong></td>
    <td>No inbound connections</td>
    <td>Open SSH ports</td>
    <td>Open SSH ports</td>
    <td>Internet access</td>
  </tr>
  <tr>
    <td><strong>Security</strong></td>
    <td>Inherits M365 policies</td>
    <td>Key management</td>
    <td>Key management</td>
    <td>Cloud IAM</td>
  </tr>
  <tr>
    <td><strong>Setup Time</strong></td>
    <td>< 1 minute</td>
    <td>Hours</td>
    <td>Hours</td>
    <td>Minutes to hours</td>
  </tr>
  <tr>
    <td><strong>AI Agent Support</strong></td>
    <td>Built-in (any CLI agent)</td>
    <td>Manual scripting</td>
    <td>Custom playbooks</td>
    <td>Custom pipelines</td>
  </tr>
  <tr>
    <td><strong>Works Behind Firewalls</strong></td>
    <td>Yes</td>
    <td>No</td>
    <td>No</td>
    <td>Depends</td>
  </tr>
</table>

## Value Propositions

**Zero Servers** — No schedulers, no brokers, no databases. OneDrive is the only moving part.

**Zero Config** — Run one command and you're live. AgentFleet auto-detects OneDrive and sets up everything.

**Enterprise Security** — No tunnels, no open ports, no data leaves your Microsoft 365 tenant. Your IT policies already cover it.

## Quick Start

```bash
# 1. Start AgentFleet on each machine (auto-detects OneDrive)
npx -y @daomar/agentfleet run

# 2. Submit a task from any machine
agentfleet submit --prompt "Add error handling to all API endpoints" --title "Error handling"

# 3. Results appear on every machine — check them
agentfleet status
```

That's it. Every machine running `agentfleet run` picks up the task, executes it with its locally installed coding agent, and writes back results.

## How It Works

```text
  Machine A                    Machine B                    Machine C
  ┌──────────┐                ┌──────────┐                ┌──────────┐
  │agentfleet│                │agentfleet│                │agentfleet│
  │   run    │                │   run    │                │   run    │
  └────┬─────┘                └────┬─────┘                └────┬─────┘
       │                           │                           │
       └───────────┐    ┌──────────┘    ┌──────────────────────┘
                   ▼    ▼              ▼
              ┌─────────────────────────────┐
              │     OneDrive Sync Layer     │
              │  ┌───────┐   ┌──────────┐  │
              │  │tasks/ │   │ output/  │  │
              │  └───────┘   └──────────┘  │
              └─────────────────────────────┘
```

1. Your machines share a synced OneDrive workspace.
2. AgentFleet exposes stable local paths under `~/.agentfleet/`.
3. Any machine can create a task in the shared `tasks/` directory.
4. Every machine running `agentfleet run` picks up that task independently.
5. Results land in `output/` with hostname-prefixed files — no collisions.

## Use Cases

### Multi-Machine Code Review

Run the same coding agent prompt on a project across all your development machines simultaneously. Each machine applies its own agent (Claude Code, GitHub Copilot CLI, Cursor, etc.) and writes independent results, so you can compare outputs side by side.

```bash
agentfleet submit \
  --prompt "Review this codebase for security vulnerabilities and suggest fixes" \
  --title "Security audit" \
  --working-dir /path/to/project
```

### Distributed Refactoring

Fan out a large refactoring task across multiple machines, each working on its own local clone of the project. Useful when you have multiple workstations or want to try different agent configurations in parallel.

```bash
agentfleet submit \
  --prompt "Migrate all class components to functional components with hooks" \
  --title "React migration" \
  --working-dir /path/to/project
```

## Web Dashboard

A browser-based dashboard at **[agentfleet.daomar.dev](https://agentfleet.daomar.dev/)** lets you submit tasks, monitor nodes, and view results from any device — including mobile (installable as PWA).

## Security & Compliance

- **No tunnels** — Machines never open inbound connections. Nothing to attack.
- **No exposed ports** — No listening services, no attack surface.
- **No data movement** — Data stays in your own OneDrive. Never leaves the M365 tenant boundary.
- **No central server** — Coordination through OneDrive sync, already approved by your IT.
- **Web dashboard** — Microsoft Entra ID auth with PKCE, delegated permissions only.

## Full Documentation

<details>
<summary><strong>Installation options</strong></summary>

### npx (recommended)

```bash
npx -y @daomar/agentfleet run
```

On first run, AgentFleet creates an `agentfleet` shortcut in your npm global directory.

### Global install

```bash
npm install -g @daomar/agentfleet
agentfleet run
```

</details>

<details>
<summary><strong>CLI reference</strong></summary>

### Run

Start AgentFleet on this machine:

```bash
agentfleet run
```

Options:
- `--poll-interval <seconds>` — Polling interval (default: `10`)
- `--concurrency <number>` — Max concurrent agent processes (default: `1`)
- `--daemon` or `-d` — Run as background daemon
- `--log-file <path>` — Log file path for daemon mode (default: `~/.agentfleet/agentfleet.log`)

### Daemon Mode

```bash
agentfleet run --daemon
```

Spawns a detached process, writes PID to `~/.agentfleet/agentfleet.pid`. Only one instance allowed at a time.

### Auto-Start on Login

```bash
npx -y @daomar/agentfleet install    # Install auto-start
npx -y @daomar/agentfleet uninstall  # Remove auto-start
```

- **Windows:** Scheduled Task named `AgentFleet`, triggers on login and wake
- **macOS:** LaunchAgent named `dev.daomar.agentfleet`

### Submit

```bash
agentfleet submit --prompt "..." --title "..." --working-dir /path
```

Options:
- `--prompt <text>` — Instruction for the coding agent (required)
- `--title <text>` — Short task title
- `--working-dir <path>` — Working directory (default: cwd)
- `--agent <command>` — Override agent command template

### Status

```bash
agentfleet status                        # Overview of all tasks
agentfleet status task-20260402-abc123   # Detail for one task
```

### Stop

```bash
agentfleet stop
```

</details>

<details>
<summary><strong>Architecture details</strong></summary>

```text
~/.agentfleet/
├── config.json          # Local machine config (not synced)
├── processed.json       # IDs of tasks already executed on this machine
├── agentfleet.pid       # PID file (present when running)
├── agentfleet.log       # Log file (daemon and auto-start modes)
├── tasks/ → OneDrive    # Symlink to <OneDrive>\AgentFleet\tasks
│   ├── task-001.json
│   └── task-002.json
└── output/ → OneDrive   # Symlink to <OneDrive>\AgentFleet\output
    ├── task-001/
    │   ├── DESKTOP-A-result.json
    │   ├── DESKTOP-A-stdout.log
    │   └── LAPTOP-B-result.json
    └── task-002/
        └── ...
```

Platform-specific auto-start files:
- **Windows:** `~/.agentfleet/start-agentfleet.vbs`
- **macOS:** `~/Library/LaunchAgents/dev.daomar.agentfleet.plist`

### Task File Format

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

Task files are immutable once written. Only tasks arriving after the daemon starts are processed.

### Prerequisites

- **Windows** with PowerShell, or **macOS**
- **Node.js** >= 18
- **OneDrive** installed and syncing
- A coding agent CLI (e.g., Claude Code, GitHub Copilot CLI, Cursor)

### OneDrive Detection

AgentFleet checks both OneDrive for Business and personal accounts:
- If one account is available, it is used automatically.
- If both are available, the first detected is used.
- On macOS, `~/Library/CloudStorage/OneDrive*` is checked first, then `~/OneDrive*`.

</details>

<details>
<summary><strong>Web dashboard details</strong></summary>

### Features

- **Submit tasks** to all machines from any browser
- **Monitor nodes** — active machines, last activity, task counts
- **Browse task history** — paginated with status indicators
- **View results** — per-machine exit codes, duration, timestamps
- **PWA** — installable on iOS and Android

### Access

Sign in at [agentfleet.daomar.dev](https://agentfleet.daomar.dev/) with the Microsoft account that owns the OneDrive.

### Security

- **Auth:** Microsoft Entra ID with PKCE — no secrets in the browser
- **Tokens:** MSAL.js manages tokens in `localStorage`
- **Permissions:** `Files.Read`, `Files.ReadWrite`, `User.Read` (delegated)
- **Input sanitization:** Shell metacharacters stripped from prompts
- **CSP:** Enforced via HTTP header
- **No backend:** Browser → Microsoft Graph directly

### Entra ID App Registration

| Property | Value |
|---|---|
| Client ID | `b94f9687-adcf-48ea-9861-c4ce4b5c01a0` |
| Tenant | `91dde955-43a9-40a9-a406-694cffb04f28` (multi-tenant) |
| Sign-in audience | AzureAD and personal Microsoft accounts |
| Redirect URIs | `https://agentfleet.daomar.dev/`, `http://localhost:5173/` |
| Permissions | `Files.Read`, `Files.ReadWrite`, `User.Read` (delegated) |

### Mobile Install (PWA)

**iOS:** Safari → Share → Add to Home Screen  
**Android:** Chrome → ⋮ → Add to Home Screen

### Local Development

```bash
cd web
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build to web/dist/
npm test           # Unit tests (Vitest)
```

</details>

<details>
<summary><strong>Development</strong></summary>

```bash
npm run build      # Build CLI
npm test           # Run CLI tests
cd web && npm test # Run web tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup.

</details>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=daomar-dev/agentfleet&type=Date)](https://star-history.com/#daomar-dev/agentfleet&Date)

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

## Links

- [GitHub](https://github.com/daomar-dev/agentfleet) — Source code, issues, discussions
- [npm](https://www.npmjs.com/package/@daomar/agentfleet) — Install via npm
- [Web Dashboard](https://agentfleet.daomar.dev/) — Submit tasks from any browser
- [About](https://agentfleet.daomar.dev/about.html) — Architecture deep-dive
- [Contributing](CONTRIBUTING.md) — Development setup and guidelines
- [Changelog](CHANGELOG.md) — Version history

## License

ISC
