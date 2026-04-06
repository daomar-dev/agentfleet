## ADDED Requirements

### Requirement: Parallel task content fetching
The web dashboard SHALL fetch task file contents in parallel using `Promise.allSettled` rather than sequentially.

#### Scenario: All task files load successfully
- **WHEN** the dashboard lists 10 task files from OneDrive
- **THEN** all 10 file contents SHALL be fetched in parallel
- **AND** all 10 tasks SHALL be displayed in the task list

#### Scenario: Some task files fail to load
- **WHEN** the dashboard lists 10 task files and 3 fail to read (e.g., timeout or permission error)
- **THEN** the 7 successfully loaded tasks SHALL be displayed
- **AND** the failures SHALL be logged to the console

#### Scenario: All task files fail to load
- **WHEN** the dashboard lists task files but every `readFileContent` call fails
- **THEN** a toast error message SHALL be shown to the user indicating task loading failed
- **AND** the task list SHALL display "Failed to load tasks" instead of "No tasks yet"

### Requirement: Task loading error visibility
The web dashboard SHALL distinguish between "no tasks exist" and "tasks failed to load" and display an appropriate message for each case.

#### Scenario: No task files in OneDrive
- **WHEN** `listTaskFiles()` returns zero items
- **THEN** the dashboard SHALL display "No tasks yet"

#### Scenario: Task files exist but content cannot be read
- **WHEN** `listTaskFiles()` returns items but all `readFileContent` calls fail
- **THEN** the dashboard SHALL display "Failed to load tasks. Please try again."
- **AND** a toast notification SHALL inform the user of the error

### Requirement: Recent tasks on home page use parallel fetching
The home page recent tasks section SHALL use the same parallel fetching pattern as the full task list page.

#### Scenario: Home page loads recent tasks
- **WHEN** the home page fetches the 10 most recent task files
- **THEN** all file contents SHALL be fetched in parallel
- **AND** successfully loaded tasks SHALL be displayed immediately without waiting for failed ones

### Requirement: Accurate node task count display
The node cards SHALL display the number of result files found for each hostname, reflecting actual task executions observed in the output directory.

#### Scenario: Node with result files across task directories
- **WHEN** a node hostname appears in result files across 5 task output directories
- **THEN** the node card SHALL display "5 results"

#### Scenario: Node discovery session cache cleared on navigation
- **WHEN** the user navigates to the home page
- **THEN** the node discovery SHALL NOT use stale `sessionStorage` data from a previous page load
