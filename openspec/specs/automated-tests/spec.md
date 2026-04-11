## Purpose
Define the required automated test command and the critical AgentFleet behaviors the test suite must cover.

## Requirements

### Requirement: Real automated test command
The repository SHALL provide an `npm test` command that executes real automated tests for the project. The command MUST fail when tests fail and MUST NOT remain a placeholder script.

#### Scenario: Running the test command
- **WHEN** a contributor runs `npm test`
- **THEN** the repository SHALL build and execute the automated test suite instead of printing a placeholder message

### Requirement: Coverage for critical AgentFleet behaviors
The automated test suite SHALL cover the critical AgentFleet behaviors that are most likely to regress during branding and storage-path changes, including setup/migration behavior and result output writing.

#### Scenario: Verifying setup and migration behavior
- **WHEN** the automated tests run
- **THEN** they SHALL verify that AgentFleet setup creates the expected paths and safely handles migration from legacy `agentbroker` directories

#### Scenario: Verifying result writing behavior
- **WHEN** the automated tests run
- **THEN** they SHALL verify that execution results are written to the expected task output directory with machine-prefixed artifact names
