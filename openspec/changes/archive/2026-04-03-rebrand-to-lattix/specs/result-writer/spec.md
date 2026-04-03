## MODIFIED Requirements

### Requirement: Create task output directory
The system SHALL create a directory at `~/.lattix/output/<task-id>/` for each completed or failed task to store all result artifacts.

#### Scenario: First result for a task
- **WHEN** an agent completes a task and the output directory does not exist
- **THEN** the system SHALL create `~/.lattix/output/<task-id>/` and write results into it

#### Scenario: Output directory already exists
- **WHEN** an agent completes a task and the output directory already exists (another machine wrote results first)
- **THEN** the system SHALL write its results alongside existing files without overwriting them
