## Why

AgentFleet has 0 GitHub stars, 0 forks, and near-zero npm downloads on its new repository (`daomar-dev/agentfleet`). The product is functionally complete — CLI with daemon mode, auto-start on Windows and macOS, web dashboard with PWA support, full i18n (en-US + zh-CN), and a brand-new identity under the Daomar organization (`@daomar/agentfleet` v2.0.2). However, the project has zero market awareness. Without a user base, it cannot validate demand, attract contributors, or build toward commercial viability.

The goal is to reach **10,000+ GitHub stars within three months** of a coordinated multi-wave public launch, establishing AgentFleet as the recognized first-mover in zero-infrastructure AI agent orchestration.

The timing is ideal: AI coding agents (Copilot, Claude Code, Codex, Cursor) have become mainstream in 2025-2026, creating a new and unmet need for multi-machine agent coordination. No one has claimed this category yet. A three-month sustained growth campaign — not a single-day launch — is required to reach 10,000 stars.

## What Changes

### Product readiness (code changes)

- Add a public landing page at the web root for unauthenticated visitors, replacing the current login-wall experience. The landing page explains the value proposition, shows a demo, and links to GitHub / dashboard login.
- Rewrite the README (both en and zh-CN) from documentation-first to marketing-first structure: hook, demo GIF, value propositions, quick start, architecture diagram, comparison table, use cases, Star History chart, then link to full docs.
- Add GitHub repository metadata: badges (npm version, license, build status, downloads), Topics, Social Preview image, CHANGELOG.md, CONTRIBUTING.md, and GitHub Releases for every npm publish.
- Redesign the OG image to include an architecture diagram or terminal screenshot instead of the current generic card.
- Add a Linux compatibility story or explicitly document the limitation and workaround.

### Content assets (non-code)

- Record a 30-second demo GIF and a 3-minute demo video showing the full submit-execute-results flow across multiple machines.
- Write launch content for each target platform: Hacker News (Show HN), Reddit, Product Hunt, Twitter/X thread, Dev.to/Hashnode article, plus Chinese equivalents (V2EX, Juejin, Zhihu, Bilibili, WeChat).
- Create a "Why AgentFleet?" comparison page or README section contrasting AgentFleet with SSH scripts, Ansible, and cloud CI.

### Sustained growth engine (new for 10K target)

- Establish a weekly content cadence: one technical article or integration tutorial per week for 8 weeks after launch.
- Write agent-specific integration guides for Claude Code, GitHub Copilot, Cursor, and Codex CLI.
- Create shareable architecture infographics and short-form video content.
- Translate and adapt all key content for Chinese developer platforms (Juejin, Zhihu, Bilibili).

### Viral mechanics and discovery

- Optimize for GitHub Trending by concentrating star velocity during launch windows.
- Embed Star History chart in README for social proof.
- Submit to curated "Awesome" lists (awesome-selfhosted, awesome-ai-agents, awesome-developer-tools).
- Submit to discovery platforms (AlternativeTo, GitHub topic pages).
- Leverage milestone moments (1K, 5K stars) for secondary viral waves.

### Community infrastructure

- Enable GitHub Discussions on the repository for questions, ideas, and announcements.
- Add a CONTRIBUTING.md with clear first-issue guidance to attract contributors.

## Scope boundaries and non-goals

- **Not in scope:** Building new CLI/agent features. The product is feature-complete enough for launch.
- **Not in scope:** Paid/enterprise features or commercial model changes.
- **Not in scope:** Linux native OneDrive support (document the WSL/rclone workaround instead).
- **Not in scope:** Pitch decks or investor materials. Focus is on organic developer adoption.
- **Not in scope:** Discord server or real-time chat community. GitHub Discussions is sufficient for this phase.
- **Not in scope:** Domain acquisition (agentfleet.com etc.) — can happen independently.

## Three-wave growth model

### Wave 1: Ignition (Weeks 1-3) — Target: 200-500 stars

Product polish and seed phase. Ship landing page, marketing-first README, demo GIF, OG image, GitHub infrastructure (Releases, Topics, Discussions, CONTRIBUTING, CHANGELOG). Quietly share with personal network and early adopters for initial stars, feedback, and bug reports.

### Wave 2: Combustion (Weeks 3-5) — Target: 500-3,000 stars

Coordinated 7-day staggered launch across all platforms. Each day targets a different platform to maximize reach and avoid attention splitting. HN → Reddit → Twitter/X → Product Hunt → Chinese platforms → follow-up engagement.

### Wave 3: Sustained burn (Weeks 5-12) — Target: 3,000-10,000 stars

Weekly content engine (technical articles + integration tutorials), Awesome list submissions, discovery platform submissions, milestone celebrations, cross-platform amplification. Each viral moment feeds the next.

## Capabilities

### New Capabilities

- `web-landing-page`: A public-facing landing page rendered at the web root for unauthenticated visitors, presenting the value proposition, architecture overview, demo media, and call-to-action links before requiring sign-in.
- `github-repo-metadata`: Repository-level assets including badges, Topics, Social Preview image, CHANGELOG.md, CONTRIBUTING.md, and GitHub Releases configuration to increase discoverability and credibility.
- `comparison-content`: A "Why AgentFleet?" section or page comparing AgentFleet to alternative approaches (SSH, Ansible, cloud CI) across dimensions like infrastructure, security, setup time, and agent support.
- `content-engine`: A sustained content pipeline producing weekly technical articles, integration tutorials, and social media content across English and Chinese platforms to drive organic discovery.

### Modified Capabilities

- `brand-assets`: OG image redesign to include architecture visualization or terminal screenshot instead of the current generic card.
- `i18n-readme`: README restructure from documentation-first to marketing-first narrative in both en-US and zh-CN, including embedded demo GIF, badges, comparison table, and Star History chart.
- `web-geo-about-page`: About page cross-linked with the new landing page.

## Impact

- **Web app**: New unauthenticated route at `/` that renders the landing page; authenticated users bypass it and see the existing dashboard. Affects `web/src/index.ts`, `web/src/router.ts`, and a new `web/src/components/landing.ts`.
- **Static assets**: New or updated files in `web/public/` (OG image, demo GIF/video, social preview).
- **Repository root**: New `CHANGELOG.md`, `CONTRIBUTING.md`, updated `README.md` and `README.zh-CN.md`, new GitHub Actions workflow for release automation.
- **Testing**: Landing page rendering and route-guard tests (web/Vitest). README badge URLs validated. No CLI behavior changes, so no CLI test impact.
- **External platforms**: Content creation for 10+ platforms is manual work outside the codebase, but launch timing and content templates can be tracked in tasks.
- **Timeline milestones**: Week 3 (launch-ready), Week 5 (post-launch assessment), Week 8 (mid-campaign review), Week 12 (final assessment).

## Testing Impact

- All existing CLI tests (21 files under `test/`) remain unchanged — no CLI behavior modifications.
- All existing web tests (under `web/src/`) remain unchanged.
- New tests required: landing page component tests, router tests for unauthenticated landing experience.
- Full `npm test` (CLI) and `cd web && npm test` (web) must pass before merge.
