## ADDED Requirements

### Requirement: Install command
The system SHALL provide an `install` command that registers Lattix as a Windows Service.

#### Scenario: Install command registered
- **WHEN** the user runs `lattix --help`
- **THEN** the help output SHALL list the `install` command with a description

#### Scenario: Install command accepts options
- **WHEN** the user runs `lattix install --poll-interval 30 --concurrency 2`
- **THEN** the system SHALL pass the options to the service installer

### Requirement: Uninstall command
The system SHALL provide an `uninstall` command that removes the Lattix Windows Service.

#### Scenario: Uninstall command registered
- **WHEN** the user runs `lattix --help`
- **THEN** the help output SHALL list the `uninstall` command with a description

## MODIFIED Requirements

### Requirement: Version and help
The system SHALL provide `--version` and `--help` flags following standard CLI conventions. The help output SHALL display the current local version and the latest version available on npmjs.org.

#### Scenario: Showing version
- **WHEN** the user runs `lattix --version`
- **THEN** the system SHALL print the package version from package.json

#### Scenario: Showing help
- **WHEN** the user runs `lattix --help`
- **THEN** the system SHALL display usage information listing all available commands (`run`, `submit`, `status`, `stop`, `install`, `uninstall`) and their options

#### Scenario: Help shows version comparison
- **WHEN** the user runs `lattix --help`
- **THEN** the help output SHALL display the current version and the latest version from npmjs.org. If the latest version is newer, it SHALL indicate an update is available
