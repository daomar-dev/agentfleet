## Purpose
Define how AgentFleet discovers, validates, deduplicates, and continuously watches shared task files.

## Requirements

### Requirement: Watch tasks directory for new task files
The system SHALL continuously watch the `~/.agentfleet/tasks` directory for new `.json` files using a file system watcher. The watcher MUST detect newly created files and trigger task processing.

#### Scenario: New task file appears
- **WHEN** a new `.json` file is created in the `~/.agentfleet/tasks` directory
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
The system SHALL maintain a local (non-synced) file at `~/.agentfleet/processed.json` that records the IDs of all tasks this machine has already executed. This prevents re-execution on restart without requiring any modification to the shared task file.

#### Scenario: New task not yet processed
- **WHEN** a task file is detected and its `id` is NOT in `processed.json`
- **THEN** the system SHALL execute the task and add its `id` to `processed.json` upon completion

#### Scenario: Task already processed by this machine
- **WHEN** a task file is detected but its `id` is already in `processed.json`
- **THEN** the system SHALL skip the task silently

### Requirement: Process existing tasks on startup
The system SHALL record a startup timestamp when the watcher is constructed and only process tasks whose file modification time is after this timestamp. Existing tasks present at startup are implicitly skipped without being recorded in `processed.json`, ensuring no replay on fresh starts, machine migrations, or `processed.json` loss.

#### Scenario: Existing tasks at startup are skipped
- **WHEN** the watcher starts and there are task files already present in the tasks directory
- **THEN** the system SHALL NOT execute any of those tasks, regardless of whether their IDs are in `processed.json`

#### Scenario: New task arrives after startup
- **WHEN** a new task file is created in the tasks directory after the watcher has started
- **THEN** the system SHALL detect the file via chokidar and process it normally

#### Scenario: Task file synced after startup with old mtime
- **WHEN** a task file appears in the tasks directory after startup (detected via chokidar add event) but has an mtime older than the startup timestamp
- **THEN** the system SHALL process the task, because chokidar events indicate genuinely new arrivals regardless of mtime

### Requirement: Polling fallback
The system SHALL support a configurable polling interval as a fallback for environments where file system events are unreliable (e.g., network-synced directories). The polling scan SHALL only process task files whose modification time is after the startup timestamp and whose IDs are not yet in `processed.json` or in-progress.

#### Scenario: Polling picks up new task after startup
- **WHEN** a polling cycle runs and a task file with mtime after the startup timestamp exists that has not been processed
- **THEN** the system SHALL process the task

#### Scenario: Polling ignores pre-existing tasks
- **WHEN** a polling cycle runs and a task file with mtime before the startup timestamp exists
- **THEN** the system SHALL skip the task even if its ID is not in `processed.json`

#### Scenario: File watcher events are missed
- **WHEN** a polling cycle runs (default: every 10 seconds)
- **THEN** the system SHALL scan the tasks directory for any new tasks with mtime after startup timestamp that may have been missed by the file watcher
