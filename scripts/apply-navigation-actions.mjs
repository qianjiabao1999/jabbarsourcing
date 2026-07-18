#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["zh", "en", "es", "ar", "fr", "pt", "ru", "de", "it", "tr"];
const pagePath = (locale, section = "") => locale === "zh"
  ? `${section}index.html`
  : `${locale}/${section}index.html`;
const pages = LOCALES.flatMap((locale) => [
  pagePath(locale),
  pagePath(locale, "calculator/"),
  pagePath(locale, "inquiry/"),
]);

let changed = 0;

for (const file of pages) {
  const absolute = resolve(ROOT, file);
  const original = await readFile(absolute, "utf8");
  let html = original;

  const desktopSocial = html.match(/<a class="site-nav-team" href="([^"]+)">([\s\S]*?)<\/a>/);
  const mobilePanel = html.match(/<nav class="site-nav-mobile-panel"[^>]*>[\s\S]*?<\/nav>/);
  if (!desktopSocial || !mobilePanel) throw new Error(`${file}: navigation structure missing`);

  if (!/class="site-nav-mobile-team"/.test(mobilePanel[0])) {
    const socialLink = `          <a class="site-nav-mobile-team" href="${desktopSocial[1]}">${desktopSocial[2]}</a>\n`;
    const updatedPanel = mobilePanel[0].replace(/([ \t]*)<\/nav>$/, `${socialLink}$1</nav>`);
    html = html.replace(mobilePanel[0], updatedPanel);
  }

  const topQuote = html.match(/<a class="site-nav-quote(?: site-nav-quote-action)?" href="([^"]+)">([\s\S]*?)<\/a>/);
  const desktopLinks = html.match(/<nav class="site-nav-links"[^>]*>[\s\S]*?<\/nav>/);
  if (topQuote && desktopLinks) {
    html = html.replace(topQuote[0], `<a class="site-nav-quote site-nav-quote-action" href="${topQuote[1]}">${topQuote[2]}</a>`);
    if (!/class="site-nav-quote site-nav-quote-desktop"/.test(desktopLinks[0])) {
      const desktopQuote = `        <a class="site-nav-quote site-nav-quote-desktop" href="${topQuote[1]}">${topQuote[2]}</a>\n`;
      const reviewLink = desktopLinks[0].match(/<a href="#[^"]+">[^<]+<\/a>/g)?.[2];
      const updatedLinks = reviewLink
        ? desktopLinks[0].replace(reviewLink, `${reviewLink}\n${desktopQuote.trimEnd()}`)
        : desktopLinks[0].replace(/([ \t]*)<\/nav>$/, `${desktopQuote}$1</nav>`);
      html = html.replace(desktopLinks[0], updatedLinks);
    }
  }

  if (html !== original) {
    await writeFile(absolute, html);
    changed += 1;
  }
}

console.log(`Navigation actions synchronized: ${changed}/${pages.length} pages updated.`);
