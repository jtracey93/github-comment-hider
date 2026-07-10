# Microsoft Edge Add-ons — listing copy & submission checklist

Paste these fields into [Microsoft Partner Center → Edge program](https://partner.microsoft.com/dashboard/microsoftedge/).
Edge Add-ons registration is **free**.

---

## Name
GitHub Comment Hider

## Short description
Multi-select GitHub issue/PR comments and bulk-hide them by theme, plus one-click jump to the latest comment.

## Category
Developer tools

## Supported languages
English (United States)

## Description
Tired of hiding outdated GitHub comments one by one?

GitHub Comment Hider adds tick-boxes to every comment on an issue or pull request so
you can select several at once and hide them all under a single theme — Outdated,
Off-topic, Duplicate, Resolved, Spam, or Abuse — in one click.

It also adds a small toolbar with quick navigation: jump straight to the latest comment
on a long thread, or back to the top.

Features:
• Select-all / clear / per-comment checkboxes
• Bulk "Hide selected" under any of GitHub's six hide reasons
• Go to latest comment / Go to top of issue
• Settings popup: default theme, toggle checkboxes & navigation, diagnostics
• Works on the new React issues UI and the classic UI
• Works on GitHub.com and GitHub Enterprise Cloud (*.ghe.com), including issues opened from a Projects board

How it works:
The extension drives GitHub's own "hide comment" interface using your existing,
already-signed-in session — exactly what you would do by hand, just in bulk. There is
no Personal Access Token to create, and it works with SSO-protected organisation repos.

Privacy:
No data is collected and no network requests are made by the extension. Your
preferences are stored locally in your browser only.

Note: Hiding comments requires that your GitHub account can moderate the repository
(maintainer/triage). The extension only does what you are already allowed to do.

Open source (MIT): https://github.com/jtracey93/github-comment-hider

## Privacy policy URL
https://github.com/jtracey93/github-comment-hider/blob/main/PRIVACY.md

## Why does your extension require each permission? (Edge review notes)
- **storage** — Persist the user's own preferences locally (enabled state, default hide
  theme, UI toggles). Nothing is transmitted.
- **Host access `https://github.com/*`** — The add-on augments GitHub issue/PR pages and
  operates GitHub's native hide-comment UI on the user's behalf, so a content script
  must run on github.com.
- **Host access `https://*.ghe.com/*`** — The same functionality on GitHub Enterprise
  Cloud with data residency, whose tenants are served from region-specific `*.ghe.com`
  hosts (for example `contoso.ghe.com`) instead of github.com. The content script must run
  there to provide the same issue/PR comment features. It reads only the page content
  needed and sends nothing anywhere.

## Data collection
This extension does **not** collect any user data.

---

## Required graphical assets
| Asset | Spec | Status |
|-------|------|--------|
| Store logo | **300×300** PNG | ⬜ generate (`store/assets/logo300.png`) — see note |
| Small promotional tile | 440×280 PNG (optional) | ⬜ optional |
| Screenshot(s) | 1280×800 **or** 640×400 PNG/JPG, ≥1 | ✅ `store/screenshots/` |
| Package icon | 128×128 (inside the zip) | ✅ `icons/icon128.png` |

> Edge Partner Center asks for a **300×300** store logo that the bundled 128×128 icon
> does not satisfy. Generate one with the same renderer, e.g. add `300` to the size loop
> in `gen-icons.js` (or run a one-off) and save it to `store/assets/logo300.png`.

## Upload package
Run `npm run package` → upload `dist/github-comment-hider-v0.2.0.zip`.

## Certification tips
- First review can take a few business days. Provide the reviewer notes above verbatim.
- Make sure the version in `manifest.json` is bumped for every resubmission.
