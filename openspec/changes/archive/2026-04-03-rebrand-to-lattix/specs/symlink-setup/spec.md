## ADDED Requirements

### Requirement: Migrate legacy agentbroker storage paths
The system SHALL detect an existing legacy `agentbroker` setup and SHALL migrate or reuse it when adopting the Lattix path layout, provided no conflicting Lattix paths already exist.

#### Scenario: Safe migration from legacy paths
- **WHEN** `~/.agentbroker` exists and `~/.lattix` does not exist
- **THEN** the system SHALL migrate or reuse the legacy local directory contents under `~/.lattix` before continuing setup

#### Scenario: Conflicting legacy and new paths
- **WHEN** both the legacy and new-brand local or synced paths exist and contain conflicting content
- **THEN** the system SHALL stop automatic migration and display a clear error describing the manual migration steps required

## MODIFIED Requirements

### Requirement: Create agentbroker home directory
The system SHALL create a `~/.lattix` directory in the user's home directory if it does not already exist. This directory serves as the stable entry point for all Lattix file operations.

#### Scenario: First-time setup
- **WHEN** the system starts for the first time and `~/.lattix` does not exist
- **THEN** the system SHALL create `~/.lattix` directory and proceed with symlink creation

#### Scenario: Directory already exists
- **WHEN** the system starts and `~/.lattix` already exists with valid symlinks
- **THEN** the system SHALL validate the existing symlinks point to the correct OneDrive locations and proceed without re-creation

### Requirement: Create symlinks to OneDrive subdirectories
The system SHALL create symbolic links inside `~/.lattix` that point to corresponding directories within the OneDrive sync folder. The symlink targets SHALL be:
- `~/.lattix/tasks` → `<OneDrivePath>/Lattix/tasks`
- `~/.lattix/output` → `<OneDrivePath>/Lattix/output`

#### Scenario: Successful symlink creation
- **WHEN** the system has detected the OneDrive sync folder and has appropriate permissions
- **THEN** the system SHALL create the `Lattix/tasks` and `Lattix/output` directories in OneDrive if they don't exist, and create symlinks from `~/.lattix/tasks` and `~/.lattix/output` pointing to those OneDrive directories

#### Scenario: Symlinks already exist and are valid
- **WHEN** symlinks already exist and point to the correct OneDrive directories
- **THEN** the system SHALL log that symlinks are valid and proceed without modification

#### Scenario: Symlinks exist but point to wrong location
- **WHEN** symlinks exist but point to a different OneDrive path (e.g., user switched accounts)
- **THEN** the system SHALL remove the stale symlinks and create new ones pointing to the correct location

### Requirement: Create local configuration file
The system SHALL create a `~/.lattix/config.json` file to store local machine configuration including the detected OneDrive path and machine-specific settings.

#### Scenario: Config file creation on first run
- **WHEN** the system sets up for the first time
- **THEN** the system SHALL create `config.json` with the detected OneDrive path, machine hostname, and default settings (e.g., default agent command, polling interval)
