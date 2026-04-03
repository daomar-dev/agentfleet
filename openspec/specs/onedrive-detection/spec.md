## Purpose
Define how the system detects and validates the OneDrive for Business sync folder required for shared task exchange.

## Requirements

### Requirement: Detect OneDrive for Business sync folder
The system SHALL automatically detect the OneDrive for Business sync folder on the local machine by scanning common locations and registry entries. The detection MUST identify the organization-specific folder (e.g., `C:\Users\<user>\OneDrive - <OrgName>`).

#### Scenario: OneDrive for Business is installed and syncing
- **WHEN** the system starts and OneDrive for Business is installed with an active sync folder
- **THEN** the system SHALL detect and return the full path to the OneDrive for Business sync directory

#### Scenario: Multiple OneDrive accounts present
- **WHEN** the system detects multiple OneDrive sync folders (personal and business, or multiple business accounts)
- **THEN** the system SHALL prefer the OneDrive for Business folder over personal OneDrive, and if multiple business accounts exist, prompt the user to select one

### Requirement: Validate OneDrive sync is active
The system SHALL verify that the detected OneDrive for Business folder is actively syncing, not merely present on disk.

#### Scenario: OneDrive folder exists but sync is paused or disconnected
- **WHEN** the OneDrive for Business folder exists on disk but sync is not active
- **THEN** the system SHALL warn the user that sync appears inactive and proceed with a warning, allowing the user to continue at their own risk

#### Scenario: OneDrive for Business is not installed
- **WHEN** the system starts and no OneDrive for Business sync folder can be detected
- **THEN** the system SHALL display a clear error message explaining that OneDrive for Business is required and exit with a non-zero exit code

### Requirement: Detection on Windows
The system SHALL support OneDrive for Business detection on Windows by checking the Windows Registry (`HKCU\Software\Microsoft\OneDrive\Accounts`) and well-known paths under the user's home directory.

#### Scenario: Standard Windows installation
- **WHEN** running on Windows with a standard OneDrive for Business installation
- **THEN** the system SHALL locate the sync folder using registry entries and validate the path exists on disk
