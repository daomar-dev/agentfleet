## ADDED Requirements

### Requirement: Standalone donation page
The system SHALL serve a static donation page at `/donate.html` that is accessible without authentication.

#### Scenario: Unauthenticated access
- **WHEN** a user navigates to `/donate.html` without being logged in
- **THEN** the donation page SHALL render fully without redirecting to a login page

#### Scenario: Direct link access
- **WHEN** a user opens a direct link to `/donate.html` from an external source (README, GitHub, email)
- **THEN** the page SHALL load independently of the SPA application

### Requirement: PayPal donation channel
The donation page SHALL display a PayPal donation section in English, containing a link to the PayPal.me URL (`https://paypal.me/chenxizhang2026`).

#### Scenario: PayPal button interaction
- **WHEN** a user clicks the PayPal donation link
- **THEN** the browser SHALL open the PayPal.me page (in a new tab)

### Requirement: WeChat Pay donation channel
The donation page SHALL display a WeChat Pay donation section in Chinese, containing the WeChat payment QR code image (`wechat-donation.jpg`).

#### Scenario: WeChat QR code display
- **WHEN** the donation page loads
- **THEN** the WeChat section SHALL display the QR code image at a scannable size
- **THEN** the section text SHALL be in Chinese

### Requirement: Responsive layout
The donation page SHALL display the two donation channels side by side on desktop and stacked vertically on mobile.

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 768px or wider
- **THEN** the PayPal and WeChat sections SHALL appear side by side

#### Scenario: Mobile viewport
- **WHEN** the viewport width is narrower than 768px
- **THEN** the PayPal and WeChat sections SHALL stack vertically

### Requirement: Desktop navbar donation link
The web dashboard's desktop navigation bar SHALL include a "Donate" link that opens `/donate.html`.

#### Scenario: Desktop navbar rendering
- **WHEN** the navbar renders on a desktop viewport
- **THEN** a "Donate" link SHALL appear in the desktop navigation links
- **THEN** clicking the link SHALL open `/donate.html` in a new tab

#### Scenario: Mobile tab bar unchanged
- **WHEN** the navbar renders on a mobile viewport
- **THEN** the mobile bottom tab bar SHALL NOT contain a "Donate" tab
- **THEN** the tab bar SHALL contain exactly three tabs: Home, Tasks, Settings

### Requirement: Settings page donation link
The Settings page About section SHALL include a "Support Lattix" link to `/donate.html`, inline with existing links.

#### Scenario: About section link
- **WHEN** the Settings page renders
- **THEN** the About section SHALL contain a "Support Lattix" link alongside the GitHub and npm links
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
