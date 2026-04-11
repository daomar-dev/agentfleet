# i18n-core

Core internationalization module providing message catalog loading, string lookup with fallback, parameter interpolation, and locale-aware date/time formatting.

## Requirements

### Requirement: Message catalog format
The system SHALL use flat JSON files as message catalogs, with dot-notation keys mapping to localized string values. Each supported locale SHALL have its own JSON file (e.g., `en-US.json`, `zh-CN.json`).

#### Scenario: Catalog structure
- **WHEN** a message catalog file is loaded
- **THEN** it SHALL be a flat JSON object where each key is a dot-notation string (e.g., `"run.starting"`) and each value is the localized text for that key

### Requirement: String lookup function
The system SHALL provide a `t(key, params?)` function that looks up a message by key in the active locale's catalog and returns the localized string. If the key is not found in the active locale, it SHALL fall back to en-US. If the key is not found in any locale, it SHALL return the raw key string.

#### Scenario: Successful lookup
- **WHEN** `t("run.starting")` is called and the active locale catalog contains the key `"run.starting"`
- **THEN** the function SHALL return the localized string value for that key

#### Scenario: Fallback to en-US
- **WHEN** `t("some.key")` is called and the key does not exist in the active locale catalog but exists in en-US
- **THEN** the function SHALL return the en-US string value

#### Scenario: Key not found in any locale
- **WHEN** `t("nonexistent.key")` is called and the key does not exist in any locale catalog
- **THEN** the function SHALL return the string `"nonexistent.key"`

### Requirement: Parameter interpolation
The `t()` function SHALL support parameter interpolation using `{paramName}` placeholders. When a params object is provided, each `{key}` in the message string SHALL be replaced with the corresponding value from the params object.

#### Scenario: Single parameter interpolation
- **WHEN** `t("run.already_running", { pid: 1234 })` is called and the message template is `"AgentFleet is already running (PID {pid})"`
- **THEN** the function SHALL return `"AgentFleet is already running (PID 1234)"`

#### Scenario: Multiple parameter interpolation
- **WHEN** `t("status.header", { count: 5, hostname: "PC1" })` is called and the message template contains both `{count}` and `{hostname}` placeholders
- **THEN** the function SHALL replace all placeholders with their corresponding values

### Requirement: Supported locales
The system SHALL support exactly two locales: `en-US` (English) and `zh-CN` (Simplified Chinese). `en-US` SHALL be the default fallback locale.

#### Scenario: Supported locale set
- **WHEN** the system initializes its i18n module
- **THEN** it SHALL load catalogs for `en-US` and `zh-CN` only

### Requirement: Catalog completeness
The zh-CN message catalog SHALL contain the same set of keys as the en-US catalog. Every key present in en-US MUST also be present in zh-CN.

#### Scenario: Key parity between locales
- **WHEN** the en-US and zh-CN catalogs are compared
- **THEN** both catalogs SHALL have identical key sets

### Requirement: Locale-aware date formatting
The i18n module SHALL provide a `formatDate(date, locale)` function that formats a date using `Intl.DateTimeFormat` with the active locale. The output SHALL use locale-appropriate conventions (e.g., `2025年1月5日 14:30` for zh-CN, `Jan 5, 2025, 2:30 PM` for en-US).

#### Scenario: Date formatted in Chinese
- **WHEN** `formatDate("2025-01-05T14:30:00Z", "zh-CN")` is called
- **THEN** the output SHALL contain Chinese date formatting conventions (e.g., year-month-day with Chinese characters)

#### Scenario: Date formatted in English
- **WHEN** `formatDate("2025-01-05T14:30:00Z", "en-US")` is called
- **THEN** the output SHALL contain English date formatting conventions (e.g., `Jan 5, 2025`)

### Requirement: Locale-aware relative time formatting
The i18n module SHALL provide a `formatRelativeTime(date, locale)` function that formats a date as a human-readable relative time string using `Intl.RelativeTimeFormat`. The output SHALL use locale-appropriate phrasing (e.g., `2小时前` for zh-CN, `2 hours ago` for en-US).

#### Scenario: Relative time in Chinese
- **WHEN** a date 2 hours in the past is formatted with locale `zh-CN`
- **THEN** the output SHALL be a Chinese relative time expression (e.g., `2小时前`)

#### Scenario: Relative time in English
- **WHEN** a date 2 hours in the past is formatted with locale `en-US`
- **THEN** the output SHALL be an English relative time expression (e.g., `2 hours ago`)
