# i18n-cli

CLI-specific internationalization: locale detection, help text localization, command output localization, and message catalog management for the CLI.

## Requirements

### Requirement: CLI locale detection
The CLI SHALL detect the user's locale at startup using the following precedence order:
1. The `LATTIX_LANG` environment variable (if set)
2. The OS display language via `Intl.DateTimeFormat().resolvedOptions().locale`
3. Falls back to `en-US`

If the detected locale starts with `zh`, the system SHALL use `zh-CN`. Otherwise, it SHALL use `en-US`.

#### Scenario: OS language is Simplified Chinese
- **WHEN** the OS display language is `zh-CN` or `zh-Hans` and `LATTIX_LANG` is not set
- **THEN** the CLI SHALL use the `zh-CN` message catalog for all user-facing output

#### Scenario: OS language is not Chinese
- **WHEN** the OS display language is `en-US`, `fr-FR`, `ja-JP`, or any non-Chinese locale
- **THEN** the CLI SHALL use the `en-US` message catalog for all user-facing output

#### Scenario: LATTIX_LANG override
- **WHEN** the `LATTIX_LANG` environment variable is set to `zh-CN`
- **THEN** the CLI SHALL use the `zh-CN` message catalog regardless of the OS display language

### Requirement: CLI help text localization
All Commander.js command descriptions, option descriptions, and help text SHALL be sourced from the i18n message catalog using the `t()` function.

#### Scenario: Help text in Chinese
- **WHEN** the detected locale is `zh-CN` and the user runs `lattix --help`
- **THEN** the help output SHALL display command descriptions and option help text in Simplified Chinese

#### Scenario: Help text in English
- **WHEN** the detected locale is `en-US` and the user runs `lattix --help`
- **THEN** the help output SHALL display command descriptions and option help text in English

### Requirement: Command output localization
All user-facing console output from CLI commands (success messages, error messages, status labels, informational text) SHALL use the `t()` function for text content. Emoji prefixes SHALL remain unchanged across locales.

#### Scenario: Run command output in Chinese
- **WHEN** the locale is `zh-CN` and the user runs `lattix run`
- **THEN** all status messages, error messages, and informational text SHALL be displayed in Simplified Chinese, with emoji prefixes preserved

#### Scenario: Submit command output in Chinese
- **WHEN** the locale is `zh-CN` and the user submits a task
- **THEN** the success confirmation and instructions SHALL be displayed in Simplified Chinese

### Requirement: Log file localization
User-facing log messages written to log files by the CLI SHALL use the active locale's message catalog. Debug-level or internal diagnostic messages MAY remain in English.

#### Scenario: Log messages match locale
- **WHEN** the locale is `zh-CN` and the CLI writes log entries
- **THEN** user-facing log messages (info, warn, error levels) SHALL be written in Simplified Chinese

### Requirement: CLI i18n message catalog
The CLI SHALL maintain message catalog JSON files at `src/locales/en-US.json` and `src/locales/zh-CN.json` containing all user-facing strings used by CLI commands and services.

#### Scenario: Catalog file locations
- **WHEN** the CLI project is built
- **THEN** the message catalogs at `src/locales/en-US.json` and `src/locales/zh-CN.json` SHALL be included in the build output

### Requirement: CLI JSON output locale independence
The CLI's `--json` output flag SHALL produce locale-independent output. JSON-formatted output from commands like `lattix status --json` SHALL remain in English regardless of the active locale. Only human-readable text output SHALL be affected by locale settings.

#### Scenario: JSON output unaffected by zh-CN locale
- **WHEN** the locale is `zh-CN` and the user runs `lattix status --json`
- **THEN** the JSON output SHALL contain English field names and values, identical to en-US locale output

#### Scenario: LATTIX_LANG override for scripts
- **WHEN** a script sets `LATTIX_LANG=en-US` before invoking a CLI command
- **THEN** all text output SHALL be in English regardless of the OS display language

### Requirement: CLI date/time locale formatting
The CLI SHALL format user-facing date and time values (e.g., task creation time, last active time in status output) using the active locale's conventions via `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`.

#### Scenario: Status dates in Chinese
- **WHEN** the locale is `zh-CN` and the user runs `lattix status`
- **THEN** date and time values in the output SHALL use Chinese date formatting conventions

#### Scenario: Status dates in English
- **WHEN** the locale is `en-US` and the user runs `lattix status`
- **THEN** date and time values in the output SHALL use English date formatting conventions
