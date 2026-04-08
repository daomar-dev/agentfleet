## ADDED Requirements

### Requirement: Static meta description in HTML source
The `index.html` file SHALL contain a static `<meta name="description">` tag with an English description of Lattix visible to crawlers without JavaScript execution.

#### Scenario: Crawler reads HTML without JS
- **WHEN** a crawler fetches `index.html` without executing JavaScript
- **THEN** the HTML source SHALL contain `<meta name="description" content="...">` with a non-empty English description

### Requirement: Open Graph tags for social sharing
The `index.html` file SHALL contain Open Graph meta tags: `og:title`, `og:description`, `og:image`, `og:url`, and `og:type`.

#### Scenario: Link shared on social platform
- **WHEN** a user shares `https://lattix.code365.xyz/` on Twitter, LinkedIn, Slack, or Teams
- **THEN** the platform SHALL display a rich preview with the Lattix title, description, and OG image

#### Scenario: OG image dimensions
- **WHEN** a social platform fetches the OG image
- **THEN** the image SHALL be at least 1200x630 pixels and accessible at the absolute URL specified in `og:image`

### Requirement: Twitter Card tags
The `index.html` file SHALL contain Twitter Card meta tags: `twitter:card`, `twitter:title`, `twitter:description`, and `twitter:image`.

#### Scenario: Link shared on Twitter/X
- **WHEN** a user shares the Lattix URL on Twitter/X
- **THEN** a `summary_large_image` card SHALL be displayed with title, description, and image

### Requirement: Canonical URL link
The `index.html` file SHALL contain a `<link rel="canonical" href="https://lattix.code365.xyz/">` tag.

#### Scenario: Search engine deduplication
- **WHEN** a search engine indexes the page
- **THEN** it SHALL find the canonical link pointing to the primary URL to avoid duplicate indexing

### Requirement: Dynamic i18n meta tag update
The `initI18n()` function SHALL update OG and Twitter Card meta tags with localized content when the detected locale is `zh-CN`.

#### Scenario: Chinese user visits the page
- **WHEN** a user with browser locale `zh-CN` loads the page
- **THEN** `og:title`, `og:description`, `twitter:title`, and `twitter:description` SHALL be updated to Chinese translations

#### Scenario: English user visits the page
- **WHEN** a user with browser locale `en-US` loads the page
- **THEN** the static English meta tags SHALL remain unchanged
