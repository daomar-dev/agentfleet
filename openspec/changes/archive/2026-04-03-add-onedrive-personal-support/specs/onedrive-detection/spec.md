## RENAMED Requirements

### Requirement: Detect OneDrive for Business sync folder
FROM: Detect OneDrive for Business sync folder
TO: Detect supported OneDrive sync folders

## MODIFIED Requirements

### Requirement: Detect OneDrive for Business sync folder
The system SHALL automatically detect usable OneDrive sync folders on the local machine by scanning common locations and registry entries. Detection MUST include both OneDrive for Business folders (for example `C:\Users\<user>\OneDrive - <OrgName>`) and personal OneDrive folders (for example `C:\Users\<user>\OneDrive`).

#### Scenario: Exactly one supported OneDrive account is available
- **WHEN** the system detects exactly one usable OneDrive sync folder for the `onedrive` provider
- **THEN** the system SHALL select that folder without prompting the user

#### Scenario: Personal and business OneDrive are both available
- **WHEN** the system detects more than one usable OneDrive sync folder for the `onedrive` provider
- **THEN** the system SHALL present the detected accounts and prompt the user to choose one before initialization continues

#### Scenario: No supported OneDrive account is available
- **WHEN** the system starts the `onedrive` provider flow and no usable personal or business OneDrive sync folder can be detected
- **THEN** the system SHALL display a clear error explaining that no supported OneDrive account is available and exit with a non-zero exit code

### Requirement: Validate OneDrive sync is active
The system SHALL verify that the selected OneDrive sync folder is usable, not merely present on disk.

#### Scenario: Selected OneDrive folder exists and is usable
- **WHEN** the user selects a detected OneDrive account and the folder exists on disk
- **THEN** the system SHALL continue initialization with that sync directory

#### Scenario: Selected OneDrive folder is missing on disk
- **WHEN** the selected OneDrive folder no longer exists on disk
- **THEN** the system SHALL stop initialization with a clear error instructing the user to verify OneDrive is syncing correctly

### Requirement: Detection on Windows
The system SHALL support OneDrive account detection on Windows by checking the Windows Registry (`HKCU\Software\Microsoft\OneDrive\Accounts`) and well-known paths under the user's home directory for both personal and business accounts.

#### Scenario: Standard Windows installation with registry entries
- **WHEN** the system runs on Windows with standard OneDrive registry entries available
- **THEN** the system SHALL read candidate personal and business account folders from the registry and validate the detected paths on disk

#### Scenario: Registry lookup is unavailable
- **WHEN** registry lookup fails or returns no usable OneDrive folders
- **THEN** the system SHALL fall back to well-known directory scanning before reporting that no supported account was found
