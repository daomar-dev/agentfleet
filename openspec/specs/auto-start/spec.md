## Purpose
Define cross-platform auto-start registration for supported desktop platforms, including installation, removal, and state query behavior used by the AgentFleet CLI.

## Requirements

### Requirement: Cross-platform auto-start installation
The system SHALL provide platform-specific auto-start registration for supported desktop platforms through the `agentfleet install` command. The registered auto-start action SHALL run `npx -y @daomar/agentfleet run -d` for the current user at login. Windows SHALL use a Scheduled Task named `AgentFleet`; macOS SHALL use a per-user LaunchAgent plist under `~/Library/LaunchAgents`.

#### Scenario: Install auto-start on Windows
- **WHEN** the user runs `agentfleet install` on Windows and no auto-start registration exists
- **THEN** the system SHALL create the `AgentFleet` Scheduled Task with the existing login and wake triggers, start the daemon immediately, and print a confirmation

#### Scenario: Install auto-start on macOS
- **WHEN** the user runs `agentfleet install` on macOS and no auto-start registration exists
- **THEN** the system SHALL write a per-user LaunchAgent plist under `~/Library/LaunchAgents`, load or bootstrap it for the current user session, start the daemon immediately, and print a confirmation

#### Scenario: Install auto-start on unsupported platform
- **WHEN** the user runs `agentfleet install` on a platform other than Windows or macOS
- **THEN** the system SHALL print a clear unsupported-platform error and exit with a non-zero code without creating any auto-start registration

### Requirement: Cross-platform auto-start removal
The system SHALL remove the current platform's auto-start registration through the `agentfleet uninstall` command and stop the running AgentFleet instance if one exists.

#### Scenario: Uninstall auto-start on Windows
- **WHEN** the user runs `agentfleet uninstall` on Windows and the `AgentFleet` Scheduled Task exists
- **THEN** the system SHALL stop the running AgentFleet instance if needed, remove the Scheduled Task, and print a confirmation

#### Scenario: Uninstall auto-start on macOS
- **WHEN** the user runs `agentfleet uninstall` on macOS and the LaunchAgent registration exists
- **THEN** the system SHALL stop the running AgentFleet instance if needed, unload or bootout the LaunchAgent, remove the plist file, and print a confirmation

#### Scenario: Uninstall auto-start on unsupported platform
- **WHEN** the user runs `agentfleet uninstall` on a platform other than Windows or macOS
- **THEN** the system SHALL print a clear unsupported-platform error and exit with a non-zero code without modifying daemon state

### Requirement: Cross-platform auto-start state query
The system SHALL provide the ability to query whether the current platform's AgentFleet auto-start registration is present so that `run` and `status` can report auto-start state consistently.

#### Scenario: Query installed auto-start on Windows
- **WHEN** the system queries auto-start state on Windows and the `AgentFleet` Scheduled Task exists
- **THEN** the query SHALL return an installed state

#### Scenario: Query installed auto-start on macOS
- **WHEN** the system queries auto-start state on macOS and the LaunchAgent plist exists for the configured AgentFleet label
- **THEN** the query SHALL return an installed state

#### Scenario: Query missing auto-start registration
- **WHEN** the system queries auto-start state on a supported platform and no AgentFleet registration exists
- **THEN** the query SHALL return a not-installed state
