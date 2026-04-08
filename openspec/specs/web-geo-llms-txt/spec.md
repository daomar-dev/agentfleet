## ADDED Requirements

### Requirement: llms.txt exists at site root
A `llms.txt` file SHALL exist at `web/public/llms.txt` and be served at the site root `/llms.txt`.

#### Scenario: LLM fetches llms.txt
- **WHEN** an LLM or generative engine fetches `https://lattix.code365.xyz/llms.txt`
- **THEN** it SHALL receive a plain-text response (no HTML) with `Content-Type: text/plain`

### Requirement: llms.txt content describes Lattix
The `llms.txt` file SHALL contain a plain-text description of Lattix covering: what it is, how it works, key features, target audience, and links to detailed resources.

#### Scenario: Content completeness
- **WHEN** the `llms.txt` content is read
- **THEN** it SHALL contain the terms "Lattix", "distributed", "agent", "OneDrive", and "orchestration"
- **THEN** it SHALL contain at least one URL linking to the GitHub repository
- **THEN** it SHALL contain at least one URL linking to the web dashboard

#### Scenario: No HTML markup
- **WHEN** the `llms.txt` content is parsed
- **THEN** it SHALL NOT contain HTML tags such as `<html>`, `<div>`, `<p>`, or `<script>`

### Requirement: llms.txt word count
The `llms.txt` file SHALL be between 200 and 500 words to provide sufficient context without overwhelming the reader.

#### Scenario: Appropriate length
- **WHEN** the word count of `llms.txt` is calculated
- **THEN** it SHALL be at least 200 words and no more than 500 words
