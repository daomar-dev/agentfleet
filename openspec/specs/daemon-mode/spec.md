## Purpose
Define the daemon-mode capability: background process detachment, PID-file lifecycle, log-file output redirection, and single-instance enforcement across all run modes.

## Requirements

### Requirement: Daemon process detachment
The system SHALL support a `--daemon` (short form: `-d`) flag on the `run` command that spawns a detached background process and exits the parent immediately.

#### Scenario: Starting in daemon mode
- **WHEN** the user runs `agentfleet run --daemon`
- **THEN** the system SHALL spawn a detached child process that continues running after the parent exits, and the parent SHALL print the child PID and exit with code 0

#### Scenario: Daemon child inherits options
- **WHEN** the user runs `agentfleet run --daemon --poll-interval 30 --concurrency 2`
- **THEN** the detached child process SHALL run with poll-interval 30 and concurrency 2

### Requirement: Single instance enforcement
The system SHALL enforce that only one `agentfleet run` process is active at a time, regardless of whether it was started in foreground or daemon mode. The PID file at `~/.agentfleet/agentfleet.pid` SHALL be used to track the running instance. When auto-start is installed on the current platform, the `run` command SHALL display auto-start status information.

#### Scenario: Foreground run blocked by existing instance
- **WHEN** the user runs `agentfleet run` and another AgentFleet instance (foreground or daemon) is already running
- **THEN** the system SHALL print an error message including the existing PID and exit with a non-zero code

#### Scenario: Daemon run blocked by existing foreground instance
- **WHEN** the user runs `agentfleet run --daemon` and a foreground `agentfleet run` is already running
- **THEN** the system SHALL print an error message including the existing PID and exit with a non-zero code

#### Scenario: Run with auto-start installed and running
- **WHEN** the user runs `agentfleet run` and an auto-start registration is installed on the current platform and the daemon is running
- **THEN** the system SHALL display that AgentFleet is running with auto-start on login and exit with code 0

#### Scenario: Run with auto-start installed but not running
- **WHEN** the user runs `agentfleet run` and an auto-start registration is installed on the current platform but the daemon is not running
- **THEN** the system SHALL display that auto-start is configured and proceed to start the daemon without creating a duplicate registration

#### Scenario: Stale PID file
- **WHEN** the user runs `agentfleet run` (foreground or daemon) and a PID file exists but the process is no longer running
- **THEN** the system SHALL overwrite the stale PID file and start normally

### Requirement: PID file management
The system SHALL write a PID file at `~/.agentfleet/agentfleet.pid` containing the process ID whenever `agentfleet run` starts (in any mode), and SHALL remove the PID file on graceful shutdown.

#### Scenario: PID file created on foreground start
- **WHEN** the foreground `agentfleet run` process starts successfully
- **THEN** the system SHALL write the process PID to `~/.agentfleet/agentfleet.pid`

#### Scenario: PID file created on daemon start
- **WHEN** the daemon child process starts successfully
- **THEN** the system SHALL write the process PID to `~/.agentfleet/agentfleet.pid`

#### Scenario: PID file removed on shutdown
- **WHEN** the running instance receives SIGINT or SIGTERM
- **THEN** the system SHALL delete `~/.agentfleet/agentfleet.pid` before exiting

### Requirement: Log file output
The system SHALL redirect all stdout and stderr output to a log file when running in daemon mode. Each log entry SHALL be prefixed with an ISO-8601 timestamp and a level tag. The `--log-file` option SHALL default to `~/.agentfleet/agentfleet.log` and does not need to be explicitly specified.

#### Scenario: Default log file location
- **WHEN** the user runs `agentfleet run --daemon` without specifying `--log-file`
- **THEN** all output SHALL be written to `~/.agentfleet/agentfleet.log`

#### Scenario: Custom log file location
- **WHEN** the user runs `agentfleet run --daemon --log-file /var/log/agentfleet.log`
- **THEN** all output SHALL be written to `/var/log/agentfleet.log`

#### Scenario: Log file entries are timestamped
- **WHEN** the daemon writes a log entry
- **THEN** the entry SHALL be prefixed with an ISO-8601 timestamp and a level indicator (e.g., `[INFO]`, `[ERROR]`)

### Requirement: Stop command
The system SHALL provide a `agentfleet stop` command that terminates the running AgentFleet instance by reading the PID file and sending SIGTERM to the process. The stop command is PID-based only and does not modify auto-start registrations.

#### Scenario: Stopping a running instance
- **WHEN** the user runs `agentfleet stop` and a AgentFleet instance is running
- **THEN** the system SHALL send SIGTERM to the running process, print a confirmation with the PID, and clean up the PID file

#### Scenario: No instance running
- **WHEN** the user runs `agentfleet stop` and no AgentFleet instance is running (no PID file or stale PID file)
- **THEN** the system SHALL print an informational message indicating AgentFleet is not running and clean up any stale PID file

### Requirement: Status shows process info
The `agentfleet status` command SHALL display the running AgentFleet process information before listing tasks. This includes the PID, the run mode (foreground, daemon, or auto-start on login), and the log file location when applicable. The status output SHALL also display the current version and the latest version available on npmjs.org.

#### Scenario: Status with running daemon
- **WHEN** the user runs `agentfleet status` and a AgentFleet daemon is running (no auto-start registration)
- **THEN** the system SHALL display the process PID, indicate daemon (background) mode, and show the log file path

#### Scenario: Status with auto-start and running
- **WHEN** the user runs `agentfleet status` and an auto-start registration is installed on the current platform and the daemon is running
- **THEN** the system SHALL display the process PID and indicate "daemon (auto-start on login)" mode

#### Scenario: Status with auto-start but not running
- **WHEN** the user runs `agentfleet status` and an auto-start registration is installed on the current platform but the daemon is not running
- **THEN** the system SHALL display that auto-start is configured but AgentFleet is not currently running

#### Scenario: Status with no running instance
- **WHEN** the user runs `agentfleet status` and no AgentFleet instance is running
- **THEN** the system SHALL display that AgentFleet is not running

#### Scenario: Status shows version info
- **WHEN** the user runs `agentfleet status`
- **THEN** the output SHALL display the current version and the latest version from npmjs.org. If the latest version is newer, it SHALL indicate an update is available
