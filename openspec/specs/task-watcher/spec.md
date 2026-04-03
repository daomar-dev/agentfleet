## Purpose
Define how Lattix discovers, validates, deduplicates, and continuously watches shared task files.

## Requirements

### Requirement: Watch tasks directory for new task files
The system SHALL continuously watch the `~/.lattix/tasks` directory for new `.json` files using a file system watcher. The watcher MUST detect newly created files and trigger task processing.

#### Scenario: New task file appears
- **WHEN** a new `.json` file is created in the `~/.lattix/tasks` directory
- **THEN** the system SHALL read the file, validate it as a valid task descriptor, and initiate task processing within 2 seconds of file detection

#### Scenario: Non-JSON file appears in tasks directory
- **WHEN** a non-JSON file is created in the tasks directory
- **THEN** the system SHALL ignore the file and log a debug message

#### Scenario: Invalid JSON task file
- **WHEN** a `.json` file is created but contains invalid JSON or missing required fields
- **THEN** the system SHALL log a warning with the filename and validation errors, and skip the task

### Requirement: Task file schema validation
The system SHALL validate that each task file contains at minimum the following fields: `id` (string), `prompt` (string). Optional fields include: `title`, `description`, `agent`, `workingDirectory`, `command`, `createdAt`, `createdBy`.

#### Scenario: Valid task file with all required fields
- **WHEN** a task file contains all required fields with valid types
- **THEN** the system SHALL accept the task for processing

#### Scenario: Task file missing required fields
- **WHEN** a task file is missing the `id` or `prompt` field
- **THEN** the system SHALL reject the task and log the missing fields

### Requirement: Local deduplication via processed record
The system SHALL maintain a local (non-synced) file at `~/.lattix/processed.json` that records the IDs of all tasks this machine has already executed. This prevents re-execution on restart without requiring any modification to the shared task file.

#### Scenario: New task not yet processed
- **WHEN** a task file is detected and its `id` is NOT in `processed.json`
- **THEN** the system SHALL execute the task and add its `id` to `processed.json` upon completion

#### Scenario: Task already processed by this machine
- **WHEN** a task file is detected but its `id` is already in `processed.json`
- **THEN** the system SHALL skip the task silently

### Requirement: Process existing tasks on startup
The system SHALL scan the tasks directory on startup for any tasks not yet in the local `processed.json` and process them before entering watch mode.

#### Scenario: Unprocessed tasks exist at startup
- **WHEN** the watcher starts and there are task files whose IDs are not in `processed.json`
- **THEN** the system SHALL process each unprocessed task before entering continuous watch mode

### Requirement: Polling fallback
The system SHALL support a configurable polling interval as a fallback for environments where file system events are unreliable (e.g., network-synced directories).

#### Scenario: File watcher events are missed
- **WHEN** a polling cycle runs (default: every 10 seconds)
- **THEN** the system SHALL scan the tasks directory for any new tasks not yet in the local `processed.json` that may have been missed by the file watcher
