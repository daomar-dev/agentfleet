## Purpose
Define the run command that serves as the single primary command for operating AgentFleet on a machine.

## Requirements

### Requirement: Run command starts the task watcher
The system SHALL provide a `run` command that starts the task watcher in the foreground. This is the single primary command for operating AgentFleet on a machine.

#### Scenario: Starting AgentFleet with existing configuration
- **WHEN** the user runs `agentfleet run` and a valid `~/.agentfleet/config.json` exists
- **THEN** the system SHALL load the existing configuration, validate symlinks, and start the task watcher

#### Scenario: Starting AgentFleet without prior configuration
- **WHEN** the user runs `agentfleet run` and no `~/.agentfleet/config.json` exists
- **THEN** the system SHALL auto-detect OneDrive, create directories and symlinks, write `config.json`, and start the task watcher

### Requirement: Run command accepts polling and concurrency options
The system SHALL accept `--poll-interval <seconds>` and `--concurrency <number>` options on the `run` command.

#### Scenario: Custom polling interval
- **WHEN** the user runs `agentfleet run --poll-interval 30`
- **THEN** the system SHALL use a 30-second polling interval instead of the default

#### Scenario: Custom concurrency
- **WHEN** the user runs `agentfleet run --concurrency 3`
- **THEN** the system SHALL allow up to 3 agent processes to run simultaneously

### Requirement: Run command handles graceful shutdown
The system SHALL handle SIGINT and SIGTERM signals by stopping the task watcher and exiting cleanly.

#### Scenario: User presses Ctrl+C
- **WHEN** the task watcher is running and the user sends SIGINT
- **THEN** the system SHALL stop the watcher and exit with code 0
