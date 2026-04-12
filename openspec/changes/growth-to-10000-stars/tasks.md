## 1. Web Landing Page — Tests

- [x] 1.1 Add `web/src/components/landing.test.ts` with tests: landing page renders hero section (logo, tagline, CLI command, demo media element) for unauthenticated visitors
- [x] 1.2 Add landing page test: renders at least three value proposition blocks with headings and descriptions
- [x] 1.3 Add landing page test: renders architecture overview section
- [x] 1.4 Add landing page test: renders CTA links (GitHub repo link with `target="_blank"`, sign-in button)
- [x] 1.5 Extend `web/src/router.test.ts`: unauthenticated visitor at `/` sees landing page component, not login card
- [x] 1.6 Extend `web/src/router.test.ts`: authenticated visitor at `/` sees dashboard home, not landing page

## 2. Web Landing Page — Implementation

- [x] 2.1 Add landing page i18n keys to `web/src/locales/en-US.json` and `web/src/locales/zh-CN.json` (hero, value props, architecture, CTAs)
- [x] 2.2 Create `web/src/components/landing.ts` with hero section: logo, tagline, `npx -y @daomar/agentfleet run` command, demo media placeholder
- [x] 2.3 Add value propositions section to landing page (zero servers, zero config, enterprise security) with i18n
- [x] 2.4 Add architecture overview section to landing page with visual diagram (ASCII or inline SVG)
- [x] 2.5 Add CTA section: GitHub link (`target="_blank"`), sign-in button, link to about page
- [x] 2.6 Update `web/src/router.ts` to render landing page for unauthenticated visitors instead of login card
- [x] 2.7 Add responsive CSS for landing page in `web/public/styles/main.css` (mobile-first, >= 320px)
- [x] 2.8 Update `web/src/components/login.ts` or remove if fully replaced by landing page sign-in flow

## 3. OG Image Redesign

- [ ] 3.1 Design new OG image (1200x630 PNG) featuring architecture visualization: multiple machine icons connected through OneDrive with task flow arrows, plus AgentFleet branding
- [ ] 3.2 Replace `web/public/og-image.png` with new design
- [ ] 3.3 Upload the same image as GitHub Social Preview (Settings > Social preview) — manual step

## 4. Demo Media

- [ ] 4.1 Record 30-second terminal demo: `agentfleet run` on two machines, `agentfleet submit` from a third, results appearing (use asciinema or screen capture)
- [ ] 4.2 Convert recording to GIF (optimized, < 5MB) for README embedding
- [ ] 4.3 Record 3-minute full demo video: setup, submit, multi-machine execution, dashboard view of results
- [ ] 4.4 Upload demo video to YouTube and Bilibili
- [ ] 4.5 Add demo GIF to `assets/` directory (e.g., `assets/demo.gif`)

## 5. README Rewrite

- [x] 5.1 Rewrite `README.md` with marketing-first structure: (1) logo + one-line hook, (2) badges row, (3) embedded demo GIF, (4) three value propositions, (5) quick start (3 lines), (6) architecture diagram, (7) "Why AgentFleet?" comparison table, (8) use cases, (9) Star History chart, (10) links to docs/dashboard/contributing
- [x] 5.2 Move detailed documentation sections (full usage reference, task file format, daemon mode, auto-start) below the marketing sections or link to a separate docs page
- [x] 5.3 Add "Why AgentFleet?" comparison table: AgentFleet vs SSH scripts vs Ansible vs cloud CI across dimensions (infrastructure, network, security, setup time, agent support)
- [x] 5.4 Add at least two concrete use case examples with scenario descriptions and CLI commands
- [x] 5.5 Add badges row: npm version (`[![npm version](https://img.shields.io/npm/v/@daomar/agentfleet)](https://www.npmjs.com/package/@daomar/agentfleet)`), license, build status (GitHub Actions), npm downloads
- [x] 5.6 Add Star History chart embed (`[![Star History Chart](https://api.star-history.com/svg?repos=daomar-dev/agentfleet&type=Date)](https://star-history.com/#daomar-dev/agentfleet&Date)`)
- [x] 5.7 Rewrite `README.zh-CN.md` with the same marketing-first structure, translating all prose while preserving code blocks, badges, and demo media
- [x] 5.8 Verify both READMEs have structural parity (same sections, same order, same badges, same media)

