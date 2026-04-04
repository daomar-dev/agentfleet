## MODIFIED Requirements

### Requirement: Scheduled task installation
The system SHALL provide a `lattix install` command that creates a Windows scheduled task named "Lattix" with two triggers: (1) an ONLOGON trigger and (2) a system-wake event trigger that fires when Windows resumes from sleep or hibernation. The wake trigger SHALL subscribe to the System event log for events from `Microsoft-Windows-Power-Troubleshooter` with EventID 1. The task runs under the current user's account and requires no administrator privileges. After creating the task, the command SHALL start the daemon immediately.

#### Scenario: Installing the scheduled task
- **WHEN** the user runs `lattix install` and no scheduled task exists
- **THEN** the system SHALL create a scheduled task with both an AtLogOn trigger and a system-wake event trigger, start the daemon immediately, and print a confirmation

#### Scenario: Install when task already exists
- **WHEN** the user runs `lattix install` and the "Lattix" scheduled task already exists
- **THEN** the system SHALL print an informational message showing the task name and current process status

#### Scenario: Install failure
- **WHEN** the user runs `lattix install` and task creation fails
- **THEN** the system SHALL print an error message and exit with a non-zero code

#### Scenario: Wake from sleep triggers daemon restart
- **WHEN** the computer resumes from sleep or hibernation and the Lattix scheduled task is installed
- **THEN** Windows SHALL trigger the scheduled task, which runs `npx -y lattix run -d`. If the daemon is still alive, the run command's single-instance guard SHALL detect the existing PID and exit cleanly. If the daemon has died, it SHALL start a new daemon instance.

#### Scenario: Wake trigger does not duplicate running daemon
- **WHEN** the computer resumes from sleep and the daemon process is still running
- **THEN** the triggered `lattix run -d` SHALL detect the existing daemon via PID file check and exit with code 0 without starting a duplicate
