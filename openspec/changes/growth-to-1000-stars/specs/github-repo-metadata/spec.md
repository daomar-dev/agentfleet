## ADDED Requirements

### Requirement: README badges row
Both `README.md` and `README.zh-CN.md` SHALL include a row of badge images near the top of the document, after the logo and before the main content. The badges SHALL include at minimum: npm version, license, build status (GitHub Actions), and npm downloads.

#### Scenario: Badges visible on GitHub
- **WHEN** a user views `README.md` on GitHub
- **THEN** they SHALL see a row of badge images displaying current npm version, license type, CI build status, and download count

### Requirement: GitHub Topics configured
The GitHub repository SHALL have Topics (tags) configured that include at least: `agent`, `orchestration`, `distributed`, `onedrive`, `devtools`, `ai`, `coding-agent`.

#### Scenario: Topics visible on repo page
- **WHEN** a user views the repository page on GitHub
- **THEN** they SHALL see relevant topic tags below the repository description

### Requirement: GitHub Social Preview image
The GitHub repository SHALL have a custom Social Preview image configured (via Settings > Social preview). This image SHALL match or be derived from the OG image used by the web application.

#### Scenario: Social preview in shares
- **WHEN** someone shares the GitHub repository URL on social media
- **THEN** the preview card SHALL display the custom Social Preview image, not the default GitHub-generated one

### Requirement: CHANGELOG.md exists
The repository SHALL contain a `CHANGELOG.md` file at the root that documents notable changes for each released version, organized by version number in reverse chronological order.

#### Scenario: CHANGELOG present
- **WHEN** a user or contributor looks for release history
- **THEN** they SHALL find a `CHANGELOG.md` at the repository root with entries for each published version

### Requirement: CONTRIBUTING.md exists
The repository SHALL contain a `CONTRIBUTING.md` file at the root that explains how to set up the development environment, run tests, submit pull requests, and find beginner-friendly issues.

#### Scenario: Contributor guidance
- **WHEN** a potential contributor visits the repository
- **THEN** they SHALL find a `CONTRIBUTING.md` with setup instructions, test commands, and contribution workflow guidance

### Requirement: GitHub Releases for each version
Each npm-published version SHALL have a corresponding GitHub Release with a tag matching the version number (e.g., `v1.2.2`), a title, and release notes summarizing changes.

#### Scenario: Release exists for latest version
- **WHEN** a user views the Releases section of the GitHub repository
- **THEN** they SHALL see a release entry for the latest npm-published version with a version tag and release notes

### Requirement: GitHub Discussions enabled
The repository SHALL have GitHub Discussions enabled to provide a community forum for questions, ideas, and announcements.

#### Scenario: Discussions tab visible
- **WHEN** a user views the repository page on GitHub
- **THEN** they SHALL see a "Discussions" tab in the repository navigation
