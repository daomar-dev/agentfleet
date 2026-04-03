## MODIFIED Requirements

### Requirement: npx-compatible CLI entrypoint
The system SHALL provide a CLI entrypoint that can be invoked via `npx lattix <command>`. The package.json MUST define a `bin` field mapping `lattix` to the compiled CLI script.

#### Scenario: Running via npx
- **WHEN** a user runs `npx lattix watch`
- **THEN** the system SHALL start the task watcher after performing OneDrive detection and symlink setup

### Requirement: Watch command
The system SHALL provide a `watch` command that starts the task watcher in the foreground. This is the primary operating mode of Lattix.

#### Scenario: Starting watch mode
- **WHEN** the user runs `lattix watch`
- **THEN** the system SHALL perform OneDrive detection, validate/create symlinks, scan for pending tasks, and begin watching for new tasks. The process SHALL log its status to stdout.

#### Scenario: Watch mode with custom polling interval
- **WHEN** the user runs `lattix watch --poll-interval 30`
- **THEN** the system SHALL use a 30-second polling interval instead of the default 10 seconds

#### Scenario: Watch mode with custom concurrency
- **WHEN** the user runs `lattix watch --concurrency 3`
- **THEN** the system SHALL allow up to 3 agent processes to run simultaneously

### Requirement: Init command
The system SHALL provide an `init` command that performs the initial setup (OneDrive detection, symlink creation, config file generation) without starting the watcher.

#### Scenario: Running init
- **WHEN** the user runs `lattix init`
- **THEN** the system SHALL detect OneDrive, create symlinks, generate config.json, and report the setup status without starting the watcher

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
The system SHALL provide a `status` command that displays the current state of all known tasks.

#### Scenario: Listing all tasks
- **WHEN** the user runs `lattix status`
- **THEN** the system SHALL read all task files from `~/.lattix/tasks/`, display each task's ID, title, and execution results from each machine, formatted as a table or list

#### Scenario: Checking a specific task
- **WHEN** the user runs `lattix status <task-id>`
- **THEN** the system SHALL display detailed information about the task including execution results from all machines and output files in the output directory

### Requirement: Version and help
The system SHALL provide `--version` and `--help` flags following standard CLI conventions.

#### Scenario: Showing version
- **WHEN** the user runs `lattix --version`
- **THEN** the system SHALL print the package version from package.json

#### Scenario: Showing help
- **WHEN** the user runs `lattix --help`
- **THEN** the system SHALL display usage information listing all available commands and their options
