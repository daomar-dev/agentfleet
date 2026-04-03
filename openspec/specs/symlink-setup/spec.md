## Purpose
Define the local Lattix home layout, OneDrive symlink targets, permission fallback behavior, and legacy migration rules.

## Requirements

### Requirement: Migrate legacy agentbroker storage paths
The system SHALL detect an existing legacy `agentbroker` setup and SHALL migrate or reuse it when adopting the Lattix path layout, provided no conflicting Lattix paths already exist.

#### Scenario: Safe migration from legacy paths
- **WHEN** `~/.agentbroker` exists and `~/.lattix` does not exist
- **THEN** the system SHALL migrate or reuse the legacy local directory contents under `~/.lattix` before continuing setup

#### Scenario: Conflicting legacy and new paths
- **WHEN** both the legacy and new-brand local or synced paths exist and contain conflicting content
- **THEN** the system SHALL stop automatic migration and display a clear error describing the manual migration steps required

### Requirement: Create Lattix home directory
The system SHALL create a `~/.lattix` directory in the user's home directory if it does not already exist. This directory serves as the stable entry point for all Lattix file operations.

#### Scenario: First-time setup
- **WHEN** the system starts for the first time and `~/.lattix` does not exist
- **THEN** the system SHALL create `~/.lattix` directory and proceed with symlink creation

#### Scenario: Directory already exists
- **WHEN** the system starts and `~/.lattix` already exists with valid symlinks
- **THEN** the system SHALL validate the existing symlinks point to the correct OneDrive locations and proceed without re-creation

### Requirement: Create symlinks to OneDrive subdirectories
The system SHALL create symbolic links inside `~/.lattix` that point to corresponding directories within the selected OneDrive sync folder. The symlink targets SHALL be:
- `~/.lattix/tasks` → `<OneDrivePath>\Lattix\tasks`
- `~/.lattix/output` → `<OneDrivePath>\Lattix\output`

#### Scenario: Successful symlink creation
- **WHEN** the system has resolved the selected OneDrive sync folder and has appropriate permissions
- **THEN** the system SHALL create the `Lattix\tasks` and `Lattix\output` directories in the selected OneDrive folder if they do not exist, and create symlinks from `~/.lattix/tasks` and `~/.lattix/output` pointing to those directories

#### Scenario: Symlinks already exist and are valid
- **WHEN** symlinks already exist and point to the selected OneDrive directories
- **THEN** the system SHALL log that symlinks are valid and proceed without modification

#### Scenario: Symlinks would change because the selected target changed
- **WHEN** symlinks exist but the selected provider or OneDrive account would point them to a different target
- **THEN** the system SHALL warn the user before deleting and recreating those symlinks, and SHALL only replace them after the user confirms

#### Scenario: User declines symlink replacement
- **WHEN** the system warns that symlinks would be deleted and recreated and the user does not confirm
- **THEN** the system SHALL stop re-initialization without modifying the existing symlinks

### Requirement: Handle symlink permission failure
The system SHALL handle the case where symlink creation fails due to insufficient permissions on Windows.

#### Scenario: Symlink creation fails due to permissions
- **WHEN** symlink creation fails because Developer Mode is not enabled and the user lacks symlink privileges
- **THEN** the system SHALL attempt to create directory junctions as a fallback, and if that also fails, display a clear error message with instructions to enable Developer Mode in Windows Settings

### Requirement: Create local configuration file
The system SHALL create a `~/.lattix/config.json` file to store local machine configuration including the selected provider, the selected OneDrive path, and machine-specific settings.

#### Scenario: Config file creation on first run
- **WHEN** the system sets up for the first time
- **THEN** the system SHALL create `config.json` with the selected provider, the selected OneDrive path, machine hostname, and default settings (e.g., default agent command, polling interval)

#### Scenario: Config file update on provider or account switch
- **WHEN** re-initialization completes with a different selected provider or OneDrive account
- **THEN** the system SHALL update `config.json` so the stored provider and selected OneDrive path match the new setup
