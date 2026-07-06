import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "index.html");
const ASSETS_DIR = path.join(ROOT, "assets");
const SOCIAL_AVATAR_DIR = path.join(ASSETS_DIR, "social-116");
const MANIFEST_FILE = path.join(ASSETS_DIR, "social-avatars-manifest.json");

const MIN_SOURCE_SIZE = 400;
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
    const renderedAssetName = path.basename(src.split("?")[0]);
    if (!renderedAssetName.endsWith("-116.webp")) continue;
    const assetName = renderedAssetName.replace(/-116\.webp$/, ".webp");

    const href = markup.match(/\shref="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    const dataWebLink = markup.match(/\sdata-web-link="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
    const hint = ACCOUNT_HINTS[assetName] || {};
    const profileUrl = hint.profileUrl || dataWebLink || href;
    const platform = hint.platform || accountPlatformFromUrl(profileUrl || "");

    if (!profileUrl || !["tiktok", "douyin", "xiaohongshu"].includes(platform)) continue;
    accounts.push({
      assetName,
      renderedAssetName,
      platform,
      profileUrl,
      outputPaths: {
        116: path.join(SOCIAL_AVATAR_DIR, renderedAssetName),
        232: path.join(SOCIAL_AVATAR_DIR, renderedAssetName.replace(/-116\.webp$/, "-232.webp")),
      },
    });
  }

  const byAsset = new Map();
  for (const account of accounts) byAsset.set(account.renderedAssetName, account);
  return [...byAsset.values()];
}

async function buildAvatarBuffer(sourceBuffer) {
  const metadata = await sharp(sourceBuffer).metadata();
  const sourceSize = Math.min(metadata.width || 0, metadata.height || 0);
  if (sourceSize < MIN_SOURCE_SIZE) {
    return { ok: false, reason: `source too small: ${metadata.width}x${metadata.height}` };
  }

  const outputs = {};
  for (const target of OUTPUT_SIZES) {
    outputs[target.suffix] = await sharp(sourceBuffer)
      .resize({ width: target.size, height: target.size, fit: "cover", kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 0.45, m1: 0.75, m2: 1.1 })
      .webp({ quality: target.quality, effort: 6, smartSubsample: true })
      .toBuffer();
  }

  return { ok: true, outputs, sourceSize: `${metadata.width}x${metadata.height}` };
}

async function refreshAccount(account) {
  let candidates = [];
  if (account.platform === "douyin") {
    candidates = await fetchDouyinAvatarCandidates(account);
  }
  if (!candidates.length) {
    const pageHtml = await fetchText(account.profileUrl);
    candidates = preferLargeAvatarUrls(extractAvatarCandidates(pageHtml));
  }
  if (!candidates.length) return { ...account, changed: false, reason: "no avatar candidates" };

  for (const candidate of candidates.slice(0, 16)) {
    try {
      const image = await fetchImage(candidate);
      const built = await buildAvatarBuffer(image);
      if (!built.ok) {
        await sleep(250);
        continue;
      }

      const current116 = await fs.readFile(account.outputPaths[116]).catch(() => null);
      const current232 = await fs.readFile(account.outputPaths[232]).catch(() => null);
      const same116 = current116 && Buffer.compare(current116, built.outputs[116]) === 0;
      const same232 = current232 && Buffer.compare(current232, built.outputs[232]) === 0;
      if (same116 && same232) {
        return { ...account, changed: false, source: candidate, sourceSize: built.sourceSize, reason: "unchanged" };
      }

      await fs.mkdir(SOCIAL_AVATAR_DIR, { recursive: true });
      await fs.writeFile(account.outputPaths[116], built.outputs[116]);
      await fs.writeFile(account.outputPaths[232], built.outputs[232]);
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
    let next = html.replace(/\?v=avatar-[^"]+/g, `?v=${version}`);
    next = next.replace(/<img\b[^>]*src="([^"]*assets\/social-116\/)([^/"?]+)-116\.webp\?v=[^"]+"[^>]*>/g, (tag, prefix, name) => {
      const src116 = `${prefix}${name}-116.webp?v=${version}`;
      const src232 = `${prefix}${name}-232.webp?v=${version}`;
      let updated = tag.replace(/src="[^"]+"/, `src="${src116}"`);
      if (/\ssrcset="/.test(updated)) {
        updated = updated.replace(/\ssrcset="[^"]*"/, ` srcset="${src116} 1x, ${src232} 2x"`);
      } else {
        updated = updated.replace(/\s*\/?>$/, ` srcset="${src116} 1x, ${src232} 2x" />`);
      }
      return updated;
    });
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
          qualityGate: { minSourceSize: MIN_SOURCE_SIZE, outputSizes: OUTPUT_SIZES },
          changed: changed.map((result) => result.renderedAssetName),
          results: results.map((result) => ({
            assetName: result.renderedAssetName,
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
    console.log(`${result.changed ? "UPDATED" : "SKIPPED"} ${result.renderedAssetName}: ${result.sourceSize || result.reason || "no change"}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
