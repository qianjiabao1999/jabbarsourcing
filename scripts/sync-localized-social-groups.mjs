import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

const locales = {
  en: { douyin: "Open Douyin profile", xhs: "Open Xiaohongshu profile" },
  es: { douyin: "Abrir perfil de Douyin", xhs: "Abrir perfil de Xiaohongshu" },
  ar: { douyin: "فتح ملف Douyin", xhs: "فتح ملف Xiaohongshu" },
  fr: { douyin: "Ouvrir le profil Douyin", xhs: "Ouvrir le profil Xiaohongshu" },
  pt: { douyin: "Abrir perfil do Douyin", xhs: "Abrir perfil do Xiaohongshu" },
  ru: { douyin: "Открыть профиль Douyin", xhs: "Открыть профиль Xiaohongshu" },
  de: { douyin: "Douyin-Profil öffnen", xhs: "Xiaohongshu-Profil öffnen" },
  it: { douyin: "Apri il profilo Douyin", xhs: "Apri il profilo Xiaohongshu" },
  tr: { douyin: "Douyin profilini aç", xhs: "Xiaohongshu profilini aç" }
};

function extractSection(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Missing section marker: ${marker}`);
  const token = /<section\b|<\/section>/g;
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(html))) {
    if (match[0] === "<section") depth += 1;
    else depth -= 1;
    if (depth === 0) return html.slice(start, token.lastIndex);
  }
  throw new Error(`Unclosed section marker: ${marker}`);
}

const canonicalGroups = [
  extractSection(source, '<section class="social-platform-group social-platform-group-douyin"'),
  extractSection(source, '<section class="social-platform-group social-platform-group-xhs"')
].join("\n\n");

function localizeGroups(locale) {
  const labels = locales[locale];
  return canonicalGroups
    .replaceAll("assets/", "../assets/")
    .replace(/(<span class="social-platform-title" id="social-douyin-title">[\s\S]*?<span>)抖音(<\/span>)/, "$1Douyin$2")
    .replace(/(<span class="social-platform-title" id="social-xhs-title">[\s\S]*?<span>)小红书(<\/span>)/, "$1Xiaohongshu$2")
    .replace(/aria-label="查看(.*?)抖音主页"/g, (_all, name) => `aria-label="${labels.douyin}: ${name}"`)
    .replace(/aria-label="查看(.*?)小红书主页"/g, (_all, name) => `aria-label="${labels.xhs}: ${name}"`)
    .replaceAll("打开抖音主页", labels.douyin)
    .replaceAll("打开小红书主页", labels.xhs);
}

for (const locale of Object.keys(locales)) {
  const file = path.join(root, locale, "index.html");
  let html = fs.readFileSync(file, "utf8");
  const hasDouyin = html.includes("social-platform-group-douyin");
  const hasXhs = html.includes("social-platform-group-xhs");
  if (hasDouyin !== hasXhs) {
      throw new Error(`${locale}: social platform groups are only partially synchronized`);
  }

  const outer = extractSection(html, '<section class="social-platform-groups');
  let updatedOuter = outer;
  const localized = localizeGroups(locale);
  if (hasDouyin && hasXhs) {
    const localizedDouyin = extractSection(localized, '<section class="social-platform-group social-platform-group-douyin"');
    const localizedXhs = extractSection(localized, '<section class="social-platform-group social-platform-group-xhs"');
    updatedOuter = updatedOuter
      .replace(extractSection(updatedOuter, '<section class="social-platform-group social-platform-group-douyin"'), localizedDouyin)
      .replace(extractSection(updatedOuter, '<section class="social-platform-group social-platform-group-xhs"'), localizedXhs);
  } else {
  const closeOffset = outer.lastIndexOf("</section>");
  if (closeOffset < 0) throw new Error(`${locale}: social platform container is not closed`);
    const insertion = `\n\n${localized}\n`;
    updatedOuter = outer.slice(0, closeOffset) + insertion + outer.slice(closeOffset);
  }
  html = html.replace(outer, updatedOuter);
  fs.writeFileSync(file, html);
  process.stdout.write(`${locale}: synchronized Douyin and Xiaohongshu groups\n`);
}
