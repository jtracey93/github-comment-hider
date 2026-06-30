// Popup: read/write settings shared with the content script.
const DEFAULTS = {
  enabled: true,
  selectionMode: true,
  floatingNav: true,
  defaultTheme: "OUTDATED",
  diagnostics: false,
};

const fields = ["enabled", "selectionMode", "floatingNav", "diagnostics"];

function load() {
  chrome.storage.local.get(DEFAULTS, (s) => {
    for (const f of fields) document.getElementById(f).checked = !!s[f];
    document.getElementById("defaultTheme").value = s.defaultTheme || "OUTDATED";
  });
}

function save() {
  const next = {};
  for (const f of fields) next[f] = document.getElementById(f).checked;
  next.defaultTheme = document.getElementById("defaultTheme").value;
  chrome.storage.local.set(next);
}

document.addEventListener("DOMContentLoaded", load);
document.addEventListener("change", save);
