## MODIFIED Requirements

### Requirement: Single instance enforcement
The system SHALL enforce that only one `lattix run` process is active at a time, regardless of whether it was started in foreground, daemon, or Windows Service mode. The PID file at `~/.lattix/lattix.pid` SHALL be used to track the running instance. Additionally, the system SHALL query SCM for the "Lattix" service state as part of the startup flow.

#### Scenario: Foreground run blocked by existing instance
- **WHEN** the user runs `lattix run` and another Lattix instance (foreground or daemon) is already running
- **THEN** the system SHALL print an error message including the existing PID and exit with a non-zero code

#### Scenario: Daemon run blocked by existing foreground instance
- **WHEN** the user runs `lattix run --daemon` and a foreground `lattix run` is already running
- **THEN** the system SHALL print an error message including the existing PID and exit with a non-zero code

#### Scenario: Run resumes stopped service
- **WHEN** the user runs `lattix run` (with or without `--daemon`) with administrator privileges and the "Lattix" Windows Service is registered but stopped
- **THEN** the system SHALL start the service via SCM, print a confirmation, and exit with code 0

#### Scenario: Run blocked by running service
- **WHEN** the user runs `lattix run` (with or without `--daemon`) and the "Lattix" Windows Service is running
- **THEN** the system SHALL print an error indicating Lattix is already running as a Windows Service and exit with a non-zero code

#### Scenario: Run resume without admin privileges
- **WHEN** the user runs `lattix run` without administrator privileges and the "Lattix" Windows Service is registered but stopped
- **THEN** the system SHALL print an error instructing the user to run as Administrator and exit with a non-zero code

#### Scenario: Stale PID file
- **WHEN** the user runs `lattix run` (foreground or daemon) and a PID file exists but the process is no longer running
- **THEN** the system SHALL overwrite the stale PID file and start normally

### Requirement: Stop command
The system SHALL provide a `lattix stop` command that terminates the running Lattix instance regardless of its run mode. For foreground and daemon modes, it SHALL send SIGTERM via the PID file. For Windows Service mode, it SHALL stop the service via SCM. The service registration is preserved so the service will auto-start on next boot.

#### Scenario: Stopping a running instance
- **WHEN** the user runs `lattix stop` and a Lattix instance (foreground or daemon) is running
- **THEN** the system SHALL send SIGTERM to the running process, print a confirmation with the PID, and clean up the PID file

#### Scenario: Stopping a running service
- **WHEN** the user runs `lattix stop` with administrator privileges and the "Lattix" Windows Service is running
- **THEN** the system SHALL stop the service via SCM, clean up the PID file, and print a confirmation indicating the service was stopped but remains installed (will auto-start on next boot)

#### Scenario: Stopping service without admin privileges
- **WHEN** the user runs `lattix stop` without administrator privileges and the "Lattix" Windows Service is running
- **THEN** the system SHALL print an error instructing the user to run as Administrator and exit with a non-zero code

#### Scenario: No instance running
- **WHEN** the user runs `lattix stop` and no Lattix instance is running (no PID file or stale PID file)
- **THEN** the system SHALL print an informational message indicating Lattix is not running and clean up any stale PID file

### Requirement: Status shows process info
The `lattix status` command SHALL display the running Lattix process information before listing tasks. This includes the PID, the run mode (foreground, daemon, or Windows Service), and the log file location when applicable. Service mode SHALL be detected by querying SCM. The status output SHALL also display the current version and the latest version available on npmjs.org.

#### Scenario: Status with running daemon
- **WHEN** the user runs `lattix status` and a Lattix daemon is running
- **THEN** the system SHALL display the process PID, indicate daemon (background) mode, and show the log file path

#### Scenario: Status with running service
- **WHEN** the user runs `lattix status` and the "Lattix" Windows Service is running
- **THEN** the system SHALL display the process PID, indicate Windows Service mode, show the service name, and show the log file path

#### Scenario: Status with no running instance
- **WHEN** the user runs `lattix status` and no Lattix instance is running
- **THEN** the system SHALL display that Lattix is not running

#### Scenario: Status shows version info
- **WHEN** the user runs `lattix status`
- **THEN** the output SHALL display the current version and the latest version from npmjs.org. If the latest version is newer, it SHALL indicate an update is available
