# web-donation-page

Standalone static donation page presenting PayPal and WeChat Pay channels, accessible without authentication.

## Requirements

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

### Requirement: PayPal donation channel
The donation page SHALL display a PayPal donation section in English, containing a QR code encoding the PayPal.me URL and a clickable link button to the PayPal.me URL (`https://paypal.me/chenxizhang2026`).

#### Scenario: PayPal button interaction
- **WHEN** a user clicks the PayPal donation link
- **THEN** the browser SHALL open the PayPal.me page (in a new tab)

#### Scenario: PayPal card content order
- **WHEN** the donation page renders the PayPal card
- **THEN** the card SHALL display in order: title, description, QR code image, donate button

### Requirement: PayPal QR code display
The PayPal channel card SHALL display a QR code image encoding the PayPal.me URL (`https://paypal.me/chenxizhang2026`). The QR code modules SHALL use PayPal brand blue (#0070ba) as foreground color on a white background. The QR code image SHALL be the same display height as the WeChat QR code image.

#### Scenario: PayPal QR code rendering
- **WHEN** the donation page loads
- **THEN** the PayPal card SHALL display a QR code image above the "Donate with PayPal" button
- **THEN** the QR code SHALL encode the URL `https://paypal.me/chenxizhang2026`
- **THEN** the QR code foreground color SHALL be #0070ba (PayPal blue)

#### Scenario: PayPal QR code size matches WeChat QR code
- **WHEN** the donation page renders on any viewport
- **THEN** the PayPal QR code image display height SHALL match the WeChat QR code image display height

### Requirement: WeChat Pay donation channel
The donation page SHALL display a WeChat Pay donation section in Chinese, containing the WeChat payment QR code image (`wechat-donation.jpg`).

#### Scenario: WeChat QR code display
- **WHEN** the donation page loads
- **THEN** the WeChat section SHALL display the QR code image at a scannable size
- **THEN** the section text SHALL be in Chinese

### Requirement: Responsive layout
The donation page SHALL display the two donation channels side by side on desktop and stacked vertically on mobile. The locale-based channel ordering SHALL be preserved in both layouts. Both channel cards SHALL use compact vertical spacing between description text and visual content (QR codes and buttons) without excessive gaps.

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 768px or wider
- **THEN** the PayPal and WeChat sections SHALL appear side by side, with the locale-preferred channel on the left

#### Scenario: Mobile viewport
- **WHEN** the viewport width is narrower than 768px
- **THEN** the PayPal and WeChat sections SHALL stack vertically, with the locale-preferred channel on top

#### Scenario: Compact card spacing
- **WHEN** the donation page renders on any viewport
- **THEN** both channel cards SHALL NOT have large empty gaps between the description text and the QR code / button area

### Requirement: Desktop navbar donation link
The web dashboard's desktop navigation bar SHALL include a "Donate" link that opens `/donate.html`. The heart icon preceding the link text SHALL be displayed in red (#e74c3c).

#### Scenario: Desktop navbar rendering
- **WHEN** the navbar renders on a desktop viewport
- **THEN** a "Donate" link SHALL appear in the desktop navigation links
- **THEN** clicking the link SHALL open `/donate.html` in a new tab

#### Scenario: Heart icon color
- **WHEN** the navbar renders the Donate link on a desktop viewport
- **THEN** the heart icon (&#9829;) SHALL be displayed in red color (#e74c3c)

#### Scenario: Mobile tab bar unchanged
- **WHEN** the navbar renders on a mobile viewport
- **THEN** the mobile bottom tab bar SHALL NOT contain a "Donate" tab
- **THEN** the tab bar SHALL contain exactly three tabs: Home, Tasks, Settings

### Requirement: Settings page donation link
The Settings page About section SHALL include a "Support AgentFleet" link to `/donate.html`, inline with existing links.

#### Scenario: About section link
- **WHEN** the Settings page renders
- **THEN** the About section SHALL contain a "Support AgentFleet" link alongside the GitHub and npm links
- **THEN** clicking the link SHALL open `/donate.html` in a new tab

### Requirement: GitHub funding configuration
The `.github/FUNDING.yml` file SHALL include a link to the donation page alongside the existing PayPal link.

#### Scenario: Funding file content
- **WHEN** GitHub reads the FUNDING.yml file
- **THEN** it SHALL contain both the PayPal link and the donation page URL in the custom array

### Requirement: README donation section
The `README.md` SHALL include a Support section that mentions both donation channels and links to the donation page.

#### Scenario: README content
- **WHEN** a user reads the README
- **THEN** they SHALL find a Support section with a link to the donation page

### Requirement: Donation page Chinese font stack
The donation page's CSS `font-family` SHALL include Chinese sans-serif font fallbacks (`"Microsoft YaHei"`, `"PingFang SC"`) to ensure consistent Chinese character rendering.

#### Scenario: Chinese text rendering
- **WHEN** the donation page renders Chinese text
- **THEN** the text SHALL use a sans-serif Chinese font (not the browser's default serif fallback)
