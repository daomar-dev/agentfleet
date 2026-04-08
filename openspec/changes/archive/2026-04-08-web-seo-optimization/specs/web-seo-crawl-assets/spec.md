## ADDED Requirements

### Requirement: robots.txt allows all crawlers
A `robots.txt` file SHALL exist at the site root allowing all user agents to crawl all public paths.

#### Scenario: Crawler checks robots.txt
- **WHEN** a crawler fetches `https://lattix.code365.xyz/robots.txt`
- **THEN** it SHALL receive a valid robots.txt with `User-agent: *` and `Allow: /`

#### Scenario: Sitemap reference in robots.txt
- **WHEN** a crawler reads the robots.txt
- **THEN** it SHALL find a `Sitemap:` directive pointing to `https://lattix.code365.xyz/sitemap.xml`

### Requirement: sitemap.xml lists public pages
A `sitemap.xml` file SHALL exist at the site root listing all publicly accessible pages.

#### Scenario: Sitemap contains landing page
- **WHEN** a search engine fetches `https://lattix.code365.xyz/sitemap.xml`
- **THEN** it SHALL contain a `<url>` entry for `https://lattix.code365.xyz/`

#### Scenario: Sitemap contains donation page
- **WHEN** a search engine fetches the sitemap
- **THEN** it SHALL contain a `<url>` entry for `https://lattix.code365.xyz/donate.html`

#### Scenario: Sitemap excludes authenticated routes
- **WHEN** a search engine parses the sitemap
- **THEN** it SHALL NOT contain URLs for hash-based routes like `#/tasks` or `#/settings`

### Requirement: Sitemap is valid XML
The `sitemap.xml` file SHALL conform to the Sitemaps.org protocol schema.

#### Scenario: XML validation
- **WHEN** the sitemap is parsed as XML
- **THEN** it SHALL have a root `<urlset>` element with the `xmlns` attribute set to `http://www.sitemaps.org/schemas/sitemap/0.9`
