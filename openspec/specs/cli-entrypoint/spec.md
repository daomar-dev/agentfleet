## Purpose
Define the supported AgentFleet CLI entrypoint, commands, and user-facing invocation behavior.

## Requirements

### Requirement: npx-compatible CLI entrypoint
The system SHALL provide a CLI entrypoint that can be invoked via `npx -y @daomar/agentfleet <command>`. The package.json MUST define a `bin` field mapping `agentfleet` and `dma` to the compiled CLI script.

#### Scenario: Running via npx
- **WHEN** a user runs `npx -y @daomar/agentfleet run`
- **THEN** the system SHALL auto-initialize if needed and start the task watcher

### Requirement: Submit command
The system SHALL provide a `submit` command that creates a new task file in the tasks directory.

#### Scenario: Submitting a task with a prompt
- **WHEN** the user runs `agentfleet submit --prompt "Add error handling to the API" --working-dir "C:\work\myproject"`
- **THEN** the system SHALL create a task JSON file in `~/.agentfleet/tasks/` with a generated unique ID, the provided prompt, the working directory, and the current machine hostname as `createdBy`

#### Scenario: Submitting a task with a title
- **WHEN** the user runs `agentfleet submit --prompt "..." --title "Error handling"`
- **THEN** the system SHALL include the title in the task file

#### Scenario: Submitting a task with a custom agent command template
- **WHEN** the user runs `agentfleet submit --prompt "..." --agent "claude -p {prompt} --allowedTools WebSearch"`
- **THEN** the system SHALL store the agent command template in the task file's `command` field, where `{prompt}` indicates the position for prompt insertion

### Requirement: Status command
The system SHALL provide a `status` command that displays the current state of all known tasks. It SHALL also display the running AgentFleet process information (PID, mode, log file) before listing tasks.

#### Scenario: Listing all tasks
- **WHEN** the user runs `agentfleet status`
- **THEN** the system SHALL read all task files from `~/.agentfleet/tasks/`, display each task's ID, title, and execution results from each machine, formatted as a table or list

#### Scenario: Checking a specific task
- **WHEN** the user runs `agentfleet status <task-id>`
- **THEN** the system SHALL display detailed information about the task including execution results from all machines and output files in the output directory

#### Scenario: Status output includes process info
- **WHEN** the user runs `agentfleet status`
- **THEN** the system SHALL show whether AgentFleet is running, its PID, run mode, and log file location (if daemon)

### Requirement: Stop command
The system SHALL provide a `stop` command that terminates the running AgentFleet instance.

#### Scenario: Stopping AgentFleet
- **WHEN** the user runs `agentfleet stop`
- **THEN** the system SHALL terminate the running AgentFleet process and clean up the PID file

### Requirement: Install command
The system SHALL provide an `install` command that configures AgentFleet auto-start on login using the platform-appropriate implementation on supported platforms.

#### Scenario: Install command registered
- **WHEN** the user runs `agentfleet --help`
- **THEN** the help output SHALL list the `install` command with a description

### Requirement: Uninstall command
The system SHALL provide an `uninstall` command that removes the current platform's AgentFleet auto-start registration and stops the running instance.

#### Scenario: Uninstall command registered
- **WHEN** the user runs `agentfleet --help`
- **THEN** the help output SHALL list the `uninstall` command with a description

### Requirement: Version and help
The system SHALL provide `--version` and `--help` flags following standard CLI conventions. The help output SHALL display the current local version and the latest version available on npmjs.org. All help text, command descriptions, and option descriptions SHALL be sourced from the i18n message catalog using the `t()` function, displaying in the user's detected locale.

#### Scenario: Showing version
- **WHEN** the user runs `agentfleet --version`
- **THEN** the system SHALL print the package version from package.json

#### Scenario: Showing help
- **WHEN** the user runs `agentfleet --help`
- **THEN** the system SHALL display usage information listing all available commands (`run`, `submit`, `status`, `stop`, `install`, `uninstall`) and their options, with all descriptive text in the user's detected locale

#### Scenario: Help shows version comparison
- **WHEN** the user runs `agentfleet --help`
- **THEN** the help output SHALL display the current version and the latest version from npmjs.org. If the latest version is newer, it SHALL indicate an update is available, with the update message in the user's detected locale

#### Scenario: Help in Simplified Chinese
- **WHEN** the detected locale is `zh-CN` and the user runs `agentfleet --help`
- **THEN** all command descriptions, option descriptions, and informational text SHALL be displayed in Simplified Chinese
