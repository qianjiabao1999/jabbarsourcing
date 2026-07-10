import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
let chromium = null;
let playwrightLoadError = null;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  playwrightLoadError = error;
}

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "index.html");
const ASSETS_DIR = path.join(ROOT, "assets");
const SOCIAL_AVATAR_DIR = path.join(ASSETS_DIR, "social-116");
const SOCIAL_SOURCE_DIR = path.join(ASSETS_DIR, "social-source");
const MANIFEST_FILE = path.join(ASSETS_DIR, "social-avatars-manifest.json");
const BROWSER_IMAGE_CACHE = new Map();

const MIN_SOURCE_SIZE = 400;
const MAX_SOURCE_ASPECT_RATIO = 1.2;
const MAX_CANDIDATES = 16;
const OUTPUT_SIZES = [
  { suffix: "116", size: 116, quality: 78 },
  { suffix: "232", size: 232, quality: 84 },
];
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const DOUYIN_MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Mobile/15E148 aweme_28.0.0";

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
    profileUrl: "https://v.douyin.com/t5F4hqJGUR0/",
  },
  "douyin-275644598.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/K7cXAMJ8kuw/",
  },
  "douyin-05280606.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/Q97JohONIKI/",
  },
  "douyin-138411321.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/7jZSnH9WikI/",
  },
  "xiaohongshu-haoduobao.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/5af044554eacab1175529438",
  },
  "douyin-89144212942.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/S99_Tv9at_I/",
  },
  "douyin-dg661661.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/Yk8-Ra0NoRg/",
  },
  "douyin-999999q99999.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/vyPKT52O7iE/",
  },
  "douyin-95088908057.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/gkax0pMz5Es/",
  },
  "douyin-64412023244.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/TmdHBDpwtbg/",
  },
  "douyin-87296762727.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/r0lB8iDyYLA/",
  },
  "douyin-92340484988.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/nWx5ble0CXs/",
  },
  "douyin-90267896705.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/exytlqpiZCY/",
  },
  "douyin-160463933.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/0Dryk2y8bNM/",
  },
  "douyin-41184831028.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/LA2C1TIky_c/",
  },
  "douyin-a05505566.webp": {
    platform: "douyin",
    profileUrl: "https://v.douyin.com/ihAmAIBBPXk/",
  },
  "xiaohongshu-yw-source-supply.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/6844fc06000000001b01b6e5",
  },
  "xiaohongshu-yiwu-ranran.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/69f829370000000002002407",
  },
  "xiaohongshu-yaoge.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/5597cae1e4b1cf1a56ddfeb3",
  },
  "xiaohongshu-zhu-manager.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/6148830c0000000002018858",
  },
  "xiaohongshu-2yuan10yuan.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/60e5bece000000000101c270",
  },
  "xiaohongshu-95017297811.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/683443ec000000001d016a86",
  },
  "xiaohongshu-26205931510.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/67888fd4000000000801d1f9",
  },
  "xiaohongshu-635230302.webp": {
    platform: "xiaohongshu",
    profileUrl: "https://www.xiaohongshu.com/user/profile/5a4c800d11be101f60868823",
    fallbackAvatarUrl: "https://sns-avatar-qc.xhscdn.com/avatar/1040g2jo32275jaim7o6g4a0krs00r213avs3s1o",
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function relativePath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function formatError(error) {
  return String(error?.message || error || "unknown error")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

async function readFileIfExists(filePath) {
  return fs.readFile(filePath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
}

async function pathExists(filePath) {
  return fs.access(filePath).then(() => true).catch(() => false);
}

async function replaceFilesAtomically(files) {
  if (!files.length) return;

  const token = `${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
  const states = files.map(({ filePath, buffer }) => ({
    filePath,
    buffer,
    tempPath: `${filePath}.tmp-${token}`,
    backupPath: `${filePath}.bak-${token}`,
    hadOriginal: false,
    replaced: false,
  }));

  try {
    for (const state of states) {
      await fs.mkdir(path.dirname(state.filePath), { recursive: true });
      await fs.writeFile(state.tempPath, state.buffer, { flag: "wx" });
    }

    for (const state of states) {
      state.hadOriginal = await pathExists(state.filePath);
      if (state.hadOriginal) await fs.rename(state.filePath, state.backupPath);
      await fs.rename(state.tempPath, state.filePath);
      state.replaced = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const state of [...states].reverse()) {
      try {
        if (state.replaced) await fs.rm(state.filePath, { force: true });
        if (state.hadOriginal && await pathExists(state.backupPath)) {
          await fs.rename(state.backupPath, state.filePath);
        }
      } catch (rollbackError) {
        rollbackErrors.push(`${relativePath(state.filePath)}: ${formatError(rollbackError)}`);
      }
    }
    const suffix = rollbackErrors.length ? `; rollback failed: ${rollbackErrors.join(" | ")}` : "";
    throw new Error(`atomic avatar write failed: ${formatError(error)}${suffix}`);
  } finally {
    await Promise.all(states.map((state) => fs.rm(state.tempPath, { force: true }).catch(() => {})));
  }

  await Promise.all(states.map((state) => fs.rm(state.backupPath, { force: true }).catch(() => {})));
}

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

async function resolveRedirectUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": DOUYIN_MOBILE_USER_AGENT,
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const location = res.headers.get("location");
    return location ? new URL(location, url).toString() : res.url || url;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImage(url) {
  const cached = BROWSER_IMAGE_CACHE.get(cleanImageUrl(url));
  if (cached) return cached;

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

function extractDouyinSecUid(value) {
  if (!value) return "";
  const cleaned = cleanImageUrl(value);
  try {
    const url = new URL(cleaned);
    const queryUid = url.searchParams.get("sec_uid") || url.searchParams.get("sec_user_id");
    if (queryUid) return queryUid;
    const match = url.pathname.match(/\/(?:user|share\/user)\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    const match = cleaned.match(/(?:sec_uid|sec_user_id)=([^&#]+)/) || cleaned.match(/\/(?:user|share\/user)\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

async function fetchDouyinAvatarCandidates(account) {
  let secUid = extractDouyinSecUid(account.profileUrl);
  if (!secUid && account.profileUrl.includes("v.douyin.com")) {
    const resolved = await resolveRedirectUrl(account.profileUrl);
    secUid = extractDouyinSecUid(resolved);
  }
  if (!secUid) return [];

  const apiUrl = `https://www.iesdouyin.com/web/api/v2/user/info/?sec_uid=${encodeURIComponent(secUid)}&aid=1128`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let data;
  try {
    const res = await fetch(apiUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": DOUYIN_MOBILE_USER_AGENT,
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        accept: "application/json,text/plain,*/*",
      },
    });
    if (!res.ok) return [];
    data = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const user = data?.user_info || {};
  const uris = unique([
    user.avatar_larger?.uri,
    user.avatar_medium?.uri,
    user.avatar_thumb?.uri,
  ]);
  const hosts = ["p3.douyinpic.com", "p11.douyinpic.com", "p26.douyinpic.com"];
  const candidates = [];
  for (const uri of uris) {
    for (const host of hosts) {
      candidates.push(`https://${host}/img/${uri}~tplv-dy-aweme-images:q75.webp`);
      candidates.push(`https://${host}/img/${uri}~tplv-dy-aweme-images:q75.jpeg`);
      candidates.push(`https://${host}/aweme/1080x1080/${uri}.jpeg?from=2956013662`);
      candidates.push(`https://${host}/img/${uri}~c5_720x720.jpeg`);
      candidates.push(`https://${host}/img/${uri}~tplv-dy-resize-walign-adapt-aq:540:q75.webp`);
    }
  }
  return unique(candidates);
}

async function fetchInstagramAvatarCandidates(account) {
  if (!chromium) throw new Error(`Playwright unavailable: ${formatError(playwrightLoadError)}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      userAgent: USER_AGENT,
    });
    try {
      const page = await context.newPage();
      await page.goto(account.profileUrl, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT_MS * 3 });
      await page.waitForLoadState("load", { timeout: REQUEST_TIMEOUT_MS }).catch(() => {});
      await page.waitForTimeout(1800);
      const domCandidates = await page.evaluate(() => {
        const urls = [];
        const og = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]')?.content;
        if (og) urls.push(og);
        for (const img of document.images) {
          const src = img.currentSrc || img.src;
          const alt = img.alt || "";
          if (!src || !(/profile picture/i.test(alt) || /t51\.82787-19/.test(src))) continue;
          urls.push(src, img.src);
          for (const item of (img.srcset || "").split(",")) {
            const candidate = item.trim().split(/\s+/)[0];
            if (candidate) urls.push(candidate);
          }
        }
        return urls;
      });
      const pageHtml = await page.content();
      return preferLargeAvatarUrls([
        ...domCandidates.map(cleanImageUrl),
        ...extractAvatarCandidates(pageHtml),
      ]);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function fetchBrowserAvatarCandidates(account) {
  if (!chromium) throw new Error(`Playwright unavailable: ${formatError(playwrightLoadError)}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      userAgent: USER_AGENT,
    });
    try {
      const page = await context.newPage();
      const browserImageResponses = [];
      page.on("response", (response) => {
        const responseUrl = cleanImageUrl(response.url());
        if (
          response.request().resourceType() !== "image" ||
          !/(?:tiktokcdn|tiktokcdn-us)/i.test(responseUrl) ||
          !/cropcenter:(?:720|1080)/i.test(responseUrl)
        ) return;
        browserImageResponses.push(
          response.body()
            .then((buffer) => {
              if (buffer.length) BROWSER_IMAGE_CACHE.set(responseUrl, buffer);
              return responseUrl;
            })
            .catch(() => ""),
        );
      });
      await page.goto(account.profileUrl, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT_MS * 3 });
      await page.waitForLoadState("load", { timeout: REQUEST_TIMEOUT_MS }).catch(() => {});
      await page.waitForFunction(
        () => [...document.images].some((image) =>
          image.naturalWidth >= 400 && /tiktokcdn/i.test(image.currentSrc || image.src)),
        { timeout: REQUEST_TIMEOUT_MS },
      ).catch(() => {});
      const renderedCandidates = await page.evaluate(() =>
        [...document.images]
          .filter((image) => image.naturalWidth >= 400 && /tiktokcdn/i.test(image.currentSrc || image.src))
          .map((image) => image.currentSrc || image.src),
      );
      const pageHtml = await page.content();
      await Promise.allSettled(browserImageResponses);
      return preferLargeAvatarUrls([
        ...renderedCandidates.map(cleanImageUrl),
        ...extractAvatarCandidates(pageHtml),
      ]);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

function extractAvatarCandidates(html) {
  const candidates = [];
  const decoded = cleanImageUrl(html);

  for (const match of decoded.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    candidates.push(cleanImageUrl(match[1]));
  }
  for (const match of decoded.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi)) {
    candidates.push(cleanImageUrl(match[1]));
  }

  for (const key of [
    "avatarLarger",
    "avatarMedium",
    "avatarThumb",
    "avatar_300x300",
    "avatar_larger",
    "avatar_medium",
    "avatar_thumb",
    "profile_pic_url",
    "profile_pic_url_hd",
    "profilePicUrl",
    "profilePicUrlHd",
    "avatar",
    "imageb",
  ]) {
    const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "g");
    for (const match of decoded.matchAll(pattern)) candidates.push(cleanImageUrl(match[1]));
  }

  for (const match of decoded.matchAll(/https?:\/\/[^"'<>\s]+(?:tiktokcdn|tiktokcdn-us|douyinpic|snssdk|xhscdn|cdninstagram|fbcdn|scontent)[^"'<>\s]+/gi)) {
    const url = cleanImageUrl(match[0]);
    if (/avatar|tos|profile|image|sns-avatar/i.test(url)) candidates.push(url);
  }

  return unique(candidates)
    .map((url) => url.replace(/\\+"/g, ""))
    .filter((url) => /^https?:\/\//.test(url))
    .filter((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith("xhscdn.com") && parsed.hostname.includes("avatar")) {
          return parsed.pathname.startsWith("/avatar/");
        }
        return true;
      } catch {
        return false;
      }
    });
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
  if (url.includes("xiaohongshu.com") || url.includes("xhslink.com")) return "xiaohongshu";
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

function normalizeProfileUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return value;
  }
}

async function findSocialAccounts() {
  const html = await fs.readFile(INDEX_FILE, "utf8");
  const accounts = [];
  const cardPattern = /<a\s+[^>]*class="[^"]*team-card[^"]*"[^>]*>[\s\S]*?<\/a>/g;
  for (const card of html.matchAll(cardPattern)) {
    const markup = card[0];
    const src = markup.match(/<img[^>]+src="([^"]+)"/)?.[1];
    if (!src || !src.includes("assets/")) continue;
    const renderedAssetName = path.basename(src.split("?")[0]);
    if (!renderedAssetName.endsWith("-116.webp")) continue;
    const assetName = renderedAssetName.replace(/-116\.webp$/, ".webp");

    const href = markup.match(/\shref="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    const dataWebLink = markup.match(/\sdata-web-link="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    const hint = ACCOUNT_HINTS[assetName] || {};
    const linkedProfileUrl = dataWebLink || href;
    const linkedPlatform = accountPlatformFromUrl(linkedProfileUrl || "");
    if (hint.platform && linkedPlatform !== "unknown" && hint.platform !== linkedPlatform) {
      throw new Error(
        `social avatar file linked across platforms: ${renderedAssetName} ` +
        `(${hint.platform} hint vs ${linkedPlatform} page link)`,
      );
    }
    const profileUrl = hint.profileUrl || linkedProfileUrl;
    const platform = hint.platform || accountPlatformFromUrl(profileUrl || "");

    if (!profileUrl || !["tiktok", "douyin", "xiaohongshu", "instagram"].includes(platform)) continue;
    const stem = renderedAssetName.replace(/-116\.webp$/, "");
    accounts.push({
      assetName,
      renderedAssetName,
      platform,
      profileUrl,
      normalizedProfileUrl: normalizeProfileUrl(linkedProfileUrl || profileUrl),
      fallbackAvatarUrl: hint.fallbackAvatarUrl || null,
      sourcePath: path.join(SOCIAL_SOURCE_DIR, `${stem}.webp`),
      outputPaths: {
        116: path.join(SOCIAL_AVATAR_DIR, renderedAssetName),
        232: path.join(SOCIAL_AVATAR_DIR, renderedAssetName.replace(/-116\.webp$/, "-232.webp")),
      },
    });
  }

  const byAsset = new Map();
  for (const account of accounts) {
    const existing = byAsset.get(account.renderedAssetName);
    if (existing) {
      const sameAccount = existing.platform === account.platform &&
        existing.normalizedProfileUrl === account.normalizedProfileUrl;
      if (!sameAccount) {
        throw new Error(
          `social avatar file reused across accounts: ${account.renderedAssetName} ` +
          `(${existing.platform} ${existing.profileUrl} vs ${account.platform} ${account.profileUrl})`,
        );
      }
      continue;
    }
    byAsset.set(account.renderedAssetName, account);
  }
  return [...byAsset.values()];
}

async function inspectAvatarBuffer(sourceBuffer) {
  const metadata = await sharp(sourceBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const sourceSize = Math.min(width, height);
  if (sourceSize < MIN_SOURCE_SIZE) {
    return { ok: false, reason: `source too small: ${metadata.width}x${metadata.height}` };
  }
  const aspectRatio = Math.max(width, height) / sourceSize;
  if (!Number.isFinite(aspectRatio) || aspectRatio > MAX_SOURCE_ASPECT_RATIO) {
    return {
      ok: false,
      reason: `source is not square enough: ${width}x${height} (ratio ${aspectRatio.toFixed(3)})`,
    };
  }

  return { ok: true, width, height, sourceSize, aspectRatio, format: metadata.format || "unknown" };
}

async function buildAvatarBuffer(sourceBuffer, inspection) {
  const source = await sharp(sourceBuffer)
    .rotate()
    .webp({ quality: 95, effort: 6, smartSubsample: true })
    .toBuffer();

  const outputs = {};
  for (const target of OUTPUT_SIZES) {
    outputs[target.suffix] = await sharp(source)
      .resize({
        width: target.size,
        height: target.size,
        fit: "cover",
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
      })
      .sharpen({ sigma: 0.45, m1: 0.75, m2: 1.1 })
      .webp({ quality: target.quality, effort: 6, smartSubsample: true })
      .toBuffer();
  }

  return {
    source,
    outputs,
    sourceSize: `${inspection.width}x${inspection.height}`,
    hashes: {
      fetched: sha256(sourceBuffer),
      source: sha256(source),
      116: sha256(outputs[116]),
      232: sha256(outputs[232]),
    },
  };
}

async function refreshAccount(account) {
  let candidates = [];
  const failures = [];
  if (account.platform === "douyin") {
    try {
      candidates.push(...await fetchDouyinAvatarCandidates(account));
    } catch (error) {
      failures.push(`douyin API: ${formatError(error)}`);
    }
  }
  if (account.platform === "instagram") {
    try {
      candidates.push(...await fetchInstagramAvatarCandidates(account));
    } catch (error) {
      failures.push(`instagram Playwright: ${formatError(error)}`);
    }
  }
  if (account.platform === "tiktok") {
    try {
      candidates.push(...await fetchBrowserAvatarCandidates(account));
    } catch (error) {
      failures.push(`tiktok Playwright: ${formatError(error)}`);
    }
  }

  try {
    const pageHtml = await fetchText(account.profileUrl);
    candidates.push(...preferLargeAvatarUrls(extractAvatarCandidates(pageHtml)));
  } catch (error) {
    failures.push(`profile HTML fallback: ${formatError(error)}`);
  }
  if (account.fallbackAvatarUrl) candidates.push(account.fallbackAvatarUrl);
  candidates = unique(candidates.map(cleanImageUrl));
  if (!candidates.length) {
    return {
      ...account,
      success: false,
      changed: false,
      outputChanged: false,
      sourceChanged: false,
      reason: "no avatar candidates",
      failures,
    };
  }

  let best = null;
  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    try {
      const image = await fetchImage(candidate);
      const inspection = await inspectAvatarBuffer(image);
      if (!inspection.ok) {
        failures.push(`${candidate.slice(0, 260)}: ${inspection.reason}`);
        await sleep(250);
        continue;
      }

      const score = inspection.sourceSize * inspection.sourceSize;
      if (!best || score > best.score) {
        best = { candidate, image, inspection, score };
      }
      if (inspection.sourceSize >= 1080 && inspection.aspectRatio <= 1.05) break;
    } catch (error) {
      failures.push(`${candidate.slice(0, 260)}: ${formatError(error)}`);
      await sleep(250);
    }
  }

  if (!best) {
    return {
      ...account,
      success: false,
      changed: false,
      outputChanged: false,
      sourceChanged: false,
      reason: "no candidate passed quality gate",
      failures: failures.slice(0, MAX_CANDIDATES + 4),
    };
  }

  const built = await buildAvatarBuffer(best.image, best.inspection);
  const currentSource = await readFileIfExists(account.sourcePath);
  const current116 = await readFileIfExists(account.outputPaths[116]);
  const current232 = await readFileIfExists(account.outputPaths[232]);
  const sameSource = Boolean(currentSource && Buffer.compare(currentSource, built.source) === 0);
  const same116 = Boolean(current116 && Buffer.compare(current116, built.outputs[116]) === 0);
  const same232 = Boolean(current232 && Buffer.compare(current232, built.outputs[232]) === 0);
  const sourceChanged = !sameSource;
  const outputChanged = !same116 || !same232;

  const pendingWrites = [];
  if (!sameSource) pendingWrites.push({ filePath: account.sourcePath, buffer: built.source });
  if (!same116) pendingWrites.push({ filePath: account.outputPaths[116], buffer: built.outputs[116] });
  if (!same232) pendingWrites.push({ filePath: account.outputPaths[232], buffer: built.outputs[232] });
  await replaceFilesAtomically(pendingWrites);

  return {
    ...account,
    success: true,
    changed: sourceChanged || outputChanged,
    sourceChanged,
    outputChanged,
    sourceUrl: best.candidate,
    sourceSize: built.sourceSize,
    fetchedFormat: best.inspection.format,
    hashes: built.hashes,
    failures: failures.slice(0, MAX_CANDIDATES + 4),
    reason: sourceChanged || outputChanged ? undefined : "unchanged",
  };
}

const HTML_SKIP_DIRS = new Set([".git", ".playwright-cli", "node_modules", "_site", "output", "artifacts"]);

async function findHtmlPages(directory = ROOT) {
  const pages = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!HTML_SKIP_DIRS.has(entry.name)) pages.push(...await findHtmlPages(path.join(directory, entry.name)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) pages.push(path.join(directory, entry.name));
  }
  return pages;
}

async function readCurrentAvatarVersion() {
  const html = await fs.readFile(INDEX_FILE, "utf8");
  return html.match(/assets\/social-116\/[^"'?\s,]+-(?:116|232)\.webp\?v=(avatar-[A-Za-z0-9TZ-]+)/)?.[1] || null;
}

async function updateHtmlAvatarVersion(version) {
  const pages = await findHtmlPages();
  const writes = [];
  const modifiedPages = [];
  const referencePattern = /(assets\/social-116\/[^/"'?\s,]+-(?:116|232)\.webp)(?:\?[^"'\s,]+)?/g;

  for (const filePath of pages) {
    const html = await fs.readFile(filePath, "utf8");
    const next = html.replace(referencePattern, `$1?v=${version}`);
    for (const match of next.matchAll(/assets\/social-116\/[^/"'?\s,]+-(?:116|232)\.webp(?:\?v=([^"'\s,]+))?/g)) {
      if (match[1] !== version) {
        throw new Error(`avatar cache version did not update in ${relativePath(filePath)}: ${match[0]}`);
      }
    }
    if (next !== html) {
      writes.push({ filePath, buffer: Buffer.from(next) });
      modifiedPages.push(relativePath(filePath));
    }
  }

  await replaceFilesAtomically(writes);
  return modifiedPages;
}

function manifestResult(result) {
  return {
    assetName: result.renderedAssetName,
    platform: result.platform,
    profileUrl: result.profileUrl,
    status: result.success ? (result.changed ? "updated" : "unchanged") : "failed",
    changed: Boolean(result.changed),
    sourceChanged: Boolean(result.sourceChanged),
    outputChanged: Boolean(result.outputChanged),
    sourceUrl: result.sourceUrl || null,
    sourceSize: result.sourceSize || null,
    fetchedFormat: result.fetchedFormat || null,
    sourceFormat: result.success ? "webp" : null,
    sourcePath: relativePath(result.sourcePath),
    hashes: result.hashes || null,
    outputs: {
      116: { path: relativePath(result.outputPaths[116]), sha256: result.hashes?.[116] || null },
      232: { path: relativePath(result.outputPaths[232]), sha256: result.hashes?.[232] || null },
    },
    reason: result.reason || null,
    failures: result.failures || [],
  };
}

async function writeManifest(value) {
  const buffer = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await replaceFilesAtomically([{ filePath: MANIFEST_FILE, buffer }]);
}

function qualityGateManifest() {
  return {
    minSourceSize: MIN_SOURCE_SIZE,
    maxAspectRatio: MAX_SOURCE_ASPECT_RATIO,
    withoutEnlargement: true,
    outputSizes: OUTPUT_SIZES,
    sourceFormat: { format: "webp", quality: 95, resized: false },
  };
}

async function main() {
  const checkedAt = new Date().toISOString();
  const stamp = checkedAt.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const previousAvatarVersion = await readCurrentAvatarVersion();
  let avatarVersion = previousAvatarVersion || `avatar-${stamp}`;
  let accounts;

  try {
    accounts = await findSocialAccounts();
  } catch (error) {
    await writeManifest({
      schemaVersion: 2,
      checkedAt,
      status: "failed",
      avatarVersion,
      qualityGate: qualityGateManifest(),
      failure: formatError(error),
      changed: [],
      avatarChanged: [],
      versionedPages: [],
      results: [],
    });
    throw error;
  }

  const results = [];
  for (const [index, account] of accounts.entries()) {
    console.log(`[${index + 1}/${accounts.length}] Checking ${account.platform} ${account.renderedAssetName}...`);
    try {
      const result = await refreshAccount(account);
      results.push(result);
      console.log(
        `[${index + 1}/${accounts.length}] ${result.success ? (result.changed ? "UPDATED" : "UNCHANGED") : "FAILED"} ` +
        `${account.renderedAssetName}: ${result.sourceSize || result.reason || "no change"}`,
      );
    } catch (error) {
      const result = {
        ...account,
        success: false,
        changed: false,
        outputChanged: false,
        sourceChanged: false,
        reason: formatError(error),
        failures: [formatError(error)],
      };
      results.push(result);
      console.log(`[${index + 1}/${accounts.length}] FAILED ${account.renderedAssetName}: ${result.reason}`);
    }
  }

  const changed = results.filter((result) => result.changed);
  const avatarChanged = results.filter((result) => result.outputChanged);
  let versionedPages = [];
  try {
    if (avatarChanged.length || !previousAvatarVersion) {
      avatarVersion = `avatar-${stamp}`;
    }
    versionedPages = await updateHtmlAvatarVersion(avatarVersion);
  } catch (error) {
    const failed = results.filter((result) => !result.success);
    await writeManifest({
      schemaVersion: 2,
      checkedAt,
      status: "failed",
      failure: `avatar version update: ${formatError(error)}`,
      avatarVersion,
      qualityGate: qualityGateManifest(),
      counts: {
        checked: results.length,
        changed: changed.length,
        avatarChanged: avatarChanged.length,
        failed: failed.length,
      },
      changed: changed.map((result) => result.renderedAssetName),
      avatarChanged: avatarChanged.map((result) => result.renderedAssetName),
      versionedPages: [],
      results: results.map(manifestResult),
    });
    throw error;
  }

  const failed = results.filter((result) => !result.success);
  await writeManifest({
    schemaVersion: 2,
    checkedAt,
    status: failed.length ? "partial" : "complete",
    avatarVersion,
    qualityGate: qualityGateManifest(),
    counts: {
      checked: results.length,
      changed: changed.length,
      avatarChanged: avatarChanged.length,
      failed: failed.length,
    },
    changed: changed.map((result) => result.renderedAssetName),
    avatarChanged: avatarChanged.map((result) => result.renderedAssetName),
    versionedPages,
    results: results.map(manifestResult),
  });

  console.log(`Checked ${results.length} social avatars; changed ${changed.length}; failed ${failed.length}.`);
  for (const result of results) {
    const state = result.success ? (result.changed ? "UPDATED" : "UNCHANGED") : "FAILED";
    console.log(`${state} ${result.renderedAssetName}: ${result.sourceSize || result.reason || "no change"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
