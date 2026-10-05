#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const noeBundleRel = "apps/noe/android/app/build/generated/assets/react/release/index.android.bundle";
const noeBundle = path.join(root, noeBundleRel);
const arcaBundleRel = "apps/arcakids/android/app/build/generated/assets/react/release/index.android.bundle";
const arcaBundle = path.join(root, arcaBundleRel);

function getNewestMod(dir, exts = [".ts", ".tsx", ".js", ".json"]) {
  if (!existsSync(dir)) return 0;
  let max = 0;
  function walk(d) {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (f === "node_modules" || f === ".git" || f === "build" || f === "__tests__" || f === "dist") continue;
        walk(p);
      } else {
        const ext = path.extname(f);
        if (exts.includes(ext)) {
          if (st.mtimeMs > max) max = st.mtimeMs;
        }
      }
    }
  }
  walk(dir);
  return max;
}

function bundleContains(bundlePath, needle) {
  if (!existsSync(bundlePath)) return null;
  const buf = readFileSync(bundlePath);
  const s = buf.toString("latin1");
  return s.indexOf(needle) >= 0;
}

const sources = [
  path.join(root, "packages/config/src"),
  path.join(root, "packages/shared/src"),
  path.join(root, "packages/constants/src"),
  path.join(root, "packages/types/src"),
  path.join(root, "apps/noe/src"),
  path.join(root, "apps/arcakids/src"),
];
let newest = 0;
for (const d of sources) newest = Math.max(newest, getNewestMod(d));

let ok = true;
const checks = [];
if (existsSync(noeBundle)) {
  const m = statSync(noeBundle).mtimeMs;
  checks.push({ app: "NOE", stale: newest > m + 1000, bundleAgeMs: m - newest });
  const has143 = bundleContains(noeBundle, '"1.4.3"') || bundleContains(noeBundle, "1.4.3");
  const has136 = bundleContains(noeBundle, '"1.3.6"') || bundleContains(noeBundle, "1.3.6");
  if (!has143 || has136) { ok = false; checks.push({ app: "NOE", badStrings: { has143, has136 } }); }
} else {
  checks.push({ app: "NOE", exists: false });
}
if (existsSync(arcaBundle)) {
  const m = statSync(arcaBundle).mtimeMs;
  checks.push({ app: "ARCA", stale: newest > m + 1000, bundleAgeMs: m - newest });
  const has143 = bundleContains(arcaBundle, '"1.4.3"') || bundleContains(arcaBundle, "1.4.3");
  const has136 = bundleContains(arcaBundle, '"1.3.6"') || bundleContains(arcaBundle, "1.3.6");
  if (!has143 || has136) { ok = false; checks.push({ app: "ARCA", badStrings: { has143, has136 } }); }
} else {
  checks.push({ app: "ARCA", exists: false });
}

console.log(JSON.stringify({ ok, newestMs: newest, checks }, null, 2));
if (!ok) process.exit(1);