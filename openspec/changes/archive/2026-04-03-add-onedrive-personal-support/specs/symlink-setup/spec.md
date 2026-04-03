## MODIFIED Requirements

### Requirement: Create symlinks to OneDrive subdirectories
The system SHALL create symbolic links inside `~/.lattix` that point to corresponding directories within the selected OneDrive sync folder. The symlink targets SHALL be:
- `~/.lattix/tasks` → `<OneDrivePath>\Lattix\tasks`
- `~/.lattix/output` → `<OneDrivePath>\Lattix\output`

#### Scenario: Successful symlink creation
- **WHEN** the system has resolved the selected OneDrive sync folder and has appropriate permissions
- **THEN** the system SHALL create the `Lattix\tasks` and `Lattix\output` directories in the selected OneDrive folder if they do not exist, and create symlinks from `~/.lattix/tasks` and `~/.lattix/output` pointing to those directories

#### Scenario: Symlinks already exist and are valid
- **WHEN** symlinks already exist and point to the selected OneDrive directories
- **THEN** the system SHALL log that the symlinks are valid and proceed without modification

#### Scenario: Symlinks would change because the selected target changed
- **WHEN** symlinks exist but the selected provider or OneDrive account would point them to a different target
- **THEN** the system SHALL warn the user before deleting and recreating those symlinks, and SHALL only replace them after the user confirms

#### Scenario: User declines symlink replacement
- **WHEN** the system warns that symlinks would be deleted and recreated and the user does not confirm
- **THEN** the system SHALL stop re-initialization without modifying the existing symlinks

### Requirement: Create local configuration file
The system SHALL create a `~/.lattix/config.json` file to store local machine configuration including the selected provider, the selected OneDrive path, and machine-specific settings.

#### Scenario: Config file creation on first run
- **WHEN** the system sets up for the first time
- **THEN** the system SHALL create `config.json` with the selected provider, the selected OneDrive path, machine hostname, and default settings

#### Scenario: Config file update on provider or account switch
- **WHEN** re-initialization completes with a different selected provider or OneDrive account
- **THEN** the system SHALL update `config.json` so the stored provider and selected OneDrive path match the new setup
