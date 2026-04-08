## 1. llms.txt

- [x] 1.1 Create `web/public/llms.txt` with 200-500 words of plain-text content describing Lattix: what it is, how it works, key features, target audience, and links to GitHub and dashboard

## 2. about.html

- [x] 2.1 Create `web/public/about.html` as a static, publicly accessible page with GEO-optimized content (technical terminology, authoritative references, structured sections)
- [x] 2.2 Add JSON-LD `Article` structured data to `about.html` with `headline`, `description`, `author`, and `datePublished`
- [x] 2.3 Update `web/public/sitemap.xml` to include `/about.html` entry (coordinate with SEO change if sitemap doesn't exist yet)

## 3. Agent Manifest

- [x] 3.1 Create `web/public/.well-known/agent.json` with fields: `schema_version`, `name`, `description`, `url`, `auth`, `capabilities` (submit_task, view_tasks, view_nodes)

## 4. Schema.org potentialAction

- [x] 4.1 Extend the `SoftwareApplication` JSON-LD in `web/index.html` with `potentialAction` array containing at least one Schema.org Action entry with `@type` and `target`
- [x] 4.2 Add JSON-LD `DonateAction` structured data to `web/public/donate.html` with `target` linking to PayPal

## 5. Tests

- [x] 5.1 Write Vitest test: verify `llms.txt` exists in build output, is plain text (no HTML tags), contains required terms, and is 200-500 words
- [x] 5.2 Write Vitest test: verify `agent.json` parses as valid JSON with required fields and well-formed capabilities array
- [x] 5.3 Write Vitest test: verify `index.html` JSON-LD contains `potentialAction` with `@type` and `target`
- [x] 5.4 Write Vitest test: verify `about.html` contains JSON-LD Article with required fields
- [x] 5.5 Write Vitest test: verify `donate.html` contains JSON-LD DonateAction

## 6. Verification

- [x] 6.1 Run `cd web && npm run build` and confirm no errors
- [x] 6.2 Run `cd web && npm test` and confirm all tests pass
- [x] 6.3 Verify all new static files appear in `web/dist/` after build (`llms.txt`, `about.html`, `.well-known/agent.json`)
