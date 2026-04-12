# Changelog

All notable changes to AgentFleet are documented in this file.

## [2.0.2] - 2026-04-11

### Fixed
- Publish a single `agentfleet` binary entrypoint

## [2.0.1] - 2026-04-11

### Fixed
- Finalize trusted publishing setup for `@daomar/agentfleet` scoped package

## [2.0.0] - 2026-04-11

### Changed
- **Brand upgrade**: Rebrand from `lattix` to `AgentFleet` under the Daomar organization
- Package renamed to `@daomar/agentfleet` (npm scoped)
- GitHub repository moved to `daomar-dev/agentfleet`
- Web dashboard deployed at `agentfleet.daomar.dev`
- Config directory changed from `~/.lattix/` to `~/.agentfleet/`
- macOS LaunchAgent label changed to `dev.daomar.agentfleet`
- Windows Scheduled Task renamed to `AgentFleet`

## [1.2.2] - 2026-04-08

### Added
- macOS support for auto-start, OneDrive detection, and desktop shortcuts
- SEO meta tags, GEO optimization, and agent web support for dashboard
- PWA auto-update with build-stamped cache versioning
- i18n support for CLI and web dashboard (en-US, zh-CN)
- Donation page with PayPal and WeChat Pay channels
- Stale-while-revalidate loading for home and task list pages

## [1.2.1] - 2026-04-06

### Fixed
- Write shortcut to npm global directory for immediate availability

## [1.2.0] - 2026-04-06

### Added
- Skip old tasks on startup to avoid re-executing stale work
- Wake trigger for scheduled task (resume after sleep/hibernate)
- Auto-register `lattix` shortcut command on first run

## [1.1.1] - 2026-04-05

### Fixed
- Minor stability improvements

## [1.1.0] - 2026-04-04

### Added
- Daemon mode (`--daemon` / `-d` flag) for background execution
- Scheduled task auto-start on Windows (login + wake triggers)
- Version checker with update notifications
- VBScript launcher to eliminate console window flash
- Task resilience: restart on failure, run after missed trigger

## [1.0.10] - 2026-04-03

### Added
- Web dashboard with Microsoft Entra ID authentication
- Real-time task monitoring and result viewing
- GitHub Pages deployment workflow

## [1.0.8] - 2026-04-03

### Fixed
- Use Node.js 24 (npm 11.x) for OIDC trusted publishing

## [1.0.7] - 2026-04-03

### Fixed
- Switch to NPM_TOKEN auth for publishing

## [1.0.6] - 2026-04-03

### Fixed
- Remove registry-url to let npm OIDC auth work natively

## [1.0.5] - 2026-04-02

### Fixed
- Remove npm upgrade step — Node 22 bundled npm is sufficient

## [1.0.4] - 2026-04-02

### Fixed
- Add repository URL to package.json for provenance verification

## [1.0.3] - 2026-04-02

### Fixed
- Use NPM_TOKEN for publish workflow

## [1.0.2] - 2026-04-02

### Fixed
- Fix publish workflow: use OIDC trusted publishing

## [1.0.1] - 2026-04-02

### Added
- Initial release: CLI task watcher, OneDrive sync, multi-machine agent execution
