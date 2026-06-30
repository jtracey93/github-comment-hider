# Privacy Policy — GitHub Comment Hider

_Last updated: 2026_

GitHub Comment Hider is a browser extension that helps you select and bulk-hide
comments on GitHub issues and pull requests, and navigate long threads.

## The short version

**This extension does not collect, transmit, sell, or share any personal data.**
It performs no analytics, no tracking, and makes no network requests of its own.

## What the extension stores

The only data the extension stores is your **settings** (whether it is enabled, your
default hide theme, whether checkboxes and navigation buttons are shown, and whether
diagnostics logging is on). These are saved **locally on your device** using the
browser's `chrome.storage.local` API. They never leave your browser and are not
synced to us or to any third party.

You can clear this data at any time by removing the extension.

## What the extension accesses

- **`storage` permission** — used solely to save and read the local settings described
  above.
- **Host access to `https://github.com/*`** — the content script runs only on GitHub
  issue and pull request pages so it can add the selection checkboxes and toolbar, and
  drive GitHub's own "hide comment" UI on your behalf. It reads only the page content
  needed to do this and acts entirely within your existing, already-authenticated
  GitHub session. It does not read or exfiltrate page content anywhere.

## What the extension does NOT do

- It does **not** use any GitHub Personal Access Token or API credentials.
- It does **not** send your data, browsing activity, or page content to any server.
- It does **not** include any third-party analytics, advertising, or tracking SDKs.

## Permission justification (for store reviewers)

- `storage`: persist the user's extension preferences locally.
- `host_permissions: https://github.com/*`: the extension's entire purpose is to
  augment GitHub issue/PR pages; it must run a content script there.

## Contact

Questions or concerns? Please open an issue at
<https://github.com/jtracey93/github-comment-hider/issues>.
