<p align="center">
  <img src="assets/icon.svg" alt="AgentFleet" width="150" />
</p>

<h1 align="center">AgentFleet</h1>

<p align="center">
  <strong>Turn your own laptops, desktops, and lab machines into a distributed coding-agent fleet.</strong>
</p>

<p align="center">
  Run one prompt across many devices in parallel — no server, no SSH mesh, no control plane. AgentFleet coordinates through your existing OneDrive sync.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/v/@daomar/agentfleet" alt="npm version" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/actions"><img src="https://img.shields.io/github/actions/workflow/status/daomar-dev/agentfleet/release.yml" alt="build status" /></a>
  <a href="https://www.npmjs.com/package/@daomar/agentfleet"><img src="https://img.shields.io/npm/dm/@daomar/agentfleet" alt="npm downloads" /></a>
  <a href="https://github.com/daomar-dev/agentfleet/blob/main/LICENSE"><img src="https://img.shields.io/github/license/daomar-dev/agentfleet" alt="license" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> ·
  <a href="https://agentfleet.daomar.dev/">Live dashboard</a> ·
  <a href="https://agentfleet.daomar.dev/donate.html">Support the project</a>
</p>

---

## Why star AgentFleet?

Experienced developers increasingly have more compute than orchestration: a work laptop, a desktop, a mini PC, a home server, maybe several agent CLIs with different strengths. AgentFleet gives those machines a shared task fabric so they can all attack the same prompt independently and return comparable results.

Use it when you want to:

- **Compare agents side by side** — run the same security review with Claude Code, Copilot CLI, Cursor, or any local command template.
- **Parallelize exploratory work** — ask multiple machines to inspect different clones, branches, or configurations at the same time.
- **Keep data local** — tasks and results sync through your OneDrive; AgentFleet runs no hosted backend.
- **Work behind firewalls** — no inbound ports, tunnels, SSH bastions, queues, or control-plane credentials.
- **Operate like a personal CI lab** — submit tasks from CLI or browser and watch every enrolled node report back.

If this is the kind of distributed-agent workflow you want to see mature, please **star**, **fork**, and share your use cases.

## 60-second start

Run this on every machine you want in the fleet:

```bash
npx -y @daomar/agentfleet run
```

Then submit a task from any one machine:

```bash
agentfleet submit \
  --title "Security review" \
  --working-dir /path/to/project \
  --prompt "Review this repository for auth, injection, and secret-handling issues. Return concrete findings and patches."
```

Every running machine picks up the same task, executes it locally with its configured coding agent, and writes hostname-scoped results back to OneDrive.

Check progress:

```bash
agentfleet status
agentfleet status task-20260402-abc123
```

