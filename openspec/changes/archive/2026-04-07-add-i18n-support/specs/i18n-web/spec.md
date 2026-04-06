## ADDED Requirements

### Requirement: Web locale detection
The web dashboard SHALL detect the user's locale using the following precedence order:
1. `localStorage.getItem('lattix-lang')` (user preference)
2. `navigator.language` (browser language)
3. Falls back to `en-US`

If the detected locale starts with `zh`, the system SHALL use `zh-CN`. Otherwise, it SHALL use `en-US`.

#### Scenario: Browser language is Simplified Chinese
- **WHEN** the browser language is `zh-CN` or `zh` and no localStorage override is set
- **THEN** the web dashboard SHALL display all UI text in Simplified Chinese

#### Scenario: Browser language is not Chinese
- **WHEN** the browser language is `en-US`, `de-DE`, or any non-Chinese locale
- **THEN** the web dashboard SHALL display all UI text in English

#### Scenario: localStorage language override
- **WHEN** `localStorage` contains `lattix-lang` set to `zh-CN`
- **THEN** the web dashboard SHALL use `zh-CN` regardless of `navigator.language`

### Requirement: Component text localization
All user-facing text in web dashboard components SHALL be sourced from the i18n message catalog using the `t()` function. This includes page titles, section headers, form labels, button text, placeholder text, empty state messages, error messages, and toast notifications.

#### Scenario: Home page in Chinese
- **WHEN** the locale is `zh-CN` and the user views the home page
- **THEN** all section headers (e.g., Nodes, Recent Tasks, Submit a Task), form labels, button text, empty state messages, and onboarding text SHALL be in Simplified Chinese

#### Scenario: Task list in Chinese
- **WHEN** the locale is `zh-CN` and the user views the task list
- **THEN** the page header, empty state message, and load more button text SHALL be in Simplified Chinese

#### Scenario: Task detail in Chinese
- **WHEN** the locale is `zh-CN` and the user views a task detail page
- **THEN** all labels (ID, Created, Created by), table headers (Machine, Status, Exit Code, Duration, Completed), and navigation text SHALL be in Simplified Chinese

#### Scenario: Settings page in Chinese
- **WHEN** the locale is `zh-CN` and the user views the settings page
- **THEN** section headers, descriptions, form hints, and button text SHALL be in Simplified Chinese

#### Scenario: Navbar in Chinese
- **WHEN** the locale is `zh-CN`
- **THEN** navigation labels (Home, Tasks, Settings), the brand slogan, account type labels, and the logout button SHALL be in Simplified Chinese

#### Scenario: Login page in Chinese
- **WHEN** the locale is `zh-CN` and the user is on the login page
- **THEN** the tagline and sign-in button text SHALL be in Simplified Chinese

### Requirement: Web i18n message catalog
The web dashboard SHALL maintain message catalog JSON files at `web/src/locales/en-US.json` and `web/src/locales/zh-CN.json` containing all user-facing strings used by web components.

#### Scenario: Catalog file locations
- **WHEN** the web dashboard is built
- **THEN** the message catalogs at `web/src/locales/en-US.json` and `web/src/locales/zh-CN.json` SHALL be bundled into the build output

### Requirement: Pluralization in web
The `t()` function for the web dashboard SHALL support simple pluralization via parameter interpolation. Components that display count-dependent text (e.g., "1 result" vs. "5 results") SHALL use separate message keys or interpolation patterns to handle singular and plural forms.

#### Scenario: Plural form in English
- **WHEN** the locale is `en-US` and a component displays a count of 5 results
- **THEN** the text SHALL read "Results (5 machines)" using the plural form

#### Scenario: Count-based text in Chinese
- **WHEN** the locale is `zh-CN` and a component displays a count of 5 results
- **THEN** the text SHALL use the appropriate Chinese phrasing without English plural suffixes

### Requirement: Dynamic HTML lang attribute
The web dashboard SHALL set the `<html lang>` attribute to the detected locale (`en-US` or `zh-CN`) on page load. This SHALL be updated before any component rendering occurs.

#### Scenario: HTML lang set to Chinese
- **WHEN** the detected locale is `zh-CN`
- **THEN** the `<html>` element's `lang` attribute SHALL be `zh-CN`

#### Scenario: HTML lang set to English
- **WHEN** the detected locale is `en-US`
- **THEN** the `<html>` element's `lang` attribute SHALL be `en-US`

### Requirement: Page title and meta description localization
The web dashboard SHALL set the `<title>` element and `<meta name="description">` content to localized values from the message catalog on page load.

#### Scenario: Page title in Chinese
- **WHEN** the detected locale is `zh-CN`
- **THEN** the page title SHALL be displayed in Chinese

#### Scenario: Meta description in Chinese
- **WHEN** the detected locale is `zh-CN`
- **THEN** the `<meta name="description">` content SHALL be in Chinese

### Requirement: Web date/time locale formatting
The web dashboard SHALL format all user-facing date and time values (task creation time, last active time, result completion time) using `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` with the active locale.

#### Scenario: Task timestamps in Chinese
- **WHEN** the locale is `zh-CN` and a task detail page displays timestamps
- **THEN** dates SHALL use Chinese formatting conventions and relative times SHALL use Chinese phrasing

#### Scenario: Last active time in Chinese
- **WHEN** the locale is `zh-CN` and the home page shows a node's last active time
- **THEN** the relative time SHALL be displayed in Chinese (e.g., `2小时前`)

### Requirement: Chinese font stack
The web dashboard's CSS SHALL include Chinese sans-serif fonts in the `font-family` fallback chain to ensure consistent Chinese character rendering across platforms.

#### Scenario: Font stack includes Chinese fonts
- **WHEN** the web dashboard CSS is loaded
- **THEN** the `font-family` declaration SHALL include `"Microsoft YaHei"` (Windows) and `"PingFang SC"` (macOS/iOS) before the generic `sans-serif` fallback

### Requirement: PWA manifest localization
The PWA `manifest.json` SHALL include a `lang` field. The web dashboard SHALL update the manifest's `description` to match the detected locale.

#### Scenario: Manifest description for Chinese locale
- **WHEN** the detected locale is `zh-CN` and the user installs the PWA
- **THEN** the PWA description displayed by the OS SHALL be in Chinese
