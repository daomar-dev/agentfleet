## MODIFIED Requirements

### Requirement: Watch command
The system SHALL provide a `run` command that starts the task watcher in the foreground. This is the primary operating mode of Lattix. The `run` command SHALL additionally accept `--daemon` and `--log-file <path>` options to support background execution.

#### Scenario: Starting watch mode
- **WHEN** the user runs `lattix run`
- **THEN** the system SHALL perform OneDrive detection, validate/create symlinks, scan for pending tasks, and begin watching for new tasks. The process SHALL log its status to stdout.

#### Scenario: Watch mode with custom polling interval
- **WHEN** the user runs `lattix run --poll-interval 30`
- **THEN** the system SHALL use a 30-second polling interval instead of the default 10 seconds

#### Scenario: Watch mode with custom concurrency
- **WHEN** the user runs `lattix run --concurrency 3`
- **THEN** the system SHALL allow up to 3 agent processes to run simultaneously

#### Scenario: Starting in daemon mode
- **WHEN** the user runs `lattix run --daemon`
- **THEN** the system SHALL spawn a detached background process, print the child PID, and exit the parent process

#### Scenario: Daemon mode with custom log file
- **WHEN** the user runs `lattix run --daemon --log-file C:\logs\lattix.log`
- **THEN** the system SHALL redirect all daemon output to `C:\logs\lattix.log`

## ADDED Requirements

### Requirement: Stop command
The system SHALL provide a `stop` command that terminates the running Lattix instance.

#### Scenario: Stopping Lattix
- **WHEN** the user runs `lattix stop`
- **THEN** the system SHALL terminate the running Lattix process and clean up the PID file

### Requirement: Status shows process info
The `status` command SHALL display running process information (PID, mode, log file) before listing tasks.

#### Scenario: Status output includes process info
- **WHEN** the user runs `lattix status`
- **THEN** the system SHALL show whether Lattix is running, its PID, run mode, and log file location (if daemon)
