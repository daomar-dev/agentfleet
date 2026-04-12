## ADDED Requirements

### Requirement: Landing page rendered for unauthenticated visitors
The web application SHALL render a public landing page at the root URL (`/`) for visitors who are not authenticated. The landing page SHALL NOT require JavaScript authentication or Microsoft sign-in to view its content.

#### Scenario: First visit without sign-in
- **WHEN** an unauthenticated user navigates to `https://agentfleet.daomar.dev/`
- **THEN** they SHALL see the landing page with value proposition content, not a login prompt

#### Scenario: Authenticated user bypasses landing page
- **WHEN** an authenticated user navigates to `https://agentfleet.daomar.dev/`
- **THEN** they SHALL see the dashboard home view, not the landing page

### Requirement: Landing page hero section
The landing page SHALL include a hero section containing the AgentFleet logo, a one-line hook describing the core value proposition, a quick-start command (`npx -y @daomar/agentfleet run`), and a demo visual (GIF or video).

#### Scenario: Hero section content
- **WHEN** the landing page hero section is rendered
- **THEN** it SHALL display the AgentFleet logo, a tagline, at least one CLI command example, and an embedded demo media element (image or video)

### Requirement: Landing page value propositions
The landing page SHALL include a section presenting at least three distinct value propositions (e.g., zero servers, zero configuration, enterprise-grade security). Each value proposition SHALL have a short heading and a brief description.

#### Scenario: Value proposition cards
- **WHEN** the landing page is rendered
- **THEN** it SHALL display at least three value proposition blocks, each containing a heading and descriptive text

### Requirement: Landing page architecture overview
The landing page SHALL include a visual representation of the AgentFleet architecture showing the flow from task submission through OneDrive sync to multi-machine execution.

#### Scenario: Architecture section present
- **WHEN** the landing page is rendered
- **THEN** it SHALL contain a section with an architecture diagram or illustration showing the distributed coordination flow

### Requirement: Landing page call-to-action links
The landing page SHALL include prominent links to the GitHub repository and a sign-in button to access the dashboard. The GitHub link SHALL open in a new tab.

#### Scenario: CTA links present
- **WHEN** the landing page is rendered
- **THEN** it SHALL display a link to the GitHub repository and a sign-in button
- **THEN** the GitHub link SHALL have `target="_blank"` or equivalent behavior

### Requirement: Landing page i18n support
The landing page SHALL support the same language detection and switching as the rest of the web application (en-US and zh-CN). All user-visible text on the landing page SHALL use the `t()` i18n function.

#### Scenario: Chinese visitor
- **WHEN** a visitor with browser language set to `zh-CN` views the landing page
- **THEN** all user-visible text SHALL be displayed in Simplified Chinese

#### Scenario: English visitor
- **WHEN** a visitor with browser language set to `en-US` views the landing page
- **THEN** all user-visible text SHALL be displayed in English

### Requirement: Landing page responsive design
The landing page SHALL be fully responsive and usable on mobile devices (viewport width >= 320px) without horizontal scrolling or content overflow.

#### Scenario: Mobile viewport
- **WHEN** the landing page is viewed at 375px viewport width
- **THEN** all content SHALL be visible without horizontal scrolling and interactive elements SHALL be touch-accessible
