import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "index.html");
const ASSETS_DIR = path.join(ROOT, "assets");
const MANIFEST_FILE = path.join(ASSETS_DIR, "social-avatars-manifest.json");

const MIN_SOURCE_SIZE = 400;
const OUTPUT_SIZE = 560;
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const ACCOUNT_HINTS = {
  "douyin-haoduobao.webp": {
    platform: "douyin",
    profileUrl: "https://www.douyin.com/user/MS4wLjABAAAA5SfL1RgN5bWEbuIK7ZFCb8CocFC1f5Ao6EHPD290b8T_eTvglSqBvGL9gXScTj7C",
  },
  "douyin-jiangjie-avatar.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/XsV6tHsEcQc/",
  },
  "douyin-73178679666.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/nP85mlDfIqQ/",
  },
  "douyin-275644598.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/K7cXAMJ8kuw/",
  },
  "douyin-05280606.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/zecgS6vTGJo/",
  },
  "douyin-138411321.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/7jZSnH9WikI/",
  },
  "xiaohongshu-haoduobao.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/5af044554eacab1175529438",
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanImageUrl(value) {
  if (!value) return "";
  return value
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/%5Cu002F/gi, "/")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: new URL(url).origin + "/",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

function extractAvatarCandidates(html) {
  const candidates = [];
  const decoded = cleanImageUrl(html);

  for (const key of ["avatarLarger", "avatarMedium", "avatarThumb", "avatar_300x300", "avatar_larger", "avatar_medium", "avatar_thumb"]) {
    const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "g");
    for (const match of decoded.matchAll(pattern)) candidates.push(cleanImageUrl(match[1]));
  }

  for (const match of decoded.matchAll(/https?:\/\/[^"'<>\s]+(?:tiktokcdn|tiktokcdn-us|douyinpic|snssdk|xhscdn)[^"'<>\s]+/gi)) {
    const url = cleanImageUrl(match[0]);
    if (/avatar|tos|profile|image|sns-avatar/i.test(url)) candidates.push(url);
  }

  return unique(candidates)
    .map((url) => url.replace(/\\+"/g, ""))
    .filter((url) => /^https?:\/\//.test(url));
}

function preferLargeAvatarUrls(urls) {
  const upgraded = [];
  for (const url of urls) {
    upgraded.push(url);
    upgraded.push(url.replace(/\/100x100\//g, "/720x720/"));
    upgraded.push(url.replace(/\/100x100\//g, "/1080x1080/"));
    upgraded.push(url.replace(/\/300x300\//g, "/720x720/"));
    upgraded.push(url.replace(/\/300x300\//g, "/1080x1080/"));
  }
  return unique(upgraded).sort((a, b) => {
    const score = (value) =>
      (value.includes("1080") ? 4 : 0) +
      (value.includes("720") ? 3 : 0) +
      (value.includes("larger") ? 2 : 0) -
      (value.includes("100x100") ? 5 : 0);
    return score(b) - score(a);
  });
}

function accountPlatformFromUrl(url) {
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("douyin.com") || url.includes("v.douyin.com")) return "douyin";
  if (url.includes("xiaohongshu.com")) return "xiaohongshu";
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

async function findSocialAccounts() {
  const html = await fs.readFile(INDEX_FILE, "utf8");
  const accounts = [];
  const cardPattern = /<a\s+[^>]*class="[^"]*team-card[^"]*"[^>]*>[\s\S]*?<\/a>/g;
  for (const card of html.matchAll(cardPattern)) {
    const markup = card[0];
    const src = markup.match(/<img[^>]+src="([^"]+)"/)?.[1];
    if (!src || !src.includes("assets/")) continue;
    const assetName = path.basename(src.split("?")[0]);
    if (!assetName.endsWith(".webp")) continue;

    const href = markup.match(/\shref="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    const dataWebLink = markup.match(/\sdata-web-link="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    const hint = ACCOUNT_HINTS[assetName] || {};
    const profileUrl = hint.profileUrl || dataWebLink || href;
    const platform = hint.platform || accountPlatformFromUrl(profileUrl || "");

    if (!profileUrl || !["tiktok", "douyin", "xiaohongshu"].includes(platform)) continue;
    accounts.push({
      assetName,
      platform,
      profileUrl,
      outputPath: path.join(ASSETS_DIR, assetName),
    });
  }

  const byAsset = new Map();
  for (const account of accounts) byAsset.set(account.assetName, account);
  return [...byAsset.values()];
}

async function buildAvatarBuffer(sourceBuffer) {
  const metadata = await sharp(sourceBuffer).metadata();
  const sourceSize = Math.min(metadata.width || 0, metadata.height || 0);
  if (sourceSize < MIN_SOURCE_SIZE) {
    return { ok: false, reason: `source too small: ${metadata.width}x${metadata.height}` };
  }

  const output = await sharp(sourceBuffer)
    .resize({ width: OUTPUT_SIZE, height: OUTPUT_SIZE, fit: "cover", kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.55, m1: 0.8, m2: 1.15 })
    .webp({ quality: 90, effort: 6, smartSubsample: true })
    .toBuffer();

  return { ok: true, output, sourceSize: `${metadata.width}x${metadata.height}` };
}

async function refreshAccount(account) {
  const pageHtml = await fetchText(account.profileUrl);
  const candidates = preferLargeAvatarUrls(extractAvatarCandidates(pageHtml));
  if (!candidates.length) return { ...account, changed: false, reason: "no avatar candidates" };

  for (const candidate of candidates.slice(0, 16)) {
    try {
      const image = await fetchImage(candidate);
      const built = await buildAvatarBuffer(image);
      if (!built.ok) {
        await sleep(250);
        continue;
      }

      const current = await fs.readFile(account.outputPath).catch(() => null);
      if (current && Buffer.compare(current, built.output) === 0) {
        return { ...account, changed: false, source: candidate, sourceSize: built.sourceSize, reason: "unchanged" };
      }

      await fs.writeFile(account.outputPath, built.output);
      return { ...account, changed: true, source: candidate, sourceSize: built.sourceSize };
    } catch (error) {
      await sleep(250);
    }
  }

  return { ...account, changed: false, reason: "no candidate passed quality gate" };
}

async function updateHtmlAvatarVersion(version) {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const pages = ["index.html"];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidate = path.join(entry.name, "index.html");
      try {
        await fs.access(path.join(ROOT, candidate));
        pages.push(candidate);
      } catch {}
    }
  }

  for (const page of pages) {
    const filePath = path.join(ROOT, page);
    let html = await fs.readFile(filePath, "utf8");
    const next = html.replace(/\?v=avatar-[^"]+/g, `?v=${version}`);
    if (next !== html) await fs.writeFile(filePath, next);
  }
}

async function main() {
  const accounts = await findSocialAccounts();
  const results = [];
  for (const account of accounts) {
    try {
      results.push(await refreshAccount(account));
    } catch (error) {
      results.push({ ...account, changed: false, reason: error.message });
    }
  }

  const changed = results.filter((result) => result.changed);
  if (changed.length) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    await updateHtmlAvatarVersion(`avatar-${stamp}`);
  }

  const manifestExists = await fs.access(MANIFEST_FILE).then(() => true).catch(() => false);
  if (changed.length || !manifestExists) {
    await fs.writeFile(
      MANIFEST_FILE,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          qualityGate: { minSourceSize: MIN_SOURCE_SIZE, outputSize: OUTPUT_SIZE },
          changed: changed.map((result) => result.assetName),
          results: results.map((result) => ({
            assetName: result.assetName,
            platform: result.platform,
            changed: result.changed,
            sourceSize: result.sourceSize,
            reason: result.reason,
          })),
        },
        null,
        2,
      ) + "\n",
    );
  }

  console.log(`Checked ${results.length} social avatars; changed ${changed.length}.`);
  for (const result of results) {
    console.log(`${result.changed ? "UPDATED" : "SKIPPED"} ${result.assetName}: ${result.sourceSize || result.reason || "no change"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
