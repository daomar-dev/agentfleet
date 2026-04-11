## MODIFIED Requirements

### Requirement: about.html exists as public static page
A static HTML page SHALL exist at `web/public/about.html` and be accessible without authentication at `/about.html`. The about page SHALL link back to the landing page at `/` and the landing page SHALL link to the about page for detailed documentation.

#### Scenario: Unauthenticated access
- **WHEN** a user or crawler fetches `https://agentfleet.daomar.dev/about.html`
- **THEN** it SHALL receive a fully rendered HTML page without requiring JavaScript execution or authentication

#### Scenario: Cross-linking with landing page
- **WHEN** the about page is viewed
- **THEN** it SHALL contain a link to the root landing page
- **WHEN** the landing page is viewed
- **THEN** it SHALL contain a link to the about page for detailed documentation
