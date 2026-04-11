## Purpose
Define the automatic `agentfleet` CLI shortcut registration, npx invocation detection, global install detection, and friendly submit hints for the run/install commands.

## Requirements

### Requirement: Shortcut command registration on install or run via npx
The system SHALL check whether a convenient `agentfleet` command is available only when the `install` or `run` command is invoked via npx (detected by checking whether the script path contains an npx cache directory such as `_npx`). If no global shortcut exists and no wrapper has been created, the system SHALL create a platform-appropriate wrapper file in the npm global bin directory: `agentfleet.cmd` delegating to `npx -y @daomar/agentfleet %*` on Windows, or an executable `agentfleet` shell wrapper delegating to `npx -y @daomar/agentfleet "$@"` on POSIX platforms such as macOS. Because this directory is already in the user's PATH in supported setups, the shortcut is available immediately without a terminal restart. For other commands (e.g., `submit`, `status`, `stop`) or when not running via npx, shortcut registration SHALL be skipped.

#### Scenario: First run via npx on Windows with no global shortcut installed
- **WHEN** the user runs `npx -y @daomar/agentfleet run` (or `npx -y @daomar/agentfleet install`) on Windows for the first time and `agentfleet` is not globally installed and no wrapper exists
- **THEN** the system SHALL create `agentfleet.cmd` in the npm global bin directory with content `@npx -y @daomar/agentfleet %*`, and the command SHALL be immediately available in the current terminal

#### Scenario: First run via npx on macOS with no global shortcut installed
- **WHEN** the user runs `npx -y @daomar/agentfleet run` (or `npx -y @daomar/agentfleet install`) on macOS for the first time and `agentfleet` is not globally installed and no wrapper exists
- **THEN** the system SHALL create an executable `agentfleet` shell wrapper in the npm global bin directory that delegates to `npx -y @daomar/agentfleet "$@"`, and the command SHALL be immediately available in the current terminal

#### Scenario: Command invoked via npx but is not install or run
- **WHEN** the user runs `npx -y @daomar/agentfleet submit --prompt "..."` or any command other than `install` or `run`
- **THEN** the system SHALL skip shortcut registration entirely

#### Scenario: Command invoked without npx (e.g., global install or wrapper)
- **WHEN** the user runs `agentfleet run` via a global install or an existing wrapper (script path does not contain `_npx`)
- **THEN** the system SHALL skip shortcut registration entirely

#### Scenario: Global shortcut already installed
- **WHEN** the user runs `npx -y @daomar/agentfleet run` and `agentfleet` is already globally installed (via `npm install -g @daomar/agentfleet`)
- **THEN** the system SHALL skip wrapper creation entirely

#### Scenario: Wrappers already exist
- **WHEN** the user runs `npx -y @daomar/agentfleet run` and platform-appropriate wrappers already exist in the npm global bin directory
- **THEN** the system SHALL skip wrapper creation

### Requirement: Global install detection excludes npx cache
The system SHALL detect whether `agentfleet` is globally installed by using the platform-native command lookup (`where` on Windows, `which -a` on POSIX) and filtering out any results that point to npx cache directories (paths containing `_npx` or `npm-cache`). Only results pointing to global npm bin directories or user-installed locations SHALL count as valid global shortcuts.

#### Scenario: Only npx cache version exists
- **WHEN** platform-native command lookup returns paths that all contain `_npx` or `npm-cache`
- **THEN** the system SHALL treat this as "not globally installed" and proceed with wrapper creation

#### Scenario: Global npm install exists alongside npx cache
- **WHEN** platform-native command lookup returns both npx cache paths and a global npm bin path for `agentfleet`
- **THEN** the system SHALL treat this as "globally installed" and skip wrapper creation

### Requirement: Shortcut registration is non-blocking
The shortcut registration SHALL run synchronously but quickly (file existence checks and optional file creation). Any errors during shortcut registration SHALL be silently logged and SHALL NOT cause the command to fail.

#### Scenario: Wrapper creation fails due to permissions
- **WHEN** the system cannot create the wrapper file due to insufficient permissions
- **THEN** the system SHALL log a warning and continue executing the user's command normally

### Requirement: Friendly submit hint after install or run
After `install` or `run` starts successfully, the system SHALL print a friendly hint showing the user how to submit tasks. The hint SHALL use the short form `agentfleet submit --prompt "..."` if a `agentfleet` shortcut is available (either via global install or via the `.cmd` wrapper that was created or already exists). If no shortcut is available, the hint SHALL use `npx -y @daomar/agentfleet submit --prompt "..."`. The `ShortcutService.ensureShortcut()` method SHALL return a result indicating whether a shortcut is available, which the run/install commands use to format the hint.

#### Scenario: Submit hint with shortcut available
- **WHEN** `install` or `run` starts successfully and `agentfleet` is available as a shortcut (global install or wrapper exists)
- **THEN** the system SHALL print a hint like: `💡 To submit a task: agentfleet submit --prompt "your instruction here"`

#### Scenario: Submit hint without shortcut
- **WHEN** `install` or `run` starts successfully and no `agentfleet` shortcut is available
- **THEN** the system SHALL print a hint like: `💡 To submit a task: npx -y @daomar/agentfleet submit --prompt "your instruction here"`

### Requirement: Detect npx invocation
The system SHALL detect whether the current process was invoked via npx by checking whether the resolved script path (e.g., `process.argv[1]`) contains an npx cache directory indicator (such as `_npx` in the path). This detection SHALL be used to gate shortcut registration logic.

#### Scenario: Running via npx
- **WHEN** the script path contains `_npx`
- **THEN** the system SHALL consider this an npx invocation and allow shortcut registration (if on `install` or `run` command)

#### Scenario: Running via global install or wrapper
- **WHEN** the script path does not contain `_npx`
- **THEN** the system SHALL consider this a direct invocation and skip shortcut registration
