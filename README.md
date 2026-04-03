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
4. Every machine running `lattix watch` picks up that task independently.
5. Results land in a shared `output/` directory with hostname-prefixed files to avoid collisions.

No servers, no databases, no control plane — just distributed coordination through sync.

## Prerequisites

- **Windows** with PowerShell
- **Node.js** >= 18
- **OneDrive** installed and syncing
- A coding agent CLI (for example GitHub Copilot CLI or Claude Code)

## Installation

```bash
npx lattix init
```

Or install globally:

```bash
npm install -g lattix
lattix init
```

## Usage

### Initialize

Detect OneDrive, create symlinks, and generate local config:

```bash
lattix init
```

This creates `~/.lattix/` and points its `tasks/` and `output/` directories at your synced OneDrive workspace under `Lattix/`.

### Watch for Tasks

Start listening for distributed tasks on this machine:

```bash
lattix watch
```

Options:
- `--poll-interval <seconds>` — Polling interval (default: `10`)
- `--concurrency <number>` — Maximum concurrent agent processes (default: `1`)

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

List all tasks and their machine results:

```bash
lattix status
```

View details for a specific task:

```bash
lattix status task-20260402120000-abc123
```

## Architecture

```text
~/.lattix/
├── config.json          # Local machine config (not synced)
├── processed.json       # IDs of tasks already executed on this machine
├── tasks/ → OneDrive    # Symlink to <OneDrive>\Lattix\tasks
│   ├── task-001.json
│   └── task-002.json
└── output/ → OneDrive   # Symlink to <OneDrive>\Lattix\output
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

Task files are immutable once written. Each machine keeps its own local `processed.json` record so restarts do not cause duplicate execution.

## Migration from AgentBroker

Lattix is the direct rename of AgentBroker.

- The npm package name changes from `agentbroker` to `lattix`.
- The CLI command changes from `agentbroker` to `lattix`.
- The local workspace moves from `~/.agentbroker` to `~/.lattix`.
- The synced OneDrive workspace moves from `<OneDrive>\AgentBroker` to `<OneDrive>\Lattix`.

Running `lattix init` will migrate the legacy local and OneDrive directories automatically when it is safe to do so. If both old and new paths already exist with real content, Lattix will stop and ask you to merge them manually before continuing.

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

The current tests cover the highest-risk rebrand behaviors, including legacy workspace migration, Lattix path setup, CLI branding, and result artifact writing.

## License

ISC
