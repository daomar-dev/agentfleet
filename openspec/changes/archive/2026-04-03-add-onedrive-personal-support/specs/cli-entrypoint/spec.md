## MODIFIED Requirements

### Requirement: Init command
The system SHALL provide an `init` command that performs provider-aware initial setup without starting the watcher. The command SHALL accept `--provider <name>`, default to `onedrive`, detect or load the selected sync target for that provider, create or recreate symlinks as needed, generate `config.json`, and report the setup status.

#### Scenario: Running init with the default provider
- **WHEN** the user runs `lattix init`
- **THEN** the system SHALL execute the `onedrive` provider flow, select a sync target according to the configured account-selection rules, create or validate symlinks, generate or update `config.json`, and report the setup status without starting the watcher

#### Scenario: Running init when multiple OneDrive accounts are available
- **WHEN** the user runs `lattix init --provider onedrive` and more than one usable OneDrive account is detected
- **THEN** the system SHALL prompt the user to choose the account to use before setup continues

#### Scenario: Re-running init for a different provider or OneDrive account
- **WHEN** the user reruns `lattix init` and the chosen provider or selected sync target differs from the saved configuration
- **THEN** the system SHALL warn that the existing Lattix symlinks will be deleted and recreated, require confirmation, and only then continue setup
