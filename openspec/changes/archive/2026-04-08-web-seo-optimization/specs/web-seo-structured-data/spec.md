## ADDED Requirements

### Requirement: JSON-LD SoftwareApplication structured data
The `index.html` file SHALL contain a `<script type="application/ld+json">` block with a valid `SoftwareApplication` schema.

#### Scenario: Google Rich Results validation
- **WHEN** the page is tested with Google's Rich Results Test tool
- **THEN** it SHALL detect a valid `SoftwareApplication` structured data object with fields: `@type`, `name`, `description`, `applicationCategory`, `operatingSystem`, `url`, `offers`, and `author`

#### Scenario: Structured data content accuracy
- **WHEN** a search engine parses the JSON-LD
- **THEN** `name` SHALL be "Lattix", `applicationCategory` SHALL be "DeveloperApplication", `operatingSystem` SHALL include "Windows", `offers.price` SHALL be "0", and `url` SHALL be "https://lattix.code365.xyz/"

### Requirement: JSON-LD is valid JSON
The embedded JSON-LD block SHALL be parseable as valid JSON without syntax errors.

#### Scenario: JSON parse validation
- **WHEN** the content of the `application/ld+json` script tag is parsed with `JSON.parse()`
- **THEN** it SHALL succeed without throwing an error and the resulting object SHALL have `@context` equal to "https://schema.org"
