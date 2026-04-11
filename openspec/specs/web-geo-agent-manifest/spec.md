## ADDED Requirements

### Requirement: agent.json manifest at well-known path
A JSON file SHALL exist at `web/public/.well-known/agent.json` and be served at `/.well-known/agent.json`.

#### Scenario: Agent discovers manifest
- **WHEN** an AI agent fetches `https://agentfleet.daomar.dev/.well-known/agent.json`
- **THEN** it SHALL receive a valid JSON response

### Requirement: agent.json schema fields
The `agent.json` manifest SHALL contain required fields: `schema_version`, `name`, `description`, `url`, `auth`, and `capabilities`.

#### Scenario: Required fields present
- **WHEN** the JSON is parsed
- **THEN** `schema_version` SHALL be a non-empty string
- **THEN** `name` SHALL be "AgentFleet"
- **THEN** `description` SHALL be a non-empty string
- **THEN** `url` SHALL be "https://agentfleet.daomar.dev/"
- **THEN** `auth` SHALL be an object with a `type` field
- **THEN** `capabilities` SHALL be a non-empty array

### Requirement: agent.json capabilities describe dashboard actions
Each entry in the `capabilities` array SHALL have `name`, `description`, and `requires_auth` fields.

#### Scenario: Capability entries are well-formed
- **WHEN** the `capabilities` array is iterated
- **THEN** every entry SHALL have a string `name`, a string `description`, and a boolean `requires_auth`

#### Scenario: Key capabilities declared
- **WHEN** the capabilities are examined
- **THEN** they SHALL include at minimum entries for task submission and task viewing

### Requirement: potentialAction in JSON-LD
The `index.html` JSON-LD `SoftwareApplication` block SHALL include a `potentialAction` array with at least one Schema.org Action entry.

#### Scenario: potentialAction present
- **WHEN** the JSON-LD in `index.html` is parsed
- **THEN** the `SoftwareApplication` object SHALL have a `potentialAction` property that is an array with at least one entry

#### Scenario: Action entry structure
- **WHEN** a `potentialAction` entry is examined
- **THEN** it SHALL have `@type` and `target` properties

### Requirement: DonateAction on donate.html
The `donate.html` page SHALL contain a `<script type="application/ld+json">` block with a `DonateAction` schema.

#### Scenario: DonateAction structured data
- **WHEN** the JSON-LD from `donate.html` is parsed
- **THEN** it SHALL have `@type` equal to "DonateAction"
- **THEN** it SHALL have a `target` property linking to the PayPal donation URL
