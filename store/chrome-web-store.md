# Chrome Web Store — listing copy & submission checklist

Paste these fields into the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
A one-time **US$5** developer registration fee applies to the Chrome account.

---

## Product name
GitHub Comment Hider

## Summary (short description — max 132 chars)
Multi-select GitHub issue/PR comments and bulk-hide them by theme, plus one-click jump to the latest comment.

## Category
Developer Tools

## Language
English

## Detailed description
Tired of hiding outdated GitHub comments one by one?

GitHub Comment Hider adds tick-boxes to every comment on an issue or pull request so
you can select several at once and hide them all under a single theme — Outdated,
Off-topic, Duplicate, Resolved, Spam, or Abuse — in one click.

It also adds a small toolbar with quick navigation: jump straight to the latest comment
on a long thread, or back to the top.

FEATURES
• Select-all / clear / per-comment checkboxes
• Bulk "Hide selected" under any of GitHub's six hide reasons
• Go to latest comment / Go to top of issue
• Settings popup: default theme, toggle checkboxes & navigation, diagnostics
• Works on the new React issues UI and the classic UI
• Works on GitHub.com and GitHub Enterprise Cloud (*.ghe.com), including issues opened from Projects boards

HOW IT WORKS
The extension simply drives GitHub's own "hide comment" interface using your existing,
already-signed-in session — exactly what you'd do by hand, just in bulk. There is no
Personal Access Token to create, and it works with SSO-protected organisation repos.

PRIVACY
No data is collected and no network requests are made by the extension. Your
preferences are stored locally in your browser only. See the privacy policy:
https://github.com/jtracey93/github-comment-hider/blob/main/PRIVACY.md

NOTE
Hiding comments requires that your GitHub account can moderate the repository
(maintainer/triage). The extension only does what you are already allowed to do.

Open source (MIT): https://github.com/jtracey93/github-comment-hider

## Single purpose (required field)
Augment GitHub issue and pull request pages so the user can multi-select comments and
bulk-hide them under a chosen reason, and quickly navigate the comment thread.

## Permission justifications (required)
- **storage** — Save the user's own extension preferences (enabled state, default hide
  theme, UI toggles) locally. No data leaves the browser.
- **Host permission `https://github.com/*`** — The extension's sole function is to add
  controls to GitHub issue/PR pages and operate GitHub's native hide-comment UI on the
  user's behalf; a content script must run on github.com to do this.
- **Host permission `https://*.ghe.com/*`** — The same functionality on GitHub Enterprise
  Cloud with data residency, whose tenants are served from region-specific `*.ghe.com`
  hosts (for example `contoso.ghe.com`) instead of github.com; a content script must run
  there to provide the same issue/PR comment features. It reads only the page content
  needed and sends nothing anywhere.
- **Remote code** — None. All code is bundled in the package.

## Data usage disclosures (Privacy practices tab)
- Does the item collect user data? **No.**
- Tick: "I do not sell or transfer user data to third parties, except for the approved
  use cases."
- Tick: "I do not use or transfer user data for purposes unrelated to my item's single
  purpose."
- Privacy policy URL: `https://github.com/jtracey93/github-comment-hider/blob/main/PRIVACY.md`

---

## Required graphical assets
| Asset | Spec | Status |
|-------|------|--------|
| Store icon | 128×128 PNG | ✅ `icons/icon128.png` |
| Screenshot(s) | 1280×800 **or** 640×400 PNG/JPEG, 1–5 | ✅ `store/screenshots/` (add more from your authenticated view) |
| Small promo tile | 440×280 PNG (optional) | ⬜ optional |
| Marquee promo tile | 1400×560 PNG (optional) | ⬜ optional |

> Tip: capture 2–3 extra screenshots from a repo where you have maintainer rights so the
> listing shows the real hide flow on your own issues.

## Upload package
Run `npm run package` → upload `dist/github-comment-hider-v0.2.0.zip`.
