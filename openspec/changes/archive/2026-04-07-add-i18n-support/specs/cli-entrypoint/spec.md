## MODIFIED Requirements

### Requirement: Version and help
The system SHALL provide `--version` and `--help` flags following standard CLI conventions. The help output SHALL display the current local version and the latest version available on npmjs.org. All help text, command descriptions, and option descriptions SHALL be sourced from the i18n message catalog using the `t()` function, displaying in the user's detected locale.

#### Scenario: Showing version
- **WHEN** the user runs `lattix --version`
- **THEN** the system SHALL print the package version from package.json

#### Scenario: Showing help
- **WHEN** the user runs `lattix --help`
- **THEN** the system SHALL display usage information listing all available commands (`run`, `submit`, `status`, `stop`, `install`, `uninstall`) and their options, with all descriptive text in the user's detected locale

#### Scenario: Help shows version comparison
- **WHEN** the user runs `lattix --help`
- **THEN** the help output SHALL display the current version and the latest version from npmjs.org. If the latest version is newer, it SHALL indicate an update is available, with the update message in the user's detected locale

#### Scenario: Help in Simplified Chinese
- **WHEN** the detected locale is `zh-CN` and the user runs `lattix --help`
- **THEN** all command descriptions, option descriptions, and informational text SHALL be displayed in Simplified Chinese
