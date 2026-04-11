## Purpose
Define where task execution results are written and how result artifacts are named and stored.

## Requirements

### Requirement: Create task output directory
The system SHALL create a directory at `~/.agentfleet/output/<task-id>/` for each completed or failed task to store all result artifacts.

#### Scenario: First result for a task
- **WHEN** an agent completes a task and the output directory does not exist
- **THEN** the system SHALL create `~/.agentfleet/output/<task-id>/` and write results into it

#### Scenario: Output directory already exists
- **WHEN** an agent completes a task and the output directory already exists (another machine wrote results first)
- **THEN** the system SHALL write its results alongside existing files without overwriting them

### Requirement: Machine-namespaced result filenames
The system SHALL prefix all result filenames with the current machine's hostname to prevent filename collisions when multiple machines produce results for the same task.

#### Scenario: Writing result files
- **WHEN** the system writes result files for a completed task
- **THEN** all filenames MUST follow the pattern `<HOSTNAME>-<artifact>.<ext>` (e.g., `DESKTOP-ABC123-output.log`, `DESKTOP-ABC123-result.json`)

### Requirement: Write structured result file
The system SHALL write a JSON result file containing metadata about the task execution, including: task ID, machine hostname, start time, end time, exit code, status (completed/failed/timeout), and the agent command used.

#### Scenario: Successful task completion
- **WHEN** an agent process completes successfully
- **THEN** the system SHALL write `<HOSTNAME>-result.json` containing execution metadata with status "completed" and exit code 0

#### Scenario: Failed task
- **WHEN** an agent process fails
- **THEN** the system SHALL write `<HOSTNAME>-result.json` containing execution metadata with the actual exit code, status "failed", and any error message

### Requirement: Write agent output log
The system SHALL write the captured stdout and stderr from the agent process to separate log files in the task output directory.

#### Scenario: Agent produced output
- **WHEN** an agent process produced stdout and/or stderr output
- **THEN** the system SHALL write `<HOSTNAME>-stdout.log` and `<HOSTNAME>-stderr.log` files containing the respective output streams

#### Scenario: Agent produced no output
- **WHEN** an agent process completed without any stdout or stderr
- **THEN** the system SHALL still write the result.json file but MAY omit empty log files