Prefer a browser? Open **[agentfleet.daomar.dev](https://agentfleet.daomar.dev/)**, sign in with the Microsoft account that owns the OneDrive, submit tasks, monitor nodes, and inspect results.

## Concrete workflows

### 1. Multi-agent code review

Run the same prompt across several machines that each use a different local agent command.

```bash
agentfleet submit \
  --title "Compare review agents" \
  --working-dir ~/src/product \
  --prompt "Find the top 10 production risks in this codebase. Group by severity and include file paths."
```

Use the outputs to compare reasoning quality, false positives, and patch suggestions.

### 2. Distributed refactor rehearsal

Point multiple machines at separate clones or branches, then let them attempt the same migration independently.

```bash
agentfleet submit \
  --title "React hooks migration plan" \
  --working-dir ~/src/frontend \
  --prompt "Plan and implement a safe migration from class components to function components with hooks. Keep changes reviewable."
```

### 3. Local benchmark farm for agent prompts

Tune one high-value prompt and run it repeatedly across machines with different models, tools, or repository states.

```bash
agentfleet submit \
  --title "Prompt benchmark" \
  --prompt "Summarize build failures, identify the root cause, and propose the smallest fix."
```

### 4. Firewalled team or lab environment

Use machines that already sync OneDrive without opening any inbound network path. No extra scheduler needs to be approved, hosted, patched, or monitored.

## How it works

```text
Machine A              Machine B              Machine C
agentfleet run         agentfleet run         agentfleet submit
     │                      │                       │
     └──────────────┬───────┴──────────────┬────────┘
                    ▼                      ▼
             OneDrive / AgentFleet shared workspace
                 tasks/  → immutable task JSON
                 output/ → per-machine result files
```

1. AgentFleet detects OneDrive and creates stable local paths under `~/.agentfleet/`.
2. `tasks/` and `output/` are backed by the synced OneDrive workspace.
3. `agentfleet submit` writes an immutable task file.
4. Each `agentfleet run` process sees new tasks and executes them locally.
5. Results are written with hostname prefixes, so multiple machines never overwrite each other.

## AgentFleet vs. common alternatives

| Capability | AgentFleet | SSH scripts | Ansible | Cloud CI |
|---|---:|---:|---:|---:|
| Central server/control plane | No | No, but you manage hosts | Control node | Hosted provider |
| Inbound ports | No | Usually SSH | SSH | No local nodes |
| Works with arbitrary local agent CLIs | Yes | Manual glue | Custom playbooks | Custom runners |
| Multi-machine result comparison | Built in | Manual | Manual | Pipeline-specific |
| Setup for an existing OneDrive user | One command | Host setup | Inventory + SSH | Provider setup |
| Data path | Your OneDrive | Your network | Your network | Cloud provider |

## CLI reference

<details>
<summary><strong>Install and run</strong></summary>

```bash
# Recommended: run without installing globally
npx -y @daomar/agentfleet run

# Or install globally
npm install -g @daomar/agentfleet
agentfleet run
```

Useful run options:

- `--poll-interval <seconds>` — polling interval, default `10`
- `--concurrency <number>` — max concurrent agent processes, default `1`
- `--daemon` / `-d` — run as a background daemon
- `--log-file <path>` — daemon log path, default `~/.agentfleet/agentfleet.log`

</details>

<details>
<summary><strong>Submit tasks</strong></summary>

```bash
agentfleet submit --prompt "..." --title "..." --working-dir /path
```

Options:

- `--prompt <text>` — instruction for the coding agent, required
- `--title <text>` — short task title
- `--working-dir <path>` — working directory, default current directory
- `--agent <command>` — override the agent command template

</details>

<details>
<summary><strong>Daemon and auto-start</strong></summary>

```bash
agentfleet run --daemon
npx -y @daomar/agentfleet install    # install auto-start
npx -y @daomar/agentfleet uninstall  # remove auto-start
agentfleet stop
```

- **Windows:** Scheduled Task named `AgentFleet`, triggered on login and wake
- **macOS:** LaunchAgent named `dev.daomar.agentfleet`

</details>

<details>
<summary><strong>Workspace layout</strong></summary>

```text
~/.agentfleet/
├── config.json          # local machine config, not synced
├── processed.json       # task IDs already executed on this machine
├── agentfleet.pid       # daemon PID file
├── agentfleet.log       # daemon/auto-start log
├── tasks/ → OneDrive    # shared task JSON files
└── output/ → OneDrive   # shared per-task outputs
    └── task-001/
        ├── DESKTOP-A-result.json
        ├── DESKTOP-A-stdout.log
        └── LAPTOP-B-result.json
```

Prerequisites: Node.js 18+, OneDrive sync, Windows with PowerShell or macOS, and at least one coding-agent CLI or compatible local command.

</details>

## Web dashboard

The hosted Pages app at **[agentfleet.daomar.dev](https://agentfleet.daomar.dev/)** is a PWA for:

- submitting tasks from desktop or mobile;
- monitoring enrolled nodes and last activity;
- browsing task history and per-machine results;
- using Microsoft Entra ID auth with PKCE and direct Microsoft Graph calls.

The page supports English and Simplified Chinese and switches automatically based on browser language.

## Security model

- **No inbound connectivity:** no tunnels, no listening services, no exposed SSH ports.
- **No AgentFleet backend:** the dashboard talks directly to Microsoft Graph.
- **No extra data plane:** coordination stays inside the user's OneDrive/Microsoft 365 environment.
- **No shared secrets in the repo:** browser auth uses delegated Microsoft permissions.
- **Local execution remains explicit:** each enrolled machine runs its own local agent command.

## Support the project

AgentFleet is free and open source. If it saves you time or inspires your distributed-agent setup:

1. ⭐ Star the repository so more developers can discover it.
2. 🍴 Fork it and adapt it to your own agent stack.
3. 💬 Open issues/discussions with real multi-machine workflows.
4. ☕ Consider sponsoring development via **[PayPal / WeChat Pay](https://agentfleet.daomar.dev/donate.html)**.

<table>
  <tr>
    <td align="center"><strong>PayPal</strong><br/>(international)</td>
    <td align="center"><strong>WeChat Pay</strong><br/>(国内用户)</td>
  </tr>
  <tr>
    <td align="center"><a href="https://paypal.me/chenxizhang2026"><img src="assets/paypal-donation.png" alt="PayPal QR Code" width="180" /></a></td>
    <td align="center"><img src="assets/wechat-donation.jpg" alt="WeChat Pay QR Code" width="180" /></td>
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

- [GitHub](https://github.com/daomar-dev/agentfleet) — source, issues, discussions
- [npm](https://www.npmjs.com/package/@daomar/agentfleet) — package install
- [Web dashboard](https://agentfleet.daomar.dev/) — submit and monitor tasks
- [About](https://agentfleet.daomar.dev/about.html) — architecture overview
- [Contributing](CONTRIBUTING.md) — development setup
- [Changelog](CHANGELOG.md) — release notes

## License

MIT
