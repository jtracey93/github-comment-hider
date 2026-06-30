// Builds the store-upload zip into dist/.
// Stages only the files the extension actually needs (manifest, src, popup, icons)
// so dev files (README, store copy, gen-icons.js, CI, etc.) are excluded.
// Zips with the platform tool: PowerShell Compress-Archive on Windows, `zip` elsewhere.
// No npm dependencies required.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const version = manifest.version;
const name = "github-comment-hider";

const dist = join(root, "dist");
const stage = join(dist, name);
const zipPath = join(dist, `${name}-v${version}.zip`);

// Only these paths go into the package.
const include = ["manifest.json", "src", "popup", "icons"];

rmSync(stage, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(stage, { recursive: true });

for (const item of include) {
  const from = join(root, item);
  if (!existsSync(from)) {
    console.error(`! missing ${item} — aborting`);
    process.exit(1);
  }
  cpSync(from, join(stage, item), { recursive: true });
}

if (process.platform === "win32") {
  // Contents of the staging folder are placed at the zip root.
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Compress-Archive -Path '${join(stage, "*")}' -DestinationPath '${zipPath}' -Force`,
    ],
    { stdio: "inherit" }
  );
} else {
  execFileSync("zip", ["-r", "-X", zipPath, "."], { cwd: stage, stdio: "inherit" });
}

console.log(`\nBuilt ${zipPath}`);
