## Purpose
Define the Windows Service capability: service installation, uninstallation, SCM integration, admin privilege detection, and service-mode awareness for existing commands.

## Requirements

### Requirement: Service installation
The system SHALL provide a `lattix install` command that copies the Lattix package to `~/.lattix/app/`, registers a Windows Service named "Lattix" pointing to the copied script, configures it for automatic startup on boot with crash recovery, and starts it immediately. The service SHALL run under the current user's account. The command SHALL accept `--poll-interval` and `--concurrency` options to configure the service's runtime behavior.

#### Scenario: Installing the service
- **WHEN** the user runs `lattix install` (e.g., via `npx lattix install`) with administrator privileges and no Lattix instance is running
- **THEN** the system SHALL copy the Lattix package to `~/.lattix/app/`, register a Windows Service named "Lattix" that executes the copied CLI script, start the service, and print a confirmation with the service name

#### Scenario: Installing with custom options
- **WHEN** the user runs `lattix install --poll-interval 30 --concurrency 2` with administrator privileges
- **THEN** the system SHALL register the service with poll-interval 30 and concurrency 2 baked into the service configuration

#### Scenario: Upgrading the service
- **WHEN** the user runs `lattix install` and the "Lattix" service is already registered in SCM
- **THEN** the system SHALL stop the service, update `~/.lattix/app/` with the current version, and restart the service

#### Scenario: Install blocked by existing non-service instance
- **WHEN** the user runs `lattix install` and a Lattix instance is already running in foreground or daemon mode
- **THEN** the system SHALL print an error indicating Lattix is already running and exit with a non-zero code

#### Scenario: Install without administrator privileges
- **WHEN** the user runs `lattix install` without administrator privileges
- **THEN** the system SHALL print an error message instructing the user to run the command as Administrator and exit with a non-zero code

### Requirement: Service uninstallation
The system SHALL provide a `lattix uninstall` command that stops the running service (if running), removes the Windows Service registration, and deletes the `~/.lattix/app/` directory.

#### Scenario: Uninstalling the service
- **WHEN** the user runs `lattix uninstall` with administrator privileges and the "Lattix" service is registered
- **THEN** the system SHALL stop the service, remove the service registration, delete `~/.lattix/app/`, clean up the PID file, and print a confirmation

#### Scenario: Uninstall when service not installed
- **WHEN** the user runs `lattix uninstall` and no "Lattix" service is registered
- **THEN** the system SHALL print an informational message indicating no service is installed

#### Scenario: Uninstall without administrator privileges
- **WHEN** the user runs `lattix uninstall` without administrator privileges
- **THEN** the system SHALL print an error message instructing the user to run the command as Administrator and exit with a non-zero code

### Requirement: SCM service state query
The system SHALL provide the ability to query the Windows Service Control Manager for the state of the "Lattix" service. The query SHALL NOT require administrator privileges.

#### Scenario: Query running service
- **WHEN** the system queries SCM and the "Lattix" service exists and is running
- **THEN** the query SHALL return a "running" state

#### Scenario: Query stopped service
- **WHEN** the system queries SCM and the "Lattix" service exists but is stopped
- **THEN** the query SHALL return a "stopped" state

#### Scenario: Query non-existent service
- **WHEN** the system queries SCM and no "Lattix" service is registered
- **THEN** the query SHALL return a "not-installed" state

### Requirement: Administrator privilege detection
The system SHALL detect whether the current process is running with administrator privileges before attempting service installation or uninstallation.

#### Scenario: Detecting admin privileges
- **WHEN** the system checks for administrator privileges
- **THEN** it SHALL return true if running elevated, false otherwise, without throwing errors
