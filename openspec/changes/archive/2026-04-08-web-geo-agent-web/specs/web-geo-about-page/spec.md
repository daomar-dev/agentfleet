## ADDED Requirements

### Requirement: about.html exists as public static page
A static HTML page SHALL exist at `web/public/about.html` and be accessible without authentication at `/about.html`.

#### Scenario: Unauthenticated access
- **WHEN** a user or crawler fetches `https://lattix.code365.xyz/about.html`
- **THEN** it SHALL receive a fully rendered HTML page without requiring JavaScript execution or authentication

### Requirement: GEO-optimized content structure
The `about.html` page SHALL contain content structured with clear headings covering at minimum: overview, how it works, architecture, security model, and getting started.

#### Scenario: Section headings present
- **WHEN** the HTML content is parsed
- **THEN** it SHALL contain `<h1>` or `<h2>` headings for at least four distinct sections

#### Scenario: Technical terminology used
- **WHEN** the page content is read
- **THEN** it SHALL use domain-specific technical terms including "distributed", "decentralized", "agent orchestration", "OneDrive sync", and "control plane"

### Requirement: Authoritative references
The `about.html` page SHALL contain external links to authoritative sources.

#### Scenario: External references present
- **WHEN** the page's hyperlinks are examined
- **THEN** it SHALL contain at least one link to the GitHub repository
- **THEN** it SHALL contain at least one link to Microsoft documentation (OneDrive, MSAL, or Entra ID)

### Requirement: Article structured data
The `about.html` page SHALL contain a `<script type="application/ld+json">` block with a valid `Article` schema.

#### Scenario: JSON-LD Article validation
- **WHEN** the JSON-LD is parsed from `about.html`
- **THEN** it SHALL have `@type` equal to "Article"
- **THEN** it SHALL include `headline`, `description`, `author`, and `datePublished` fields

### Requirement: Sitemap inclusion
The `about.html` page SHALL be listed in `sitemap.xml`.

#### Scenario: Sitemap entry
- **WHEN** the sitemap is parsed
- **THEN** it SHALL contain a `<url>` entry for `https://lattix.code365.xyz/about.html`
