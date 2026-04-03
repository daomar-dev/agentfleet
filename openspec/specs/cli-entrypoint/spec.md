## Purpose
Define the supported Lattix CLI entrypoint, commands, and user-facing invocation behavior.

## Requirements

### Requirement: npx-compatible CLI entrypoint
The system SHALL provide a CLI entrypoint that can be invoked via `npx lattix <command>`. The package.json MUST define a `bin` field mapping `lattix` to the compiled CLI script.

#### Scenario: Running via npx
- **WHEN** a user runs `npx lattix run`
- **THEN** the system SHALL auto-initialize if needed and start the task watcher

### Requirement: Submit command
The system SHALL provide a `submit` command that creates a new task file in the tasks directory.

#### Scenario: Submitting a task with a prompt
- **WHEN** the user runs `lattix submit --prompt "Add error handling to the API" --working-dir "C:\work\myproject"`
- **THEN** the system SHALL create a task JSON file in `~/.lattix/tasks/` with a generated unique ID, the provided prompt, the working directory, and the current machine hostname as `createdBy`

#### Scenario: Submitting a task with a title
- **WHEN** the user runs `lattix submit --prompt "..." --title "Error handling"`
- **THEN** the system SHALL include the title in the task file

#### Scenario: Submitting a task with a custom agent command template
- **WHEN** the user runs `lattix submit --prompt "..." --agent "claude -p {prompt} --allowedTools WebSearch"`
- **THEN** the system SHALL store the agent command template in the task file's `command` field, where `{prompt}` indicates the position for prompt insertion

### Requirement: Status command
The system SHALL provide a `status` command that displays the current state of all known tasks. It SHALL also display the running Lattix process information (PID, mode, log file) before listing tasks.

#### Scenario: Listing all tasks
- **WHEN** the user runs `lattix status`
- **THEN** the system SHALL read all task files from `~/.lattix/tasks/`, display each task's ID, title, and execution results from each machine, formatted as a table or list

#### Scenario: Checking a specific task
- **WHEN** the user runs `lattix status <task-id>`
- **THEN** the system SHALL display detailed information about the task including execution results from all machines and output files in the output directory

#### Scenario: Status output includes process info
- **WHEN** the user runs `lattix status`
- **THEN** the system SHALL show whether Lattix is running, its PID, run mode, and log file location (if daemon)

### Requirement: Stop command
The system SHALL provide a `stop` command that terminates the running Lattix instance.

#### Scenario: Stopping Lattix
- **WHEN** the user runs `lattix stop`
- **THEN** the system SHALL terminate the running Lattix process and clean up the PID file

### Requirement: Version and help
The system SHALL provide `--version` and `--help` flags following standard CLI conventions.

#### Scenario: Showing version
- **WHEN** the user runs `lattix --version`
- **THEN** the system SHALL print the package version from package.json

#### Scenario: Showing help
- **WHEN** the user runs `lattix --help`
- **THEN** the system SHALL display usage information listing all available commands (`run`, `submit`, `status`, `stop`) and their options
