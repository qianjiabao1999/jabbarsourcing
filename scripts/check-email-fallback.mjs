import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let mailtoLinks = 0;
let protectedLinks = 0;

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".playwright-cli", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (entry.name.endsWith(".html")) verify(absolute);
  }
}

function verify(file) {
  const source = fs.readFileSync(file, "utf8");
  const anchors = source.match(/<a\b[^>]*\bhref="mailto:[^"]+"[^>]*>[\s\S]*?<\/a>/gi) || [];
  mailtoLinks += anchors.length;
  let searchOffset = 0;
  for (const anchor of anchors) {
    const offset = source.indexOf(anchor, searchOffset);
    searchOffset = offset + anchor.length;
    const before = source.slice(Math.max(0, offset - 32), offset);
    const after = source.slice(offset + anchor.length, offset + anchor.length + 32);
    if (!/<!--email_off-->\s*$/.test(before) || !/^\s*<!--\/email_off-->/.test(after)) {
      failures.push(`${path.relative(root, file)}: unprotected mailto link`);
    } else {
      protectedLinks += 1;
    }
  }
}

collect(root);
if (!mailtoLinks) failures.push("No mailto links found; fallback audit is not exercising the site");
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Cloudflare email fallback QA passed: ${protectedLinks}/${mailtoLinks} mailto links protected.`);
