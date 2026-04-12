# AgentFleet v3 Protocol Specification

## Overview

AgentFleet v3 implements a single-claim distributed task queue using filesystem-based coordination. Any agent can submit tasks. Exactly one agent claims and executes each task. The protocol provides at-most-once delivery under normal operation and at-least-once delivery under network partitions.

## Directory Structure

```
fleet-root/
├── tasks/           # Pending and in-progress task files
│   └── {task-id}.json
├── claims/          # Claim files for task ownership
│   └── {task-id}/
│       └── {agent-id}
├── heartbeats/      # Liveness signals from running agents
│   └── {task-id}
├── results/         # Execution results
│   └── {task-id}.json
├── archive/         # Completed task archives
│   └── {task-id}.json
├── fleet/           # Agent presence (future use)
└── VERSION          # Protocol version file ("3.0.0")
```

## File Formats

### Task File (`tasks/{task-id}.json`)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Fix the login bug in auth.ts",
  "status": "pending",
  "priority": 0,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "submittedBy": "laptop-1",
  "title": "Fix login bug",
  "workingDirectory": "/home/user/project",
  "command": "claude -p {prompt}",
  "protocol_version": 1
}
```

**Fields:**
- `id` (required): UUID v4 task identifier
- `prompt` (required): The instruction for the coding agent
- `status` (required): One of `pending`, `claimed`, `running`, `completed`, `failed`, `rejected`
- `priority` (optional, default 0): Higher values execute first
- `createdAt` (required): ISO 8601 timestamp
- `updatedAt` (required): ISO 8601 timestamp, updated on every status change
- `submittedBy` (optional): Hostname of the submitting machine
- `title` (optional): Short human-readable title
- `workingDirectory` (optional): Absolute path for agent CWD
- `command` (optional): Agent command template, overrides default
- `protocol_version` (optional): Set to 1 for v3 tasks

### Claim File (`claims/{task-id}/{agent-id}`)

```json
{
  "agentId": "laptop-1-12345-a1b2",
  "claimedAt": "2024-01-15T10:30:05.000Z"
}
```

### Heartbeat File (`heartbeats/{task-id}`)

```json
{
  "agentId": "laptop-1-12345-a1b2",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "pid": 12345
}
```

### Result File (`results/{task-id}.json`)

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "laptop-1-12345-a1b2",
  "status": "completed",
  "exitCode": 0,
  "stdout": "...(truncated to 64KB)...",
  "completedAt": "2024-01-15T10:35:00.000Z",
  "durationMs": 300000,
  "error": null
}
```

### Archive File (`archive/{task-id}.json`)

```json
{
  "task": { /* original ProtocolTaskFile */ },
  "result": { /* ProtocolResultFile */ },
  "archivedAt": "2024-01-15T10:35:01.000Z"
}
```

## State Machine

```
pending ──→ claimed ──→ running ──→ completed
   │           │           │
   │           │           └──→ failed
   │           │
   │           └──→ pending  (claim-age timeout, no heartbeat)
   │
   └──→ rejected  (malformed task)

running ──→ pending  (stale heartbeat timeout)
```

## Claim Protocol

The claim protocol ensures exactly one agent executes each task:

1. Agent scans `tasks/` for files with `status: "pending"`
2. Agent sorts tasks by `priority` (descending), then `createdAt` (ascending)
3. Agent picks the highest-priority task
4. Agent writes `claims/{task-id}/{agent-id}` using `createExclusive` (O_CREAT|O_EXCL)
5. Agent waits the **convergence window** (5s local, 60s cloud) for all replicas to sync
6. Agent reads all files under `claims/{task-id}/`
7. Lowest agent ID (ASCII lexicographic sort) wins
8. Losers delete their own claim file
9. Winner updates task status: `pending` → `claimed` → `running`
10. Winner starts heartbeat timer and begins execution

### Why Convergence-Then-Tiebreak?

Filesystem sync (OneDrive, Dropbox, NFS) has propagation delays. Two agents may both see a task as unclaimed and write claim files simultaneously. The convergence window ensures all claim files are visible before the tiebreak. The deterministic tiebreak (lowest agent ID) guarantees all agents agree on the winner without communication.

## Timing Parameters

| Parameter | Local | Cloud | Description |
|-----------|-------|-------|-------------|
| Convergence window | 5,000ms | 15,000-60,000ms | Wait after claim for sync |
| Heartbeat interval | 30,000ms | 30,000ms | How often to write heartbeat |
| Claim-age timeout | 2x convergence | 2x convergence | Stale claim with no heartbeat |
| Heartbeat stale | 3x heartbeat interval | 3x heartbeat interval | No heartbeat update |
| Poll interval | 10,000ms | 10,000ms | How often to scan for tasks |

## Crash Recovery

### Stale Claims (claim-age timeout)

If a claim file exists for longer than `2 * convergenceWindow` and there is no heartbeat file for that task, the claim is considered stale. Any agent can:

1. Delete the stale claim file
2. Reset the task status to `pending`
3. The task becomes available for claiming again

This handles the case where an agent crashes after claiming but before starting execution.

### Stale Heartbeats

If a heartbeat file's mtime is older than `3 * heartbeatInterval`, the agent is considered dead. Any agent can:

1. Delete the stale heartbeat file
2. Reset the task status to `pending`
3. The task becomes available for claiming again

This handles the case where an agent crashes during execution.

## Archive Cleanup

When a task completes (or fails), the winning agent:

1. Writes `results/{task-id}.json` with execution results
2. Writes `archive/{task-id}.json` with full task + result envelope
3. Deletes all files under `claims/{task-id}/`
4. Deletes `heartbeats/{task-id}`
5. Deletes `tasks/{task-id}.json`

Order matters. The archive is written before cleanup, so a crash during cleanup leaves the archive intact.

## Agent ID Format

```
{hostname}-{pid}-{random4hex}
```

- `hostname`: Machine hostname (sanitized, max 32 chars)
- `pid`: Process ID at init time
- `random4hex`: 4 random hex characters for uniqueness

This format ensures uniqueness across containers sharing a hostname (different PIDs) and across restarts of the same PID (different random suffix).

## Delivery Guarantees

**Normal operation:** At-most-once delivery. Each task is claimed and executed by exactly one agent. The convergence-then-tiebreak protocol prevents duplicate execution.

**Under network partition:** At-least-once delivery. If an agent crashes after starting execution but the heartbeat hasn't propagated, another agent may pick up the task after the stale heartbeat timeout. Task handlers SHOULD be idempotent to handle this case correctly.

## Security Model

- All relative paths are validated: no absolute paths, no `..` traversal, no null bytes
- Agent execution uses `spawn()` with `shell: false`. The prompt is passed as a separate argv element, preventing command injection
- The `createExclusive` operation uses `O_CREAT|O_EXCL` flags for atomic file creation

## v2 Compatibility

Tasks without a `status` field (v2 format) are treated as `pending` by the scanner. The `agentfleet init` command detects v2 tasks and warns the user.

## Backend Implementor Guide

To implement a new SyncBackend:

1. Implement all 11 methods from the `SyncBackend` interface
2. Map all I/O errors to `BackendError` subclasses
3. Validate all paths via `validateRelativePath()`
4. `createExclusive` MUST be atomic (fail if file exists)
5. `getRecommendedConvergenceWindow()` should reflect actual sync latency
6. Run the conformance test suite against your implementation
