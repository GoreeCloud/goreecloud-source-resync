# GoreeCloud Source Resync

GoreeCloud Source Resync is a Firefox extension that adds one-click and scheduled resynchronization for resyncable Google Drive sources attached to a ChatGPT Project.

## Status

**Stable v1.0.0**

Validated on August 15, 2026 against the GoreeCloud ChatGPT Project Sources page with 18 configured Google Drive folder sources. Manual resync and the five-minute automatic interval both completed their expected request sequence successfully.

## Features

- Resync all Google Drive Project sources with one click.
- Add an in-page **Resync all** button to ChatGPT Project Sources pages.
- Automatically request resync every 5, 10, 15, 30, or 60 minutes.
- Save one ChatGPT Project Sources URL.
- Reuse an open Sources tab when available.
- Optionally open the saved Sources page in an inactive background tab.
- Optionally close a tab opened automatically by the extension.
- Show last-run mode, count, duration, failures, timestamp, and next scheduled run.
- Retain a bounded local history of the 10 most recent runs.

## Continuous integration

GitHub Actions validates the extension on pushes and pull requests by:

- parsing and checking `manifest.json`;
- enforcing the expected Firefox extension identity and semantic version format;
- checking JavaScript syntax with Node.js;
- confirming required source, UI, documentation, and icon files exist;
- scanning the repository for several common reusable-secret patterns;
- creating and testing a validation XPI archive.

The validation workflow uses read-only repository permissions.

## Release packaging

The packaging workflow can be started manually or by pushing a semantic-version tag such as `v1.0.0`.

For tagged builds, the workflow requires the Git tag version to match the version in `manifest.json`. It then creates:

- `goreecloud-source-resync-vVERSION.xpi`;
- `goreecloud-source-resync-vVERSION-source.tar.gz`;
- `SHA256SUMS`.

The XPI and source archive are built with normalized file timestamps and archive metadata where supported to improve reproducibility. The resulting files are retained as GitHub Actions artifacts for 30 days.

The workflow packages an **unsigned** XPI. Firefox Add-ons signing remains a separate release step when persistent installation in standard Firefox builds is required.

## Firefox permissions

- `alarms`: schedules automatic runs.
- `storage`: stores non-sensitive extension settings and bounded run metadata.
- `tabs`: locates, opens, and optionally closes the configured Sources tab.
- `https://chatgpt.com/*`: allows the content script to operate only on ChatGPT pages.

The extension does not request Google Drive access and does not store ChatGPT or Google credentials.

## Temporary installation for testing

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on**.
3. Select this repository's `manifest.json`.
4. Open the desired ChatGPT Project **Sources** page.
5. Open the extension popup and select **Use current Sources page**.
6. Test **Resync all now** before enabling an automatic interval.

Temporary extensions are removed when Firefox exits. A signed release is required for normal persistent installation in standard Firefox builds.

## Reliability boundary

The extension automates ChatGPT's rendered **Resync** menu action. It does not call an undocumented or private ChatGPT API. As a result, a future ChatGPT interface change can require an update to the DOM-detection logic.

## License

MIT. See `LICENSE`.
