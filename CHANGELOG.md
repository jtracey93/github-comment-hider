# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026

### Added
- Support for GitHub Enterprise data-residency hosts — the extension now runs on any
  `*.ghe.com` instance (e.g. `msft.ghe.com`) as well as `github.com`.
- Support for hiding comments on an issue/PR opened in the **GitHub Projects** side
  pane. The toolbar and checkboxes now appear against the pane, and the toolbar docks
  to the left so it doesn't cover it.

### Changed
- The floating toolbar now re-initialises on Projects side-pane open/close/switch
  (which only changes the URL query string, not the path).

### Fixed
- The Projects side pane (a full-issue dialog) is no longer mistaken for GitHub's
  hide-reason dialog, which previously broke the hide flow inside the pane.

### Removed
- The **Capture hide UI (diag)** button. Enable **Diagnostics** in the popup for
  console logging instead.

## [0.1.0] - 2026

Initial release.

### Added
- Per-comment selection checkboxes on GitHub issue and pull request pages
  (new React issues UI, with a classic-UI fallback).
- **Hide selected** — bulk-hides every selected comment under one chosen theme
  (Outdated, Off-topic, Duplicate, Resolved, Spam, Abuse) by driving GitHub's own
  hide-comment UI, reusing your logged-in session (no token required).
- Toolbar **Select all** / **Clear** and a live selected-count.
- In-toolbar **Navigate** section: _Go to latest comment_ and _Go to top of issue_.
- Settings popup: enable/disable, show/hide checkboxes, show/hide navigation buttons,
  default hide theme, and diagnostics logging.
- Diagnostics mode with a **Capture hide UI** button that dumps the live menu/dialog
  structure for troubleshooting when GitHub changes its markup.

[0.2.0]: https://github.com/jtracey93/github-comment-hider/releases/tag/v0.2.0
[0.1.0]: https://github.com/jtracey93/github-comment-hider/releases/tag/v0.1.0
