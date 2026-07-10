# GitHub Comment Hider (Chrome / Edge extension)

Multi-select comments on a GitHub **issue** (or PR) and **bulk-hide** them under a
single theme — Outdated, Off-topic, Duplicate, Resolved, Spam, or Abuse. It also adds
in-toolbar **navigation** buttons to jump straight to the latest comment or back to
the top of a long issue.

It works by **driving the existing GitHub UI** using your already-logged-in session —
no Personal Access Token, and it works with SSO-protected org repos automatically.

## Features

- ☑️ A checkbox on every comment so you can select several at once.
- 🚫 **Hide selected** — picks your theme and hides every selected comment one after
  another, automatically (open menu → Hide → choose reason → confirm).
- ⬇️ In-toolbar **navigation** — one click for *Go to latest comment* / *Go to top of
  issue*, handy on long threads.
- 🎚️ Popup options: enable/disable, show/hide checkboxes, default theme, navigation
  buttons, diagnostics logging.

## Install (load unpacked)

1. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder
   (`github-comment-hider`).
4. Open any GitHub issue or PR. You'll see the **Comment Hider** toolbar (top-right),
   including a **Navigate** section with the *Go to latest / top* buttons.

> Icons are pre-generated. If you ever need to regenerate them: `node gen-icons.js`.

## How to use

1. On an issue, tick the comments you want to hide (or **Select all**).
2. Choose the theme in **Hide as** (default: Outdated).
3. Click **Hide selected**. The panel shows progress; each comment is hidden in turn.
4. Use **↓ Go to latest comment** in the toolbar to jump to the newest comment any
   time (and **↑ Go to top of issue** to come back).

## Notes & limitations

- **Permissions:** hiding requires that you can moderate the repo (maintainer/triage).
  The extension only does what you could do by hand.
- **GitHub Enterprise:** works on `github.com` and on GitHub Enterprise data-residency
  hosts (any `*.ghe.com` instance, e.g. `msft.ghe.com`).
- **Project boards:** when you open an issue/PR in the side pane from a GitHub Projects
  board, the toolbar and checkboxes appear against that pane (docked to the left so they
  don't cover it).
- **Very long issues:** GitHub's new issues UI virtualizes the timeline, so only
  comments currently rendered can be selected/hidden. Scroll to load more if needed.
- **GitHub UI is a moving target.** The hide menu/dialog selectors are resilient
  (role/text based), but if GitHub changes them, enable **Diagnostics** in the popup to
  log each step to the DevTools console (prefix `[GCH]`) so the selectors can be updated.

## Files

```
manifest.json        MV3 manifest
src/content.js       all page logic (selection, hide engine, nav)
src/content.css      injected styles
popup/popup.html|js  settings popup
gen-icons.js         regenerates the icons (dev only)
icons/               toolbar icons
store/               store-listing copy + screenshots
scripts/package.mjs  builds the upload zip into dist/
```

## Privacy

This extension **collects no data** and makes **no network requests** of its own. Your
preferences (enabled, default theme, etc.) are saved locally via `chrome.storage.local`
and never leave your browser. See [PRIVACY.md](PRIVACY.md).

## Building the store package

```
npm run package    # writes dist/github-comment-hider-v<version>.zip
```

Upload that zip to the Chrome Web Store / Microsoft Edge Add-ons dashboards. Listing
copy and required asset sizes live in [`store/`](store/).

## License

[MIT](LICENSE) © Jack Tracey
