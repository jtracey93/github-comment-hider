/* GitHub Comment Hider — content script
 *
 * Strategy: drive the existing GitHub UI (no tokens). Works on the new React
 * issues experience (`react-app[app-name="issues-react"]`) and falls back to the
 * legacy/classic UI where present.
 *
 * Flow for each selected comment:
 *   1. Click the comment's "..." actions button.
 *   2. Click the "Hide" menu item.
 *   3. Pick the chosen reason (Outdated / Off-topic / ...).
 *   4. Confirm.
 */
(() => {
  "use strict";

  if (window.__gchLoaded) return;
  window.__gchLoaded = true;

  // ---- settings ----
  const DEFAULTS = {
    enabled: true,
    selectionMode: true,
    floatingNav: true,
    defaultTheme: "OUTDATED",
    diagnostics: false,
    hideDelayMs: 600,
  };
  let state = { ...DEFAULTS };

  // theme: label shown in our select, `match` used to find GitHub's reason option,
  // `classic` is the legacy <select> option value.
  const THEMES = [
    { value: "OUTDATED", label: "Outdated", match: "outdated", classic: "OUTDATED" },
    { value: "OFF_TOPIC", label: "Off-topic", match: "offtopic", classic: "OFF_TOPIC" },
    { value: "DUPLICATE", label: "Duplicate", match: "duplicate", classic: "DUPLICATE" },
    { value: "RESOLVED", label: "Resolved", match: "resolved", classic: "RESOLVED" },
    { value: "SPAM", label: "Spam", match: "spam", classic: "SPAM" },
    { value: "ABUSE", label: "Abuse", match: "abuse", classic: "ABUSE" },
  ];
  const REASON_WORDS = THEMES.map((t) => t.match);

  // selected comment node IDs (persist across React re-renders)
  const selectedIds = new Set();

  // ---- utils ----
  const log = (...a) => { if (state.diagnostics) console.log("%c[GCH]", "color:#d29922", ...a); };
  const warn = (...a) => console.warn("%c[GCH]", "color:#d29922;font-weight:bold", ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  function isVisible(el) {
    if (!el) return false;
    if (el.hasAttribute && el.hasAttribute("hidden")) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const st = getComputedStyle(el);
    return st.visibility !== "hidden" && st.display !== "none";
  }

  // Our own injected UI — must be excluded from every GitHub-DOM search,
  // otherwise the hide engine matches our toolbar's reason <select> and
  // "Hide selected" button instead of GitHub's real dialog.
  const MY_UI = ".gch-toolbar, .gch-nav, .gch-checkbox-wrap";
  const isMine = (el) => !!(el && el.closest && el.closest(MY_UI));
  const notMine = (el) => !isMine(el);

  async function waitFor(fn, { timeout = 3000, interval = 60 } = {}) {
    const start = Date.now();
    for (;;) {
      let v;
      try { v = fn(); } catch { v = null; }
      if (v) return v;
      if (Date.now() - start > timeout) return null;
      await sleep(interval);
    }
  }

  function pointerClick(el) {
    if (!el) return;
    try { el.scrollIntoView({ block: "center", inline: "nearest" }); } catch {}
    const o = { bubbles: true, cancelable: true, view: window };
    try { el.dispatchEvent(new PointerEvent("pointerover", o)); } catch {}
    try { el.dispatchEvent(new PointerEvent("pointerdown", o)); } catch {}
    try { el.dispatchEvent(new MouseEvent("mousedown", o)); } catch {}
    try { el.dispatchEvent(new PointerEvent("pointerup", o)); } catch {}
    try { el.dispatchEvent(new MouseEvent("mouseup", o)); } catch {}
    // Fire the click exactly ONCE. Firing both el.click() and a synthetic
    // click event would toggle menu buttons open then immediately closed.
    if (typeof el.click === "function") {
      try { el.click(); } catch { try { el.dispatchEvent(new MouseEvent("click", o)); } catch {} }
    } else {
      try { el.dispatchEvent(new MouseEvent("click", o)); } catch {}
    }
  }

  function pressEscape() {
    const o = { bubbles: true, cancelable: true, key: "Escape", code: "Escape", keyCode: 27, which: 27 };
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", o));
    document.body.dispatchEvent(new KeyboardEvent("keydown", o));
  }

  // ---- page / UI detection ----
  const isIssueOrPRPath = () => /\/(issues|pull)\/\d+/.test(location.pathname);

  // GitHub Projects boards open an issue/PR in a side pane instead of navigating to
  // the issue page. The board path stays the same and only the query string changes,
  // e.g. ?pane=issue&itemId=5227&issue=owner%7Crepo%7C99 (%7C = "|").
  function projectsPaneIssue() {
    const p = new URLSearchParams(location.search);
    if (p.get("pane") !== "issue") return null;
    return p.get("issue") || p.get("itemId") || "issue";
  }
  const isProjectsPaneOpen = () => !!projectsPaneIssue();

  // True whenever there are comments we can act on: a normal issue/PR page, or the
  // Projects side pane showing an issue/PR.
  const isIssueContext = () => isIssueOrPRPath() || isProjectsPaneOpen();

  const isReactUI = () =>
    !!document.querySelector('react-app[app-name="issues-react"]') ||
    !!document.querySelector('[data-testid="issue-viewer-container"]') ||
    !!document.querySelector('[data-testid^="comment-viewer-outer-box-"]');

  const REACT_BOX = '[data-testid^="comment-viewer-outer-box-"]';
  const CLASSIC_BOX = ".timeline-comment-group";

  function getCommentBoxes() {
    let boxes = [...document.querySelectorAll(REACT_BOX)];
    if (boxes.length === 0) {
      boxes = [...document.querySelectorAll(CLASSIC_BOX)].filter(
        (b) => !b.closest('[data-testid="issue-body"]')
      );
    }
    return boxes;
  }

  function boxId(box) {
    const t = box.getAttribute("data-testid") || "";
    const p = "comment-viewer-outer-box-";
    if (t.startsWith(p)) return t.slice(p.length);
    const anchor = box.querySelector('[id^="issuecomment-"]') || box.closest('[id^="issuecomment-"]');
    if (anchor) return anchor.id;
    return box.id || null;
  }

  function isAlreadyHidden(box) {
    if (box.classList.contains("gch-done")) return true;
    const t = box.textContent || "";
    return /marked as (off-topic|outdated|duplicate|resolved|spam|abuse)|hidden this comment|this comment (has been|was) (minimized|hidden)/i.test(t);
  }

  // ---- selection checkboxes ----
  function injectCheckbox(box) {
    const id = boxId(box);
    if (!id) return;
    if (box.querySelector(":scope > .gch-checkbox-wrap, .gch-checkbox-wrap[data-gch-for]")) {
      // keep checkbox state in sync
      const cb = box.querySelector('.gch-checkbox[data-gch-for="' + cssEsc(id) + '"]');
      if (cb) cb.checked = selectedIds.has(id);
      box.classList.toggle("gch-box-selected", selectedIds.has(id));
      return;
    }

    const wrap = document.createElement("span");
    wrap.className = "gch-checkbox-wrap";
    wrap.setAttribute("data-gch-for", id);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "gch-checkbox";
    cb.title = "Select this comment for bulk hide";
    cb.setAttribute("data-gch-for", id);
    cb.checked = selectedIds.has(id);
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", () => {
      if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
      box.classList.toggle("gch-box-selected", cb.checked);
      updateCount();
    });
    wrap.appendChild(cb);

    const header =
      box.querySelector('[data-testid="comment-header-left-side-items"]') ||
      box.querySelector('[data-testid="comment-header"]') ||
      box.querySelector(".timeline-comment-header-text") ||
      box.querySelector(".timeline-comment-header");
    if (header) {
      header.insertBefore(wrap, header.firstChild);
    } else {
      // fallback: float it over the comment box
      const cs = getComputedStyle(box);
      if (cs.position === "static") box.style.position = "relative";
      wrap.style.position = "absolute";
      wrap.style.top = "8px";
      wrap.style.left = "-26px";
      box.appendChild(wrap);
    }
    box.classList.toggle("gch-box-selected", selectedIds.has(id));
  }

  function cssEsc(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/["\\]/g, "\\$&");
  }

  function removeCheckboxes() {
    document.querySelectorAll(".gch-checkbox-wrap").forEach((e) => e.remove());
    document.querySelectorAll(".gch-box-selected").forEach((e) => e.classList.remove("gch-box-selected"));
  }

  function refreshComments() {
    if (!state.enabled) return;
    const boxes = getCommentBoxes();
    if (state.selectionMode) {
      boxes.forEach(injectCheckbox);
    } else {
      removeCheckboxes();
    }
    updateCount(boxes.length);
  }

  function selectAll(check) {
    const boxes = getCommentBoxes();
    boxes.forEach((box) => {
      if (isAlreadyHidden(box)) return;
      const id = boxId(box);
      if (!id) return;
      if (check) selectedIds.add(id); else selectedIds.delete(id);
      const cb = box.querySelector('.gch-checkbox[data-gch-for="' + cssEsc(id) + '"]');
      if (cb) cb.checked = check;
      box.classList.toggle("gch-box-selected", check);
    });
    updateCount();
  }

  function selectedBoxes() {
    return getCommentBoxes().filter((b) => {
      const id = boxId(b);
      return id && selectedIds.has(id);
    });
  }

  // ---- hide engine ----
  function findOpenMenu() {
    const menus = [...document.querySelectorAll('[role="menu"], [role="listbox"], ul[role="menu"]')].filter((m) => isVisible(m) && notMine(m));
    return menus[menus.length - 1] || null;
  }

  // The Projects side pane can itself be a role="dialog" that wraps the entire issue
  // (comments included). It must never be mistaken for GitHub's small hide-reason
  // dialog, so treat any overlay that contains comment boxes as "not a dialog" here.
  // The real hide-reason dialog only holds a reason picker + confirm button.
  function wrapsComments(el) {
    return !!(el && el.querySelector && el.querySelector(REACT_BOX + ", " + CLASSIC_BOX));
  }

  function findVisibleDialog() {
    const sel = 'dialog[open], [role="dialog"], [role="alertdialog"], [data-testid*="dialog" i]';
    const d = [...document.querySelectorAll(sel)].filter((x) => isVisible(x) && notMine(x) && !wrapsComments(x));
    return d[d.length - 1] || null;
  }

  function clickableItems(root) {
    return [...root.querySelectorAll('[role="menuitem"], [role="menuitemradio"], [role="option"], button, a, li')].filter((e) => isVisible(e) && notMine(e));
  }

  function findMenuItemByText(menu, want) {
    const items = clickableItems(menu);
    const w = norm(want);
    // exact first
    let hit = items.find((el) => norm(el.textContent) === w);
    if (hit) return resolveClickable(hit);
    // startsWith
    hit = items.find((el) => norm(el.textContent).startsWith(w));
    if (hit) return resolveClickable(hit);
    // contains (avoid very long text blocks)
    hit = items.find((el) => {
      const n = norm(el.textContent);
      return n.includes(w) && n.length < w.length + 24;
    });
    return hit ? resolveClickable(hit) : null;
  }

  function resolveClickable(el) {
    if (el.tagName === "LI") return el.querySelector('button, a, [role="menuitem"], [role="menuitemradio"], [role="option"]') || el;
    return el;
  }

  function menuItemsText(menu) {
    return clickableItems(menu).map((e) => (e.textContent || "").trim()).filter(Boolean);
  }

  function visibleSelectWithReasons(theme) {
    const selects = [...document.querySelectorAll("select")].filter((s) => isVisible(s) && notMine(s));
    // prefer one that has an option matching this theme
    let sel = selects.find((s) => [...s.options].some((o) => norm(o.textContent).includes(theme.match) || norm(o.value).includes(theme.match)));
    if (sel) return sel;
    // else any select containing reason words
    sel = selects.find((s) => [...s.options].some((o) => REASON_WORDS.some((w) => norm(o.textContent).includes(w))));
    return sel || null;
  }

  function setSelectByTheme(sel, theme) {
    const opt = [...sel.options].find((o) => norm(o.textContent).includes(theme.match) || norm(o.value).includes(theme.match) || o.value === theme.classic);
    if (!opt) return false;
    sel.value = opt.value;
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function findReasonOption(theme) {
    const scope = findVisibleDialog() || findOpenMenu() || document;
    const items = clickableItems(scope);
    return items.find((el) => {
      const n = norm(el.textContent);
      return n.includes(theme.match) && n.length < theme.match.length + 30;
    }) || null;
  }

  function findConfirmHideButton() {
    const scope = findVisibleDialog() || document;
    const buttons = [...scope.querySelectorAll('button, [role="button"], input[type="submit"]')].filter((b) => isVisible(b) && notMine(b));
    // exact "hide comment"
    let b = buttons.find((x) => norm(x.textContent || x.value) === "hidecomment");
    if (b) return b;
    // submit-ish with "hide", not cancel
    b = buttons.find((x) => {
      const n = norm(x.textContent || x.value);
      return n.includes("hide") && !n.includes("cancel");
    });
    if (b) return b;
    // last resort: a primary submit button
    b = buttons.find((x) => x.type === "submit");
    return b || null;
  }

  function reasonUIReady(theme) {
    if (visibleSelectWithReasons(theme)) return true;
    const dlg = findVisibleDialog();
    if (dlg && /hide|reason|minimi/i.test(dlg.textContent || "")) return true;
    const menu = findOpenMenu();
    if (menu && REASON_WORDS.some((w) => norm(menu.textContent).includes(w))) return true;
    return false;
  }

  async function applyReason(theme) {
    const ready = await waitFor(() => reasonUIReady(theme), { timeout: 3500 });
    if (!ready) { warn("reason picker did not appear after clicking Hide"); return false; }

    // (a) native <select>
    const sel = visibleSelectWithReasons(theme);
    if (sel) {
      const ok = setSelectByTheme(sel, theme);
      log("native select set:", ok, "value=", sel.value);
      await sleep(120);
      const confirm = findConfirmHideButton();
      if (confirm) { log("confirm:", (confirm.textContent || confirm.value || "").trim()); pointerClick(confirm); }
      return await waitForOverlaysClosed();
    }

    // (b) clickable reason option (submenu / listbox / radio dialog)
    const opt = findReasonOption(theme);
    if (opt) {
      log("reason option:", (opt.textContent || "").trim());
      pointerClick(opt);
      await sleep(200);
      const confirm = findConfirmHideButton();
      if (confirm) { log("confirm:", (confirm.textContent || confirm.value || "").trim()); pointerClick(confirm); }
      return await waitForOverlaysClosed();
    }

    warn("no reason control matched for theme", theme.label, "— GitHub's hide dialog markup may have changed; enable Diagnostics to inspect it in the console");
    return false;
  }

  async function waitForOverlaysClosed() {
    const closed = await waitFor(() => !findOpenMenu() && !findVisibleDialog(), { timeout: 4000 });
    if (!closed) { pressEscape(); return false; }
    return true;
  }

  function closeAnyOpenOverlays() {
    if (findOpenMenu() || findVisibleDialog()) pressEscape();
  }

  function getKebab(box) {
    return (
      box.querySelector('button[aria-label^="Actions for "]') ||
      box.querySelector('[data-testid="comment-header-hamburger"] button') ||
      box.querySelector('[data-testid="comment-header-hamburger"]') ||
      box.querySelector('.timeline-comment-actions summary, .timeline-comment-actions button[aria-label*="ptions"]')
    );
  }

  async function hideReact(box, theme) {
    const kebab = getKebab(box);
    if (!kebab) { warn("could not find the comment's actions (…) button"); return false; }
    pointerClick(kebab);
    await sleep(120);
    const menu = await waitFor(() => findOpenMenu(), { timeout: 3500 });
    if (!menu) { warn("actions menu did not open after clicking the … button"); return false; }
    const hideItem = findMenuItemByText(menu, "hide");
    if (!hideItem) { warn("no 'Hide' item found. Menu items were:", menuItemsText(menu)); closeAnyOpenOverlays(); return false; }
    pointerClick(hideItem);
    const ok = await applyReason(theme);
    if (!ok) warn("clicked Hide but could not set reason/confirm for", theme.label);
    if (ok) box.classList.add("gch-done");
    return ok;
  }

  function hideClassic(box, theme) {
    const form = box.querySelector('form[action$="/minimize-comment"], form[action$="/minimize"]');
    if (!form || !form.elements.classifier) { log("classic minimize form not found"); return Promise.resolve(false); }
    form.elements.classifier.value = theme.classic;
    form.elements.classifier.dispatchEvent(new Event("change", { bubbles: true }));
    if (form.requestSubmit) form.requestSubmit(); else form.submit();
    box.classList.add("gch-done");
    return Promise.resolve(true);
  }

  async function hideOne(box, theme) {
    if (isAlreadyHidden(box)) { log("already hidden, skip"); return true; }
    return isReactUI() ? hideReact(box, theme) : hideClassic(box, theme);
  }

  let running = false;
  async function hideSelected() {
    if (running) return;
    const theme = THEMES.find((t) => t.value === currentThemeValue()) || THEMES[0];
    const boxes = selectedBoxes();
    if (boxes.length === 0) { setStatus("Select at least one comment first.", true); return; }
    running = true;
    setBusy(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < boxes.length; i++) {
      setStatus(`Hiding ${i + 1}/${boxes.length} as ${theme.label}…`);
      try {
        const res = await hideOne(boxes[i], theme);
        if (res) {
          ok++;
          const id = boxId(boxes[i]);
          if (id) selectedIds.delete(id);
        } else { fail++; }
      } catch (e) { fail++; log("hideOne threw", e); }
      closeAnyOpenOverlays();
      await sleep(state.hideDelayMs);
    }
    running = false;
    setBusy(false);
    setStatus(`Done. Hid ${ok}${fail ? `, ${fail} failed (see console)` : ""}.`, fail > 0);
    refreshComments();
  }

  // ---- toolbar UI ----
  let toolbarEl = null;
  function ensureToolbar() {
    if (!state.enabled) { toolbarEl?.remove(); toolbarEl = null; return; }
    if (toolbarEl && document.body.contains(toolbarEl)) return;

    const el = document.createElement("div");
    el.className = "gch-toolbar";
    el.innerHTML = `
      <div class="gch-toolbar-header">
        <span>🚫</span>
        <span class="gch-title">Comment Hider</span>
        <button class="gch-icon-btn gch-collapse" title="Collapse">▾</button>
      </div>
      <div class="gch-toolbar-body">
        <div class="gch-row">
          <label for="gch-theme">Hide as</label>
          <select id="gch-theme" class="gch-select"></select>
        </div>
        <div class="gch-row">
          <button class="gch-btn gch-selall">Select all</button>
          <button class="gch-btn gch-clear">Clear</button>
        </div>
        <div class="gch-row">
          <button class="gch-btn gch-btn-primary gch-hide" style="flex:1">Hide selected</button>
        </div>
        <div class="gch-row gch-count"><span><b>0</b> selected</span><span style="opacity:.6">/ <span class="gch-total">0</span> comments</span></div>
        <div class="gch-status"></div>
        <div class="gch-nav-group">
          <div class="gch-divider"></div>
          <div class="gch-section-label">Navigate</div>
          <div class="gch-row">
            <button class="gch-btn gch-nav-latest" style="flex:1" title="Scroll to the most recent comment (loads it first on long issues)">↓ Go to latest comment</button>
          </div>
          <div class="gch-row">
            <button class="gch-btn gch-nav-top" style="flex:1" title="Scroll to the top of the issue">↑ Go to top of issue</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    toolbarEl = el;

    const sel = el.querySelector("#gch-theme");
    for (const t of THEMES) {
      const o = document.createElement("option");
      o.value = t.value; o.textContent = t.label;
      sel.appendChild(o);
    }
    sel.value = state.defaultTheme;

    el.querySelector(".gch-collapse").addEventListener("click", () => {
      el.classList.toggle("gch-collapsed");
      el.querySelector(".gch-collapse").textContent = el.classList.contains("gch-collapsed") ? "▸" : "▾";
    });
    el.querySelector(".gch-selall").addEventListener("click", () => selectAll(true));
    el.querySelector(".gch-clear").addEventListener("click", () => selectAll(false));
    el.querySelector(".gch-hide").addEventListener("click", hideSelected);
    el.querySelector(".gch-nav-latest").addEventListener("click", jumpToLatest);
    el.querySelector(".gch-nav-top").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    el.querySelector(".gch-nav-group").style.display = state.floatingNav ? "" : "none";

    makeDraggable(el, el.querySelector(".gch-toolbar-header"));
    updateCount();
  }

  function currentThemeValue() {
    return toolbarEl?.querySelector("#gch-theme")?.value || state.defaultTheme;
  }
  function setStatus(msg, isError = false) {
    const s = toolbarEl?.querySelector(".gch-status");
    if (s) { s.textContent = msg; s.classList.toggle("gch-error", isError); }
    log("status:", msg);
  }
  function setBusy(b) {
    toolbarEl?.querySelectorAll(".gch-btn").forEach((btn) => (btn.disabled = b));
  }
  function updateCount(total) {
    if (!toolbarEl) return;
    toolbarEl.querySelector(".gch-count b").textContent = String(selectedIds.size);
    if (typeof total === "number") toolbarEl.querySelector(".gch-total").textContent = String(total);
  }

  function makeDraggable(el, handle) {
    let sx, sy, ox, oy, dragging = false;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".gch-icon-btn")) return;
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      el.style.right = "auto"; e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      el.style.left = ox + (e.clientX - sx) + "px";
      el.style.top = oy + (e.clientY - sy) + "px";
    });
    window.addEventListener("mouseup", () => (dragging = false));
  }

  // ---- "jump to latest" navigation (rendered inside the toolbar) ----
  function latestCommentTarget() {
    const boxes = getCommentBoxes();
    if (boxes.length) return boxes[boxes.length - 1];
    const anchors = [...document.querySelectorAll('[id^="issuecomment-"]')];
    return anchors[anchors.length - 1] || null;
  }

  async function jumpToLatest() {
    // nudge the virtualized timeline to load the tail, then center the last comment
    window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
    await sleep(300);
    const target = latestCommentTarget();
    if (!target) { setStatus("No comments found to jump to.", true); return; }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("gch-flash");
    void target.offsetWidth; // restart animation
    target.classList.add("gch-flash");
    setTimeout(() => target.classList.remove("gch-flash"), 1700);
  }

  // ---- lifecycle ----
  function teardown() {
    toolbarEl?.remove(); toolbarEl = null;
    removeCheckboxes();
  }

  let scheduled = false;
  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; if (isIssueContext()) refreshComments(); }, 350);
  }

  function init() {
    if (!isIssueContext()) { teardown(); return; }
    ensureToolbar();
    // In the Projects side pane the issue sits on the right, so move the toolbar to
    // the left to avoid covering the pane and its controls.
    if (toolbarEl) toolbarEl.classList.toggle("gch-pane-mode", isProjectsPaneOpen());
    refreshComments();
  }

  // Re-inject as the React timeline mounts / virtualizes / loads more.
  const observer = new MutationObserver(() => { if (isIssueContext()) scheduleRefresh(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // SPA navigation (GitHub uses pushState/Turbo) — re-init on URL change.
  // Projects opens an issue in a side pane by changing only the query string
  // (?pane=issue&issue=owner|repo|number&itemId=...), so track those params too, not
  // just the pathname — otherwise opening/closing/switching panes never re-inits.
  function navKey() {
    const p = new URLSearchParams(location.search);
    return [location.pathname, p.get("pane") || "", p.get("issue") || "", p.get("itemId") || ""].join("|");
  }
  let lastNav = navKey();
  function onNav() {
    const key = navKey();
    if (key !== lastNav) {
      lastNav = key;
      selectedIds.clear();
      setTimeout(init, 400);
    }
  }
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function () { const r = orig.apply(this, arguments); onNav(); return r; };
  }
  window.addEventListener("popstate", onNav);
  document.addEventListener("turbo:load", () => setTimeout(init, 300));

  // settings
  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(DEFAULTS, (s) => { state = { ...DEFAULTS, ...s }; resolve(); });
      } catch { resolve(); }
    });
  }
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      for (const k in changes) state[k] = changes[k].newValue;
      teardown();
      init();
    });
  } catch {}

  loadSettings().then(init);
})();
