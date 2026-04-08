## Why

Traditional SEO targets keyword-matching search engines. The landscape is shifting: generative engines (Bing Copilot, Google AI Overviews, Perplexity, ChatGPT search) now synthesize answers by reading and citing web sources. The GEO paper (Aggarwal et al., KDD 2024) shows that structured, authoritative, citation-rich content can boost visibility in generative engine responses by up to 40%. Separately, Microsoft's "agentic web" vision describes a future where AI agents browse, read, and act on web pages autonomously — discovering tools, understanding capabilities, and invoking actions without human clicks.

Lattix is an agent orchestration tool. Its web dashboard is a natural candidate to be both **visible to generative engines** (so developers discover it via AI-powered search) and **actionable by AI agents** (so an agent can programmatically understand and interact with Lattix capabilities). This change adds GEO-optimized content and agent-readable descriptors to the web dashboard.

## What Changes

- Add `llms.txt` (a lightweight "robots.txt for LLMs") at the site root describing Lattix's purpose, capabilities, and key pages in plain prose optimized for LLM consumption
- Add Schema.org `potentialAction` structured data to the JSON-LD, declaring the dashboard's `SearchAction` and task submission capability as machine-discoverable actions
- Create a `/about.html` static landing page with GEO-optimized content: technical terminology, authoritative references, statistics, structured sections — designed to be cited by generative engines
- Add `/.well-known/agent.json` manifest describing the dashboard's agent-accessible capabilities (name, description, actions, authentication requirements)
- Enrich the `donate.html` page with structured data (`DonateAction` schema) so generative engines can surface donation context

## Non-Goals

- Building a full MCP (Model Context Protocol) server for the dashboard — that would be a separate change
- Automating task submission from an external AI agent end-to-end — the structured data declares the capability; actual programmatic submission via Graph API is already possible
- Replacing the human-facing UI with an agent-facing one — this is additive, not a replacement

## Capabilities

### New Capabilities
- `web-geo-llms-txt`: A `llms.txt` file at the site root providing LLM-friendly plain-text description of Lattix
- `web-geo-about-page`: A static `/about.html` page with GEO-optimized content (statistics, citations, technical depth) designed for generative engine citation
- `web-geo-agent-manifest`: A `/.well-known/agent.json` manifest and Schema.org `potentialAction` declarations making the dashboard discoverable and partially actionable by AI agents

### Modified Capabilities
<!-- No existing spec-level behavior changes -->

## Impact

- **Files created**: `web/public/llms.txt`, `web/public/about.html`, `web/public/.well-known/agent.json`
- **Files modified**: `web/index.html` (extended JSON-LD with `potentialAction`), `web/public/donate.html` (add `DonateAction` structured data), `web/public/sitemap.xml` (add new public pages)
- **Dependencies**: None — all static files, no new runtime dependencies
- **Testing**: Vitest tests for JSON-LD `potentialAction` schema validation, `llms.txt` format checks, `agent.json` schema validation
