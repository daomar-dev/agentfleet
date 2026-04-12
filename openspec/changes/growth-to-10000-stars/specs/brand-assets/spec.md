## MODIFIED Requirements

### Requirement: Canonical AgentFleet icon assets
The repository SHALL include a canonical AgentFleet project icon in both SVG and PNG formats. The two files MUST represent the same visual identity and be suitable for reuse in project documentation and package-facing surfaces. Additionally, the OG image (`web/public/og-image.png`) SHALL include a visual element beyond text and logo — such as an architecture diagram, terminal screenshot, or workflow illustration — that communicates the product's function at a glance.

#### Scenario: Inspecting repository brand assets
- **WHEN** a contributor inspects the repository after the rebrand
- **THEN** they SHALL find a canonical AgentFleet SVG icon file and a matching PNG icon file checked into the repository

#### Scenario: OG image communicates product function
- **WHEN** the OG image is viewed as a social media preview card
- **THEN** it SHALL contain visual content beyond the logo and text that illustrates the distributed multi-machine orchestration concept
