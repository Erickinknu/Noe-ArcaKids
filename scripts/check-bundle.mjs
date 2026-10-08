#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
const sources = ["packages/config/src","packages/shared/src","packages/constants/src","packages/types/src","apps/noe/src","apps/arcakids/src"];
const exts = [".ts",".tsx",".js",".json"];
let newest = 0;
function walk(d){
  if(!existsSync(d)) return;
  for(const f of readdirSync(d)){
    const pp = path.join(d,f);
    const st = statSync(pp);
    if(st.isDirectory()){
      if(["node_modules",".git","build","__tests__","dist"].includes(f)) continue;
      walk(pp);
    }else if(exts.includes(path.extname(f)) && st.mtimeMs > newest){
      newest = st.mtimeMs;
    }
  }
}
sources.forEach(walk);
const bundles = [
  ["NOE","apps/noe/android/app/build/generated/assets/react/release/index.android.bundle"],
  ["ARCA","apps/arcakids/android/app/build/generated/assets/react/release/index.android.bundle"]
];
const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
let ok=true;
for(const [n,b] of bundles){
  const bp = path.join(root,b);
  if(!existsSync(bp)){console.error("MISS",n);ok=false;continue;}
  const m = statSync(bp).mtimeMs;
  const s = readFileSync(bp).toString("latin1");
  if(!s.includes(version)){console.error("BADSTR",n,"(bundle sin "+version+")");ok=false;}
  if(newest>m+3000){console.error("STALE",n,Math.round((newest-m)/1000)+"s");ok=false;}
}
console.log(ok?"BUNDLE OK":"BUNDLE FAIL");
process.exit(ok?0:1);