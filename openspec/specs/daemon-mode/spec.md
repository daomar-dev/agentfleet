## Purpose
Define the daemon-mode capability: background process detachment, PID-file lifecycle, log-file output redirection, and single-instance enforcement across all run modes.

## Requirements

### Requirement: Daemon process detachment
The system SHALL support a `--daemon` (short form: `-d`) flag on the `run` command that spawns a detached background process and exits the parent immediately.

#### Scenario: Starting in daemon mode
- **WHEN** the user runs `lattix run --daemon`
- **THEN** the system SHALL spawn a detached child process that continues running after the parent exits, and the parent SHALL print the child PID and exit with code 0

#### Scenario: Daemon child inherits options
- **WHEN** the user runs `lattix run --daemon --poll-interval 30 --concurrency 2`
- **THEN** the detached child process SHALL run with poll-interval 30 and concurrency 2

### Requirement: Single instance enforcement
The system SHALL enforce that only one `lattix run` process is active at a time, regardless of whether it was started in foreground or daemon mode. The PID file at `~/.lattix/lattix.pid` SHALL be used to track the running instance.

#### Scenario: Foreground run blocked by existing instance
- **WHEN** the user runs `lattix run` and another Lattix instance (foreground or daemon) is already running
- **THEN** the system SHALL print an error message including the existing PID and exit with a non-zero code

#### Scenario: Daemon run blocked by existing foreground instance
- **WHEN** the user runs `lattix run --daemon` and a foreground `lattix run` is already running
- **THEN** the system SHALL print an error message including the existing PID and exit with a non-zero code

#### Scenario: Stale PID file
- **WHEN** the user runs `lattix run` (foreground or daemon) and a PID file exists but the process is no longer running
- **THEN** the system SHALL overwrite the stale PID file and start normally

### Requirement: PID file management
The system SHALL write a PID file at `~/.lattix/lattix.pid` containing the process ID whenever `lattix run` starts (in any mode), and SHALL remove the PID file on graceful shutdown.

#### Scenario: PID file created on foreground start
- **WHEN** the foreground `lattix run` process starts successfully
- **THEN** the system SHALL write the process PID to `~/.lattix/lattix.pid`

#### Scenario: PID file created on daemon start
- **WHEN** the daemon child process starts successfully
- **THEN** the system SHALL write the process PID to `~/.lattix/lattix.pid`

#### Scenario: PID file removed on shutdown
- **WHEN** the running instance receives SIGINT or SIGTERM
- **THEN** the system SHALL delete `~/.lattix/lattix.pid` before exiting

### Requirement: Log file output
The system SHALL redirect all stdout and stderr output to a log file when running in daemon mode. Each log entry SHALL be prefixed with an ISO-8601 timestamp and a level tag. The `--log-file` option SHALL default to `~/.lattix/lattix.log` and does not need to be explicitly specified.

#### Scenario: Default log file location
- **WHEN** the user runs `lattix run --daemon` without specifying `--log-file`
- **THEN** all output SHALL be written to `~/.lattix/lattix.log`

#### Scenario: Custom log file location
- **WHEN** the user runs `lattix run --daemon --log-file /var/log/lattix.log`
- **THEN** all output SHALL be written to `/var/log/lattix.log`

#### Scenario: Log file entries are timestamped
- **WHEN** the daemon writes a log entry
- **THEN** the entry SHALL be prefixed with an ISO-8601 timestamp and a level indicator (e.g., `[INFO]`, `[ERROR]`)

### Requirement: Stop command
The system SHALL provide a `lattix stop` command that terminates the running Lattix instance by reading the PID file and sending SIGTERM to the process.

#### Scenario: Stopping a running instance
- **WHEN** the user runs `lattix stop` and a Lattix instance is running
- **THEN** the system SHALL send SIGTERM to the running process, print a confirmation with the PID, and clean up the PID file

#### Scenario: No instance running
- **WHEN** the user runs `lattix stop` and no Lattix instance is running (no PID file or stale PID file)
- **THEN** the system SHALL print an informational message indicating Lattix is not running and clean up any stale PID file

### Requirement: Status shows process info
The `lattix status` command SHALL display the running Lattix process information before listing tasks. This includes the PID, the run mode (foreground or daemon), and the log file location when applicable.

#### Scenario: Status with running daemon
- **WHEN** the user runs `lattix status` and a Lattix daemon is running
- **THEN** the system SHALL display the process PID, indicate daemon (background) mode, and show the log file path

#### Scenario: Status with no running instance
- **WHEN** the user runs `lattix status` and no Lattix instance is running
- **THEN** the system SHALL display that Lattix is not running
