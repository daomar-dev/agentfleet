## Requirements

### Requirement: Security value proposition in README
The project README SHALL include a dedicated section communicating AgentFleet's security and compliance advantages.

#### Scenario: README contains security section
- **WHEN** a user reads the project README
- **THEN** they SHALL find a section that explains AgentFleet requires no tunnels, no exposed ports, and does not move any data
- **AND** the section SHALL explain that all coordination happens through OneDrive for Business or OneDrive for Personal sync

### Requirement: Security value proposition in web About section
The web dashboard's About section (in Settings page) SHALL communicate the security and compliance value proposition.

#### Scenario: About section displays security messaging
- **WHEN** a user navigates to the Settings page and views the About section
- **THEN** they SHALL see text explaining that AgentFleet requires no tunnels, no exposed ports, and moves no data
- **AND** the text SHALL mention that coordination relies entirely on OneDrive sync

### Requirement: Login card displays clean tagline
The login card SHALL display the tagline "Distributed agent orchestration" without the word "dashboard".

#### Scenario: Login card tagline text
- **WHEN** an unauthenticated user views the login page
- **THEN** the login card SHALL display the text "Distributed agent orchestration" below the AgentFleet heading
