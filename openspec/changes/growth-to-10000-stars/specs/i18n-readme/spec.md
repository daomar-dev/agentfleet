## MODIFIED Requirements

### Requirement: Bilingual README files
The project SHALL maintain two README files: `README.md` in English (en-US) and `README.zh-CN.md` in Simplified Chinese (zh-CN). Both files SHALL follow a marketing-first structure ordered as: (1) logo and one-line hook, (2) badges row, (3) embedded demo media (GIF or image), (4) value propositions, (5) quick start, (6) architecture diagram, (7) comparison table, (8) use cases, (9) Star History chart, (10) links to full documentation and dashboard. Detailed technical documentation (prerequisites, full usage reference, task file format, etc.) SHALL be linked or placed after the marketing-first sections.

#### Scenario: English README exists
- **WHEN** a user views the repository root on GitHub
- **THEN** GitHub SHALL render `README.md` in English by default

#### Scenario: Chinese README exists
- **WHEN** a user navigates to `README.zh-CN.md` in the repository
- **THEN** they SHALL see the full project documentation in Simplified Chinese

#### Scenario: Marketing-first structure
- **WHEN** a user views either README file
- **THEN** the first visible content after the logo SHALL be badges, followed by demo media, followed by value propositions — not prerequisites or installation details

### Requirement: README content parity
The `README.zh-CN.md` file SHALL cover the same sections and information as `README.md`. Code examples, CLI commands, and file paths SHALL remain in their original form (not translated). Only prose descriptions, headings, and explanatory text SHALL be translated. Both files SHALL include the same badges, demo media, comparison table, and use case examples.

#### Scenario: Structural equivalence
- **WHEN** both README files are compared
- **THEN** they SHALL have the same major sections in the same order, including the new marketing-first sections (demo, value props, comparison, use cases) and the existing documentation sections

#### Scenario: Code examples preserved
- **WHEN** a code block appears in `README.md`
- **THEN** `README.zh-CN.md` SHALL contain the same code block with identical commands and syntax, with only surrounding prose translated

### Requirement: Star History chart for social proof
Both `README.md` and `README.zh-CN.md` SHALL include an embedded Star History chart image that dynamically renders the repository's star growth over time. The chart SHALL link to the Star History website for the `daomar-dev/agentfleet` repository.

#### Scenario: Star History chart visible
- **WHEN** a user views either README file on GitHub
- **THEN** they SHALL see a Star History chart image rendered inline, showing the repository's star count over time

#### Scenario: Star History chart links to source
- **WHEN** a user clicks the Star History chart image
- **THEN** they SHALL be navigated to the Star History website page for the `daomar-dev/agentfleet` repository
