## Purpose
Define how the system persists the chosen provider metadata for subsequent runs. OneDrive is the only supported provider and is hardcoded.

## Requirements

### Requirement: Persist the selected provider locally
The system SHALL persist the provider metadata required to reproduce the chosen sync target in the local Lattix configuration. The provider is always `onedrive`.

#### Scenario: First-time initialization
- **WHEN** bootstrap completes successfully for the first time
- **THEN** the system SHALL write the provider (`onedrive`) and the detected OneDrive sync target metadata to `~/.lattix/config.json`

#### Scenario: Subsequent runs with existing configuration
- **WHEN** bootstrap runs and a valid `~/.lattix/config.json` already exists
- **THEN** the system SHALL load and use the existing configuration without re-detecting OneDrive accounts
