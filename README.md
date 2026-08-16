# GoreeCloud Source Resync

GoreeCloud Source Resync is a Firefox extension that manually resynchronizes all resyncable Google Drive sources attached to the currently open ChatGPT Project Sources page.

## Status

**Stable manual workflow**

The supported workflow is intentionally manual. Automatic and time-based resync were removed because ChatGPT's Sources interface does not remain reliably interactive in inactive Firefox tabs. Manual **Resync all** works while the desired Sources page is open and active.

## Features

- Resync all Google Drive Project sources with one click from the Firefox popup.
- Add an in-page **Resync all** button to ChatGPT Project Sources pages.
- Show last-run requested-source count, duration, failures, and timestamp.
- Retain a bounded local history of the 10 most recent manual runs.
- Operate only against the currently active ChatGPT Project Sources page.

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

The packaging workflow runs for semantic-version tags such as `v1.1.0` and can also be started manually for an existing release tag.

For release builds, the workflow checks out the exact requested tag, requires the tag version to match `manifest.json`, and creates:

- `goreecloud-source-resync-vVERSION.xpi`;
- `goreecloud-source-resync-vVERSION-source.tar.gz`;
- `SHA256SUMS`.

The XPI and source archive are built with normalized file timestamps and archive metadata where supported to improve reproducibility. The resulting files are retained as GitHub Actions artifacts for 30 days and, when an existing release tag is supplied, are also attached directly to that GitHub Release. Existing release files with the same names are replaced so a packaging retry can repair or republish assets without creating duplicate filenames.

The packaging workflow receives only the repository permission required to attach release assets. No reusable repository secret is required; GitHub's short-lived workflow token is used for the release upload.

The workflow packages an **unsigned** XPI. Firefox Add-ons signing remains a separate release step when persistent installation in standard Firefox builds is required.

## Firefox permissions

- `storage`: stores non-sensitive bounded manual-run metadata.
- `tabs`: identifies the currently active ChatGPT Sources tab and sends the manual resync request to it.
- `https://chatgpt.com/*`: allows the content script to operate only on ChatGPT pages.

The extension does not request Google Drive access and does not store ChatGPT or Google credentials.

## Temporary installation for testing

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on**.
3. Select this repository's `manifest.json` or the packaged XPI.
4. Open the desired ChatGPT Project **Sources** page and keep that tab active.
5. Open the extension popup and select **Resync all now**, or use the in-page **Resync all** button.

Temporary extensions are removed when Firefox exits. A signed release is required for normal persistent installation in standard Firefox builds.

## Reliability boundary

The extension automates ChatGPT's rendered **Resync** menu action. It does not call an undocumented or private ChatGPT API. The active Sources page must therefore be rendered and interactive, and a future ChatGPT interface change can require an update to the DOM-detection logic.

## License

MIT. See `LICENSE`.
