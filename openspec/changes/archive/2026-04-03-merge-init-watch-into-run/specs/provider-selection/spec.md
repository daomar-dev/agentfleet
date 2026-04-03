## REMOVED Requirements

### Requirement: Select provider during initialization
**Reason**: The `--provider` option and provider normalization are removed. OneDrive is the only supported provider and is hardcoded. This eliminates unnecessary configuration surface.
**Migration**: No action needed. The system always uses OneDrive.

## MODIFIED Requirements

### Requirement: Persist the selected provider locally
The system SHALL persist the provider metadata required to reproduce the chosen sync target in the local Lattix configuration. The provider is always `onedrive`.

#### Scenario: First-time initialization
- **WHEN** bootstrap completes successfully for the first time
- **THEN** the system SHALL write the provider (`onedrive`) and the detected OneDrive sync target metadata to `~/.lattix/config.json`

#### Scenario: Subsequent runs with existing configuration
- **WHEN** bootstrap runs and a valid `~/.lattix/config.json` already exists
- **THEN** the system SHALL load and use the existing configuration without re-detecting OneDrive accounts
