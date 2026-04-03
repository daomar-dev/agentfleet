## MODIFIED Requirements

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

### Requirement: Local deduplication via processed record
The system SHALL maintain a local (non-synced) file at `~/.lattix/processed.json` that records the IDs of all tasks this machine has already executed. This prevents re-execution on restart without requiring any modification to the shared task file.

#### Scenario: New task not yet processed
- **WHEN** a task file is detected and its `id` is NOT in `processed.json`
- **THEN** the system SHALL execute the task and add its `id` to `processed.json` upon completion

#### Scenario: Task already processed by this machine
- **WHEN** a task file is detected but its `id` is already in `processed.json`
- **THEN** the system SHALL skip the task silently