## 6. GitHub Repository Metadata

- [x] 6.1 Create `CHANGELOG.md` at repository root with entries for all published versions (v1.0.9 through v2.0.2)
- [x] 6.2 Create `CONTRIBUTING.md` with: dev setup instructions, build/test commands, PR workflow, coding conventions, first-issue guidance
- [ ] 6.3 Create GitHub Releases for each published version (at minimum the latest v2.0.2) with release notes — manual via `gh release create` or GitHub UI
- [ ] 6.4 Add GitHub Topics to repository: `agent`, `orchestration`, `distributed`, `onedrive`, `devtools`, `ai`, `coding-agent`, `typescript` — manual via GitHub Settings
- [ ] 6.5 Enable GitHub Discussions on the repository — manual via GitHub Settings
- [x] 6.6 Add GitHub Actions workflow for automated release creation on version tag push (`.github/workflows/release.yml`)

## 7. About Page Cross-Linking

- [x] 7.1 Update `web/public/about.html` to include a link back to the root landing page
- [x] 7.2 Verify landing page links to about page for detailed documentation

## 8. Launch Content Preparation (Wave 2)

- [ ] 8.1 Write Show HN post draft: title + body text (focus on "zero-infrastructure" angle and OneDrive-as-coordination novelty)
- [ ] 8.2 Write Reddit post drafts for r/programming, r/devtools, and r/artificial
- [ ] 8.3 Write Product Hunt listing draft: tagline, description, first comment, media assets
- [ ] 8.4 Write Twitter/X launch thread (5-7 tweets with demo GIF)
- [ ] 8.5 Write Dev.to / Hashnode article: "I built a distributed AI agent orchestrator with zero infrastructure"
- [ ] 8.6 Write V2EX launch post (Chinese, adapted for V2EX tone)
- [ ] 8.7 Write Juejin article (Chinese technical article)
- [ ] 8.8 Write Zhihu post / answer (Chinese, problem-framing angle)
- [ ] 8.9 Write Bilibili video description and script outline (Chinese)
- [ ] 8.10 Write WeChat article draft (Chinese, story-driven)

## 9. Seed Phase (Wave 1, Weeks 1-3)

- [ ] 9.1 Share with personal network and collect initial 50-200 stars
- [ ] 9.2 Write a warm-up blog post on personal blog/social media introducing AgentFleet and the Daomar brand story
- [ ] 9.3 Invite 5-10 developer friends / industry contacts to try AgentFleet and provide feedback
- [ ] 9.4 Post teaser content on Twitter/X and relevant WeChat groups (preview, not full launch)
- [ ] 9.5 Collect feedback from early users and fix any landing page / README issues
- [ ] 9.6 Record at least one user testimonial or usage story for social proof

## 10. Launch Week Execution (Wave 2, 7-day staggered)

- [ ] 10.1 Day 1: Post Show HN (weekday morning US Eastern time)
- [ ] 10.2 Day 1: Monitor HN and respond to all comments within 2 hours
- [ ] 10.3 Day 2: Post Reddit threads (r/programming, r/devtools, r/artificial)
- [ ] 10.4 Day 3: Post Twitter/X launch thread with demo GIF
- [ ] 10.5 Day 4: Launch on Product Hunt
- [ ] 10.6 Day 5: Post simultaneously on V2EX, Juejin, Zhihu
- [ ] 10.7 Day 6: Publish Dev.to / Hashnode article
- [ ] 10.8 Day 7: Upload Bilibili video + Publish WeChat article
- [ ] 10.9 Cross-post: if HN/Reddit takes off, tweet about it within 24 hours ("AgentFleet hit the front page of HN!")
- [ ] 10.10 Track star velocity daily during launch week and adjust cross-posting timing accordingly

