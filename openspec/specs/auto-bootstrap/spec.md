## Purpose
Define the shared bootstrap function that any command can call to ensure AgentFleet is fully initialized before proceeding.

## Requirements

### Requirement: Auto-bootstrap ensures AgentFleet is initialized
The system SHALL provide a shared bootstrap function that any command can call to ensure AgentFleet is fully initialized before proceeding.

#### Scenario: Bootstrap with existing configuration
- **WHEN** bootstrap is called and `~/.agentfleet/config.json` exists with a valid `onedrivePath`
- **THEN** bootstrap SHALL load the configuration, run setup to validate symlinks and directories, and return the configuration

#### Scenario: Bootstrap without configuration, single OneDrive account
- **WHEN** bootstrap is called, no config exists, and exactly one OneDrive account is detected
- **THEN** bootstrap SHALL select that account, run setup to create directories, symlinks, and config, and return the new configuration

#### Scenario: Bootstrap without configuration, multiple OneDrive accounts
- **WHEN** bootstrap is called, no config exists, and multiple OneDrive accounts are detected
- **THEN** bootstrap SHALL select the first detected account without prompting and proceed with setup

#### Scenario: Bootstrap without configuration, no OneDrive detected
- **WHEN** bootstrap is called, no config exists, and no OneDrive account is detected
- **THEN** bootstrap SHALL throw an error indicating that OneDrive is required

### Requirement: Submit command auto-bootstraps
The `submit` command SHALL call the shared bootstrap function instead of failing when `~/.agentfleet/tasks/` does not exist.

#### Scenario: Submitting a task without prior initialization
- **WHEN** the user runs `agentfleet submit --prompt "..." --working-dir "."` and AgentFleet has not been initialized
- **THEN** the system SHALL auto-initialize (detect OneDrive, create directories, config) and then create the task file

### Requirement: Status command auto-bootstraps
The `status` command SHALL call the shared bootstrap function instead of failing when `~/.agentfleet/tasks/` does not exist.

#### Scenario: Checking status without prior initialization
- **WHEN** the user runs `agentfleet status` and AgentFleet has not been initialized
- **THEN** the system SHALL auto-initialize and then display the task list (which will be empty)
