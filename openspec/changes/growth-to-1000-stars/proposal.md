## Why

AgentFleet has 1 GitHub star, 0 forks, and near-zero npm downloads. The product is functionally complete (CLI, daemon, macOS/Windows, web dashboard, PWA, i18n) but has zero market awareness. Without a user base, the project cannot validate demand, attract contributors, or build toward commercial viability. The goal is to reach 1,000+ GitHub stars within two months of a coordinated public launch, establishing AgentFleet as the recognized first-mover in zero-infrastructure AI agent orchestration.

The timing is ideal: AI coding agents (Copilot, Claude Code, Codex, Cursor) have become mainstream in 2025-2026, creating a new and unmet need for multi-machine agent coordination. No one has claimed this category yet.

## What Changes

### Product readiness (code changes)

- Add a public landing page at the web root for unauthenticated visitors, replacing the current login-wall experience. The landing page explains the value proposition, shows a demo, and links to GitHub / dashboard login.
- Rewrite the README (both en and zh-CN) from documentation-first to marketing-first structure: hook, demo GIF, value propositions, quick start, architecture diagram, then link to full docs.
- Add GitHub repository metadata: badges (npm version, license, build status, downloads), Topics, Social Preview image, CHANGELOG.md, CONTRIBUTING.md, and GitHub Releases for every npm publish.
- Redesign the OG image to include an architecture diagram or terminal screenshot instead of the current generic blue card.
- Add a Linux compatibility story or explicitly document the limitation and workaround.

### Content assets (non-code)

- Record a 30-second demo GIF and a 3-minute demo video showing the full submit-execute-results flow across multiple machines.
- Write launch content for each target platform: Hacker News (Show HN), Reddit, Product Hunt, Twitter/X thread, Dev.to/Hashnode article, plus Chinese equivalents (V2EX, Juejin, Zhihu, Bilibili, WeChat).
- Create a "Why AgentFleet?" comparison page or README section contrasting AgentFleet with SSH scripts, Ansible, and cloud CI.

### Community infrastructure

- Enable GitHub Discussions on the repository.
- Set up a Discord server (or similar) for user community.
- Add a CONTRIBUTING.md with clear first-issue guidance to attract contributors.

## Scope boundaries and non-goals

- **Not in scope:** Renaming the project or acquiring a new domain. These are strategic decisions that can happen independently after launch feedback.
- **Not in scope:** Building new CLI/agent features. The product is feature-complete enough for launch.
- **Not in scope:** Paid/enterprise features or commercial model changes.
- **Not in scope:** Linux native OneDrive support (document the WSL/rclone workaround instead).
- **Not in scope:** Pitch decks or investor materials. Focus is on organic developer adoption.

## Capabilities

### New Capabilities

- `web-landing-page`: A public-facing landing page rendered at the web root for unauthenticated visitors, presenting the value proposition, architecture overview, demo media, and call-to-action links before requiring sign-in.
- `github-repo-metadata`: Repository-level assets including badges, Topics, Social Preview image, CHANGELOG.md, CONTRIBUTING.md, and GitHub Releases configuration to increase discoverability and credibility.
- `comparison-content`: A "Why AgentFleet?" section or page comparing AgentFleet to alternative approaches (SSH, Ansible, cloud CI) across dimensions like infrastructure, security, setup time, and agent support.

### Modified Capabilities

- `brand-assets`: OG image redesign to include architecture visualization or terminal screenshot instead of the current generic card.
- `i18n-readme`: README restructure from documentation-first to marketing-first narrative in both en-US and zh-CN, including embedded demo GIF and badges.
- `web-geo-about-page`: About page may be absorbed into or linked from the new landing page.

## Impact

- **Web app**: New unauthenticated route at `/` that renders the landing page; authenticated users see the existing dashboard. Affects `web/src/index.ts`, `web/src/router.ts`, and a new `web/src/components/landing.ts`.
- **Static assets**: New or updated files in `web/public/` (OG image, demo GIF/video, social preview).
- **Repository root**: New `CHANGELOG.md`, `CONTRIBUTING.md`, updated `README.md` and `README.zh-CN.md`, new GitHub Actions workflow for release automation.
- **Testing**: Landing page rendering and route-guard tests (web/Vitest). README badge URLs validated. No CLI behavior changes, so no CLI test impact.
- **External platforms**: Content creation for 10+ platforms is manual work outside the codebase, but launch timing and content templates can be tracked in tasks.
