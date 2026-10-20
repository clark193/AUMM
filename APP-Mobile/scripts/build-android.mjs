import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const cwd = fileURLToPath(new URL("../android/", import.meta.url));
const windows = process.platform === "win32";
const result = windows
  ? spawnSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "gradlew.bat assembleDebug bundleRelease --console=plain --quiet",
      ],
      { cwd, stdio: "inherit" },
    )
  : spawnSync(
      "./gradlew",
      ["assembleDebug", "bundleRelease", "--console=plain", "--quiet"],
      { cwd, stdio: "inherit" },
    );
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
mkdirSync(new URL("../artifacts/", import.meta.url), { recursive: true });
const files = [
  ["app/build/outputs/apk/debug/app-debug.apk", "aumm-1.0.0-debug.apk"],
  [
    "app/build/outputs/bundle/release/app-release.aab",
    "aumm-1.0.0-release-unsigned.aab",
  ],
];
const checksums = [];
for (const [source, target] of files) {
  copyFileSync(cwd + source, root + "artifacts/" + target);
  const sha = createHash("sha256")
    .update(readFileSync(root + "artifacts/" + target))
    .digest("hex");
  checksums.push(`${sha}  ${target}`);
}
writeFileSync(root + "artifacts/SHA256SUMS.txt", checksums.join("\n") + "\n");
console.log("APK de teste e AAB sem assinatura salvos em artifacts/.");
