import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".playwright-cli", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (entry.name.endsWith(".html")) htmlFiles.push(absolute);
  }
}

collect(root);

let changedFiles = 0;
let wrappedLinks = 0;
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, "utf8");
  const updated = source.replace(
    /(<a\b[^>]*\bhref="mailto:[^"]+"[^>]*>[\s\S]*?<\/a>)/gi,
    (anchor, _match, offset, fullSource) => {
      const before = fullSource.slice(Math.max(0, offset - 32), offset);
      const after = fullSource.slice(offset + anchor.length, offset + anchor.length + 32);
      if (/<!--email_off-->\s*$/.test(before) && /^\s*<!--\/email_off-->/.test(after)) return anchor;
      wrappedLinks += 1;
      return `<!--email_off-->${anchor}<!--/email_off-->`;
    }
  );
  if (updated === source) continue;
  fs.writeFileSync(file, updated);
  changedFiles += 1;
}

console.log(`Cloudflare email fallback migration complete: ${wrappedLinks} links in ${changedFiles} files.`);
