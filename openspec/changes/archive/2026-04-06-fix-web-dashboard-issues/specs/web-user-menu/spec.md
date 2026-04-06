## ADDED Requirements

### Requirement: Mobile dropdown positioned near trigger
On mobile viewports (≤768px), the user profile dropdown SHALL appear near the top of the screen (below the navbar) rather than at the bottom of the page.

#### Scenario: User opens profile dropdown on mobile
- **WHEN** the user taps the username button in the navbar on a mobile device
- **THEN** the dropdown SHALL appear directly below the navbar, anchored to the right side of the screen

#### Scenario: User opens profile dropdown on desktop
- **WHEN** the user clicks the username button on a desktop viewport
- **THEN** the dropdown SHALL appear directly below the username button (current behavior preserved)

### Requirement: Backdrop overlay for dropdown dismissal
The user profile dropdown SHALL display a transparent backdrop overlay behind it when open, providing a visible tap target for dismissal.

#### Scenario: Dropdown opened shows backdrop
- **WHEN** the user opens the profile dropdown
- **THEN** a backdrop overlay SHALL be rendered covering the page behind the dropdown
- **AND** tapping the backdrop SHALL close the dropdown

#### Scenario: Dropdown closed removes backdrop
- **WHEN** the user taps the backdrop or any area outside the dropdown
- **THEN** the dropdown SHALL close
- **AND** the backdrop SHALL be removed from the DOM

### Requirement: No Switch Account button
The user profile dropdown SHALL NOT contain a "Switch Account" button. Users who wish to switch accounts SHALL log out and log back in.

#### Scenario: Dropdown renders without Switch Account
- **WHEN** the user profile dropdown is rendered
- **THEN** it SHALL contain a "Logout" button
- **AND** it SHALL NOT contain a "Switch Account" button

### Requirement: Logout button available
The user profile dropdown SHALL always contain a "Logout" button that signs the user out.

#### Scenario: User logs out
- **WHEN** the user taps "Logout" in the profile dropdown
- **THEN** the MSAL logout flow SHALL be initiated
- **AND** the user SHALL be redirected to the login screen
