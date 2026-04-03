## REMOVED Requirements

### Requirement: Init command
**Reason**: Replaced by the unified `run` command that auto-initializes and starts the watcher in one step. Explicit initialization is no longer a separate user-facing action.
**Migration**: Use `lattix run` instead of `lattix init`. The `run` command performs all setup automatically on first use.

### Requirement: Watch command
**Reason**: Replaced by the unified `run` command. The `watch` behavior (task watching) is now the default behavior of `run`.
**Migration**: Use `lattix run` instead of `lattix watch`. All options (`--poll-interval`, `--concurrency`) are available on `run`.

## MODIFIED Requirements

### Requirement: npx-compatible CLI entrypoint
The system SHALL provide a CLI entrypoint that can be invoked via `npx lattix <command>`. The package.json MUST define a `bin` field mapping `lattix` to the compiled CLI script.

#### Scenario: Running via npx
- **WHEN** a user runs `npx lattix run`
- **THEN** the system SHALL auto-initialize if needed and start the task watcher

### Requirement: Version and help
The system SHALL provide `--version` and `--help` flags following standard CLI conventions.

#### Scenario: Showing version
- **WHEN** the user runs `lattix --version`
- **THEN** the system SHALL print the package version from package.json

#### Scenario: Showing help
- **WHEN** the user runs `lattix --help`
- **THEN** the system SHALL display usage information listing all available commands (`run`, `submit`, `status`) and their options
