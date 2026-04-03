## ADDED Requirements

### Requirement: Select provider during initialization
The system SHALL accept a `--provider <name>` option on `lattix init`. When the option is omitted, the system MUST default to `onedrive`.

#### Scenario: Running init without an explicit provider
- **WHEN** the user runs `lattix init`
- **THEN** the system SHALL run initialization with provider `onedrive`

#### Scenario: Running init with the onedrive provider
- **WHEN** the user runs `lattix init --provider onedrive`
- **THEN** the system SHALL execute the OneDrive-specific initialization flow

#### Scenario: Running init with an unsupported provider
- **WHEN** the user runs `lattix init --provider dropbox`
- **THEN** the system SHALL exit with a clear error that lists the supported providers

### Requirement: Persist the selected provider locally
The system SHALL persist the selected provider and the metadata required to reproduce the chosen sync target in the local Lattix configuration.

#### Scenario: First-time initialization
- **WHEN** initialization completes successfully
- **THEN** the system SHALL write the selected provider and the selected sync target metadata to `~/.lattix/config.json`

#### Scenario: Re-running init with a different provider selection
- **WHEN** the user reruns `lattix init` with a provider or target selection that differs from the saved configuration
- **THEN** the system SHALL update the local configuration to reflect the new provider and selected sync target after confirmation and setup succeed
