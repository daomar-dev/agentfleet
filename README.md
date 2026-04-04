<p align="center">
  <img src="assets/icon.svg" alt="Lattix icon" width="160" />
</p>

# Lattix

> Distributed agent orchestration, without a control plane.

Lattix is a decentralized, multi-machine coding agent fabric built on top of OneDrive sync. Any enrolled machine can dispatch work. Every machine can execute it. There is no central scheduler, broker, or control plane to keep alive.

## Overview

Lattix lets you fan out coding tasks across all of your machines simultaneously. Submit a task from any machine, and every machine running Lattix will see the same task, execute it locally with its installed coding agent, and write back machine-scoped results.

**How it works:**
1. Your machines share a synced OneDrive workspace.
2. Lattix exposes stable local paths under `~/.lattix/`.
3. Any machine can create a task in the shared `tasks/` directory.
4. Every machine running `lattix run` picks up that task independently.
5. Results land in a shared `output/` directory with hostname-prefixed files to avoid collisions.

No servers, no databases, no control plane — just distributed coordination through sync.

## Prerequisites

- **Windows** with PowerShell
- **Node.js** >= 18
- **OneDrive** installed and syncing, with either a personal account, a business account, or both
- A coding agent CLI (for example GitHub Copilot CLI or Claude Code)

## Installation

```bash
npx -y lattix run
```

On first run, Lattix automatically creates a `lattix` shortcut command so you can use `lattix` directly in the future (requires a terminal restart). If you've already installed globally via `npm install -g lattix`, the shortcut creation is skipped.

Or install globally:

```bash
npm install -g lattix
lattix run
```

## Usage

### Run

Start Lattix on this machine. On first use, it auto-detects OneDrive and creates the necessary symlinks and config. On subsequent runs, it loads the existing config and starts the task watcher. Only tasks that arrive **after** Lattix starts will be processed — existing tasks are never replayed, even after a restart or on a new machine.

```bash
lattix run
```

Options:
- `--poll-interval <seconds>` — Polling interval (default: `10`)
- `--concurrency <number>` — Maximum concurrent agent processes (default: `1`)
- `--daemon` or `-d` — Run as a background daemon process (detached from the terminal)
- `--log-file <path>` — Log file path when running as a daemon (default: `~/.lattix/lattix.log`)

#### Daemon Mode

Run Lattix in the background so it persists after you close the terminal:

```bash
lattix run --daemon
```

This spawns a detached process, writes its PID to `~/.lattix/lattix.pid`, and redirects all output to `~/.lattix/lattix.log`. Only one daemon instance is allowed at a time.

To use a custom log file:

```bash
lattix run --daemon --log-file C:\logs\lattix.log
```

> **Note:** Only one Lattix instance is allowed at a time, whether foreground, daemon, or auto-start.

#### Auto-Start on Login

For machines that need Lattix to run permanently, set up auto-start on login:

```bash
npx -y lattix install
```

This creates a scheduled task that runs `npx lattix run -d` on every login and when the computer wakes from sleep or hibernation (always using the latest version). The daemon starts immediately after installation. No administrator privileges required.

**Uninstall auto-start:**

```bash
npx -y lattix uninstall
```

This stops the running instance and removes the scheduled task.

### Stop

Stop the running Lattix instance:

```bash
lattix stop
```

This sends SIGTERM to the running process and cleans up the PID file. Works for all run modes (foreground, daemon, auto-start). If auto-start is configured, Lattix will restart on next login or wake from sleep.

Lattix checks both OneDrive for Business and personal OneDrive accounts.

- If exactly one supported account is available, Lattix uses it automatically.
- If both personal and business OneDrive are available, Lattix picks the first one detected.

This creates `~/.lattix/` and points its `tasks/` and `output/` directories at your selected OneDrive workspace under `Lattix/`.

### Submit a Task

Create a task that every enrolled machine will execute:

```bash
lattix submit --prompt "Add error handling to all API endpoints" --title "Error handling" --working-dir "C:\work\myproject"
```

Options:
- `--prompt <text>` — The instruction for the coding agent (required)
- `--title <text>` — Short task title
- `--working-dir <path>` — Working directory for the agent (default: current directory)
- `--agent <command>` — Override the default agent command template

### Check Status

Show version info, running Lattix process info (PID, mode, log file), and list all tasks with their machine results:

```bash
lattix status
```

The status output shows:
- **Version**: Current version and latest version on npm (with upgrade prompt if outdated)
- **Process info**: PID, run mode (foreground / daemon / auto-start on login), log file location
- **Tasks**: All tasks with execution results per machine

View details for a specific task:

```bash
lattix status task-20260402120000-abc123
```

## Architecture

```text
~/.lattix/
├── config.json          # Local machine config (not synced)
├── processed.json       # IDs of tasks already executed on this machine
├── lattix.pid           # PID file (present when running in any mode)
├── lattix.log           # Log file (daemon and auto-start modes)
├── start-lattix.vbs     # Auto-start launcher (created by install)
├── bin/
│   └── lattix.cmd       # Shortcut wrapper (auto-created on first npx run)
├── tasks/ → OneDrive    # Symlink to the selected <OneDrive>\Lattix\tasks
│   ├── task-001.json
│   └── task-002.json
└── output/ → OneDrive   # Symlink to the selected <OneDrive>\Lattix\output
    ├── task-001/
    │   ├── DESKTOP-A-result.json
    │   ├── DESKTOP-A-stdout.log
    │   ├── LAPTOP-B-result.json
    │   └── LAPTOP-B-stdout.log
    └── task-002/
        └── ...
```

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

Task files are immutable once written. Lattix only processes tasks that arrive after the daemon starts — old tasks are never replayed, ensuring safe restarts and new machine onboarding.

## Migration from AgentBroker

Lattix is the direct rename of AgentBroker.

- The npm package name changes from `agentbroker` to `lattix`.
- The CLI command changes from `agentbroker` to `lattix`.
- The local workspace moves from `~/.agentbroker` to `~/.lattix`.
- The synced OneDrive workspace moves from `<OneDrive>\AgentBroker` to `<OneDrive>\Lattix`.

Running `lattix run` will migrate the legacy local and OneDrive directories automatically when it is safe to do so. If both old and new paths already exist with real content, Lattix will stop and ask you to merge them manually before continuing.

If you rename the GitHub repository from `agentbroker` to `lattix`, existing clones should update their remote URL:

```bash
git remote set-url origin https://github.com/chenxizhang/lattix.git
```

## Development

Build the CLI:

```bash
npm run build
```

Run the automated test suite:

```bash
npm test
```

The test suite covers task-watcher startup behavior, shortcut registration, scheduled task triggers, daemon management, run/install/stop/uninstall commands, CLI branding, bootstrap, OneDrive detection, provider selection, result writing, and legacy workspace migration.

## License

ISC