## 11. Verification

- [x] 11.1 Run `cd web && npm run build` — verify web build succeeds with landing page
- [x] 11.2 Run `cd web && npm test` — verify all web tests pass including new landing page and router tests
- [x] 11.3 Run `npm run build` — verify CLI build succeeds (no CLI changes expected, sanity check)
- [x] 11.4 Run `npm test` — verify CLI tests pass (no CLI changes expected, sanity check)
- [ ] 11.5 Manual verification: open `agentfleet.daomar.dev` in incognito browser — landing page renders with all sections
- [ ] 11.6 Manual verification: sign in — dashboard renders normally
- [ ] 11.7 Manual verification: share URL on Twitter/Slack — new OG image appears in preview card
- [ ] 11.8 Manual verification: GitHub repo page shows badges, topics, releases, discussions tab, social preview
- [ ] 11.9 Manual verification: `npx @daomar/agentfleet --help` works correctly (sanity check after any repo changes)

## 12. Content Engine (Wave 3, Weeks 5-12)

- [ ] 12.1 Create 8-week content calendar: 1 article/tutorial per week, alternating English-first and Chinese-first, with specific topics assigned to each week
- [ ] 12.2 Write integration guide: "Using AgentFleet with Claude Code — multi-machine coding at scale"
- [ ] 12.3 Write integration guide: "Using AgentFleet with GitHub Copilot CLI — fan out coding tasks across your fleet"
- [ ] 12.4 Write integration guide: "Using AgentFleet with Cursor — distributed AI development workflow"
- [ ] 12.5 Write integration guide: "Using AgentFleet with Codex CLI — orchestrate OpenAI agents across machines"
- [ ] 12.6 Write deep-dive article: "Zero-Infrastructure Agent Orchestration — how AgentFleet uses OneDrive as a message queue"
- [ ] 12.7 Write deep-dive article: "Building a Decentralized Task System with File Sync — architecture of AgentFleet"
- [ ] 12.8 Create shareable architecture infographic (single image, optimized for Twitter/WeChat sharing)
- [ ] 12.9 Record "5-minute AgentFleet setup" short video for Twitter/X and Bilibili
- [ ] 12.10 Translate and cross-post all English articles to Juejin/Zhihu; all Chinese articles to Dev.to/Hashnode

## 13. Awesome Lists + Discovery Platforms (Wave 3)

- [ ] 13.1 Submit PR to `awesome-selfhosted` (category: task management / automation)
- [ ] 13.2 Submit PR to `awesome-ai-agents` or `awesome-ai-tools`
- [ ] 13.3 Submit PR to `awesome-developer-tools`
- [ ] 13.4 Submit to AlternativeTo as alternative to Ansible / cloud CI tools
- [ ] 13.5 Verify GitHub Topics are configured (from task 6.4) and repo appears in topic discovery pages
- [ ] 13.6 Add Star History chart to README (from task 5.6) — verify it renders correctly on GitHub

## 14. Viral Amplification + Milestones (Wave 3)

- [ ] 14.1 Monitor GitHub Trending daily during Weeks 3-5; when star velocity spikes, cross-post to all platforms within 24 hours
- [ ] 14.2 At 1,000 stars: publish milestone celebration tweet/post + thank-you message on GitHub Discussions
- [ ] 14.3 At 5,000 stars: publish milestone blog post with growth story + product roadmap reveal
- [ ] 14.4 Collect user stories / testimonials from GitHub issues, Discussions, and social media — add to README and landing page
- [ ] 14.5 Track npm download counts weekly; share growth charts on social media as social proof
- [ ] 14.6 Publish "You asked, we built" update post responding to top community feedback themes
