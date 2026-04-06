# i18n-readme

Bilingual README documentation with English and Simplified Chinese versions, cross-links, and content parity.

## Requirements

### Requirement: Bilingual README files
The project SHALL maintain two README files: `README.md` in English (en-US) and `README.zh-CN.md` in Simplified Chinese (zh-CN). Both files SHALL contain equivalent content covering project overview, prerequisites, installation, usage, architecture, security, and development sections.

#### Scenario: English README exists
- **WHEN** a user views the repository root on GitHub
- **THEN** GitHub SHALL render `README.md` in English by default

#### Scenario: Chinese README exists
- **WHEN** a user navigates to `README.zh-CN.md` in the repository
- **THEN** they SHALL see the full project documentation in Simplified Chinese

### Requirement: Language cross-links
Both README files SHALL include a language switcher line near the top of the document, linking to the other language version.

#### Scenario: English README links to Chinese
- **WHEN** a user views `README.md`
- **THEN** they SHALL see a link to `README.zh-CN.md` labeled `简体中文` near the top of the document

#### Scenario: Chinese README links to English
- **WHEN** a user views `README.zh-CN.md`
- **THEN** they SHALL see a link to `README.md` labeled `English` near the top of the document

### Requirement: README content parity
The `README.zh-CN.md` file SHALL cover the same sections and information as `README.md`. Code examples, CLI commands, and file paths SHALL remain in their original form (not translated). Only prose descriptions, headings, and explanatory text SHALL be translated.

#### Scenario: Structural equivalence
- **WHEN** both README files are compared
- **THEN** they SHALL have the same major sections (Overview, Prerequisites, Installation, Usage, Architecture, Security, Development, Web Dashboard, Support, License)

#### Scenario: Code examples preserved
- **WHEN** a code block appears in `README.md`
- **THEN** `README.zh-CN.md` SHALL contain the same code block with identical commands and syntax, with only surrounding prose translated
