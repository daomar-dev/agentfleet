## Purpose
Define the scheduled task capability: auto-start on login via Windows scheduled tasks (`schtasks`), task state query, and install/uninstall commands.

## Requirements

### Requirement: Scheduled task installation
On Windows, the system SHALL provide a `agentfleet install` command implementation that creates a Windows Scheduled Task named `AgentFleet` with two triggers: (1) an ONLOGON trigger and (2) a system-wake event trigger that fires when Windows resumes from sleep or hibernation. The wake trigger SHALL subscribe to the System event log for events from `Microsoft-Windows-Power-Troubleshooter` with EventID 1. The task runs under the current user's account and requires no administrator privileges. After creating the task, the command SHALL start the daemon immediately.

#### Scenario: Installing the scheduled task
- **WHEN** the user runs `agentfleet install` on Windows and no scheduled task exists
- **THEN** the system SHALL create a scheduled task with both an AtLogOn trigger and a system-wake event trigger, start the daemon immediately, and print a confirmation

#### Scenario: Install when task already exists
- **WHEN** the user runs `agentfleet install` on Windows and the `AgentFleet` scheduled task already exists
- **THEN** the system SHALL print an informational message showing the task name and current process status

#### Scenario: Install failure
- **WHEN** the user runs `agentfleet install` on Windows and task creation fails
- **THEN** the system SHALL print an error message and exit with a non-zero code

#### Scenario: Wake from sleep triggers daemon restart
- **WHEN** the computer resumes from sleep or hibernation on Windows and the `AgentFleet` scheduled task is installed
- **THEN** Windows SHALL trigger the scheduled task, which runs `npx -y @daomar/agentfleet run -d`. If the daemon is still alive, the run command's single-instance guard SHALL detect the existing PID and exit cleanly. If the daemon has died, it SHALL start a new daemon instance.

#### Scenario: Wake trigger does not duplicate running daemon
- **WHEN** the computer resumes from sleep on Windows and the daemon process is still running
- **THEN** the triggered `agentfleet run -d` SHALL detect the existing daemon via PID file check and exit with code 0 without starting a duplicate

### Requirement: Scheduled task removal
On Windows, the system SHALL provide a `agentfleet uninstall` command implementation that stops the running AgentFleet instance (if any) and removes the scheduled task.

#### Scenario: Uninstalling the scheduled task
- **WHEN** the user runs `agentfleet uninstall` on Windows and the `AgentFleet` scheduled task exists
- **THEN** the system SHALL kill the running process (if any), remove the scheduled task via `schtasks /delete`, and print a confirmation

#### Scenario: Uninstall when no task exists
- **WHEN** the user runs `agentfleet uninstall` on Windows and no `AgentFleet` scheduled task exists
- **THEN** the system SHALL print an informational message indicating no task is installed

### Requirement: Scheduled task state query
On Windows, the system SHALL provide the ability to query whether a `AgentFleet` scheduled task is registered.

#### Scenario: Query installed task
- **WHEN** the system queries scheduled-task state on Windows and the `AgentFleet` task exists
- **THEN** the query SHALL return an "installed" state

#### Scenario: Query non-existent task
- **WHEN** the system queries scheduled-task state on Windows and no `AgentFleet` task exists
- **THEN** the query SHALL return a "not-installed" state
