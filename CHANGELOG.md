# Changelog

## 1.0.0 — 2026-08-15

First stable GoreeCloud release after successful manual and five-minute automatic resync validation against the GoreeCloud ChatGPT Project Sources page.

### Added
- Manual **Resync all now** control in the Firefox popup.
- In-page **Resync all** control on ChatGPT Project Sources pages.
- Configurable automatic resync intervals of 5, 10, 15, 30, and 60 minutes.
- Saved Project Sources URL support.
- Optional background-tab opening and automatic cleanup.
- Run mode, duration, requested-source counts, failure counts, and next-run telemetry.
- Bounded 10-entry local run history.
- Stronger Project Sources URL validation.
- Run-overlap protection.

### Validated
- Manual resync successfully requested all 18 configured GoreeCloud Google Drive sources.
- Five-minute automatic resync successfully triggered and visibly started source synchronization on August 15, 2026.

### Security
- No ChatGPT credentials, Google credentials, cookies, API keys, or reusable secrets are stored by the extension.
- Host access remains limited to `https://chatgpt.com/*`.
- Settings and bounded operational metadata are stored only in Firefox extension-local storage.

### Known limitation
- Resync behavior depends on ChatGPT's rendered user interface because no public source-resync API is used. Future ChatGPT UI changes may require selector updates.

## 0.1.0 — 2026-08-15

Initial functional prototype.
