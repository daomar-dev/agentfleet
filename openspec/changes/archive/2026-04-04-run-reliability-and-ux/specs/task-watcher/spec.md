## MODIFIED Requirements

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
