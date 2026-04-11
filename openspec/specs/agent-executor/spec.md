## Purpose
Define how AgentFleet executes agent commands for tasks, captures process output, and enforces runtime limits.

## Requirements

### Requirement: Spawn coding agent CLI process
The system SHALL spawn an independent child process for each detected task, executing the configured coding agent CLI command with the task's prompt. The agent process MUST run in the specified working directory.

#### Scenario: Executing a task with default agent
- **WHEN** a task is detected and no specific `command` is specified in the task file
- **THEN** the system SHALL use the default agent command template from `config.json` to execute the task

#### Scenario: Executing a task with a specified agent command
- **WHEN** a task is detected and the task file specifies a `command` field (e.g., `"claude -p {prompt} --allowedTools WebSearch"`)
- **THEN** the system SHALL use the specified command template to execute the task

### Requirement: Command template with prompt placeholder
The system SHALL support a `{prompt}` placeholder in the agent command template. When building the final command, the system SHALL replace `{prompt}` with the task's prompt text (properly quoted). If no `{prompt}` placeholder is present, the prompt SHALL be appended to the end of the command.

#### Scenario: Command with {prompt} placeholder
- **WHEN** the command template contains `{prompt}` (e.g., `"claude -p {prompt} --allowedTools WebSearch"`)
- **THEN** the system SHALL replace `{prompt}` with the quoted prompt text in that position

#### Scenario: Command without {prompt} placeholder
- **WHEN** the command template does not contain `{prompt}` (e.g., `"claude -p"`)
- **THEN** the system SHALL append the quoted prompt text to the end of the command

#### Scenario: Agent command not found
- **WHEN** the system attempts to spawn an agent process but the command is not found on the system PATH
- **THEN** the system SHALL write a failure result with an error message indicating the agent is not available

### Requirement: Capture agent output
The system SHALL capture both stdout and stderr from the agent process. Output MUST be stored in memory during execution and written to the output directory upon completion.

#### Scenario: Agent produces stdout output
- **WHEN** the agent process writes to stdout during execution
- **THEN** the system SHALL capture all stdout output up to the configured size limit (default: 1MB)

#### Scenario: Agent output exceeds size limit
- **WHEN** the agent's combined output exceeds the configured size limit
- **THEN** the system SHALL truncate the output, append a notice indicating truncation, and continue execution

### Requirement: Handle agent process lifecycle
The system SHALL monitor the agent process and handle completion, failures, and timeouts.

#### Scenario: Agent completes successfully
- **WHEN** the agent process exits with code 0
- **THEN** the system SHALL write the output to the results directory and mark the task as processed locally

#### Scenario: Agent fails with non-zero exit code
- **WHEN** the agent process exits with a non-zero exit code
- **THEN** the system SHALL write the error output to the results directory and mark the task as processed locally

#### Scenario: Agent exceeds timeout
- **WHEN** the agent process runs longer than the configured timeout (default: 30 minutes)
- **THEN** the system SHALL kill the process, write any captured output to results, and mark the task as processed locally

### Requirement: Concurrent task execution limit
The system SHALL enforce a configurable maximum number of concurrent agent processes (default: 1) to prevent resource exhaustion.

#### Scenario: Maximum concurrent tasks reached
- **WHEN** a new task is detected but the maximum number of agent processes are already running
- **THEN** the system SHALL queue the task and process it when a running agent completes

#### Scenario: Concurrent limit configured to allow parallel execution
- **WHEN** the concurrent task limit is set to a value greater than 1
- **THEN** the system SHALL spawn up to that many agent processes simultaneously
