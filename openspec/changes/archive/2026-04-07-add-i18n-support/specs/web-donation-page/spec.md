## MODIFIED Requirements

### Requirement: Standalone donation page
The system SHALL serve a static donation page at `/donate.html` that is accessible without authentication. The page SHALL detect the browser locale and adapt its layout and text accordingly.

#### Scenario: Unauthenticated access
- **WHEN** a user navigates to `/donate.html` without being logged in
- **THEN** the donation page SHALL render fully without redirecting to a login page

#### Scenario: Direct link access
- **WHEN** a user opens a direct link to `/donate.html` from an external source (README, GitHub, email)
- **THEN** the page SHALL load independently of the SPA application

#### Scenario: Chinese locale channel ordering
- **WHEN** a user with browser locale `zh-CN` or `zh` views the donation page
- **THEN** the WeChat Pay channel SHALL be displayed before the PayPal channel
- **THEN** the page header and footer text SHALL be in Simplified Chinese
- **THEN** the `<html lang>` attribute SHALL be set to `zh-CN`

#### Scenario: Non-Chinese locale channel ordering
- **WHEN** a user with a non-Chinese browser locale views the donation page
- **THEN** the PayPal channel SHALL be displayed before the WeChat Pay channel
- **THEN** the page header and footer text SHALL be in English
- **THEN** the `<html lang>` attribute SHALL remain `en`

### Requirement: Responsive layout
The donation page SHALL display the two donation channels side by side on desktop and stacked vertically on mobile. The locale-based channel ordering SHALL be preserved in both layouts.

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 768px or wider
- **THEN** the PayPal and WeChat sections SHALL appear side by side, with the locale-preferred channel on the left

#### Scenario: Mobile viewport
- **WHEN** the viewport width is narrower than 768px
- **THEN** the PayPal and WeChat sections SHALL stack vertically, with the locale-preferred channel on top

## ADDED Requirements

### Requirement: Donation page Chinese font stack
The donation page's CSS `font-family` SHALL include Chinese sans-serif font fallbacks (`"Microsoft YaHei"`, `"PingFang SC"`) to ensure consistent Chinese character rendering.

#### Scenario: Chinese text rendering
- **WHEN** the donation page renders Chinese text
- **THEN** the text SHALL use a sans-serif Chinese font (not the browser's default serif fallback)
