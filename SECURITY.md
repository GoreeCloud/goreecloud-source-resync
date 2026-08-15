# Security

## Supported version

Security fixes are applied to the current stable release, v1.0.x.

## Data handling

GoreeCloud Source Resync is intentionally narrow in scope.

It stores only:
- the saved ChatGPT Project Sources URL;
- automatic-resync settings;
- the latest run result;
- a bounded local history of up to 10 run-result records.

It does not intentionally store passwords, cookies, OAuth tokens, Google credentials, ChatGPT credentials, API keys, document contents, or source-file contents.

## Permissions

The extension requests only Firefox permissions required for scheduling and tab control, and host access is limited to `https://chatgpt.com/*`.

## Reporting

Do not include passwords, tokens, cookies, private source contents, or other reusable secrets in security reports, screenshots, issues, or logs.
