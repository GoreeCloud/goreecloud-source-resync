# Changelog

## Unreleased

### Added
- GitHub Actions validation for manifest integrity, JavaScript syntax, required repository files, common reusable-secret patterns, and validation-XPI archive integrity.
- GitHub Actions packaging workflow for manual runs and semantic-version tags.
- Version consistency enforcement between release tags and `manifest.json`.
- Reproducible-oriented XPI and source archive creation with SHA-256 checksums.
- Thirty-day retention of packaged workflow artifacts.
- Direct attachment of the packaged XPI, source archive, and `SHA256SUMS` to an existing GitHub Release.
- Manual repackaging of an existing semantic-version release tag, using that exact tag as the package source.

### Changed
- The packaging workflow now uses GitHub's short-lived workflow token with `contents: write` only for release-asset publication and replaces same-name release assets during a controlled retry.

## 1.1.1 — 2026-08-15

Corrected a manual-resync regression introduced while experimenting with inactive-tab support.

### Fixed
- Restored the foreground DOM visibility and source-card selection logic from the previously validated manual-resync implementation.
- Restored visible menu-button and visible **Resync** action detection.
- Removed the 45-second source-readiness wait that was unnecessary for manual-only operation and could leave the control showing **Resyncing…** without issuing source refreshes.

### Reliability
- Manual resync is the supported workflow and is intended to be run while the desired ChatGPT Project Sources page is visible and active.

## 1.1.0 — 2026-08-15

Focused GoreeCloud Source Resync on the reliable manual workflow after inactive-tab testing showed that ChatGPT's Sources interface does not remain consistently interactive for scheduled background automation.

### Changed
- Removed all time-based and automatic resync behavior.
- Removed configurable 5, 10, 15, 30, and 60 minute intervals.
- Removed automatic background-tab opening, warm-up, restoration, and cleanup logic.
- Removed the saved Project Sources URL workflow because manual resync operates on the currently active Sources page.
- Simplified the popup around a single **Resync all now** action and last-manual-run status.
- Simplified background runtime handling to manual requests only.
- Updated extension description and documentation to describe the manual-only behavior.

### Removed
- Firefox `alarms` permission.
- Automatic scheduling settings and associated stored settings. Obsolete automatic settings are removed during extension update.
- Background source-readiness status messaging that existed only to support scheduled resync.

### Retained
- Popup **Resync all now** control.
- In-page **Resync all** control.
- Last-run count, duration, failure, and timestamp reporting.
- Bounded 10-entry local manual-run history.
- Host access limited to `https://chatgpt.com/*`.

### Reliability
- Manual resync remains the supported path and requires the desired ChatGPT Project Sources page to be open and active.

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
