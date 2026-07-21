#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import { _android as android } from "playwright";

const SITE_URL = process.env.SITE_URL || "https://www.jabbarsourcing.com/en/";
const OUTPUT_DIR = process.env.QA_ANDROID_OUTPUT_DIR || "/tmp/jabbar-android-device";
const REQUIRE_WECHAT = process.env.REQUIRE_WECHAT === "1";

await mkdir(OUTPUT_DIR, { recursive: true });

function skipOrFail(message) {
  if (REQUIRE_WECHAT) throw new Error(message);
  console.log(`SKIP: ${message}`);
  process.exit(0);
}

function adbServerAvailable() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 5037 });
    const finish = (available) => {
      socket.destroy();
      resolve(available);
    };
    socket.setTimeout(800, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function inspectPage(page, label, { requireWechatUa = false } = {}) {
  const regionResponseObserved = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/consent-region",
    { timeout: 5000 },
  );
  const response = await page.goto(SITE_URL, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, `${label}: website did not return HTTP 200`);
  await page.waitForFunction(() => window.jabbarAnalyticsConsent?.isRegionResolved?.());
  await page.waitForFunction(() => document.querySelector(".faq-quick-tag"));
  const regionResponse = await regionResponseObserved;
  const regionPayload = await regionResponse.json().catch(() => null);
  assert.equal(regionResponse.status(), 200, `${label}: consent-region endpoint did not return HTTP 200`);
  assert(["strict", "quiet-denied"].includes(regionPayload?.policy), `${label}: invalid live consent-region payload`);
  const state = await page.evaluate(() => ({
    title: document.title,
    userAgent: navigator.userAgent,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    policy: window.jabbarAnalyticsConsent.getRegionPolicy(),
    floatingCount: document.querySelectorAll("#jabbar-analytics-settings,.contact-speed-dial,.mobile-conversion-bar,.site-footer-backtop").length,
  }));
  assert(state.title.includes("Jabbar Sourcing"), `${label}: wrong page title`);
  if (requireWechatUa) assert(state.userAgent.includes("MicroMessenger"), `${label}: target WebView is not WeChat`);
  assert(state.overflow <= 1, `${label}: horizontal overflow ${state.overflow}px`);
  assert.equal(state.policy, regionPayload.policy, `${label}: page policy does not match live endpoint`);
  assert.equal(state.floatingCount, 0, `${label}: removed floating control returned`);
  await page.locator(".faq-quick-tag").first().tap();
  assert.equal(await page.locator(".faq-item[open]").count(), 1, `${label}: FAQ touch interaction failed`);
  await page.screenshot({ path: `${OUTPUT_DIR}/${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`, fullPage: false });
}

if (!(await adbServerAvailable())) {
  skipOrFail("ADB server is not running; connect and authorize an Android device, then rerun npm run qa:android-device");
}

let devices;
try {
  devices = await android.devices();
} catch (error) {
  skipOrFail(`no reachable authorized Android device (${error instanceof Error ? error.message : String(error)})`);
}

if (!devices.length) {
  skipOrFail("no authorized Android device; connect one through ADB and rerun npm run qa:android-device");
}

let chromePassed = 0;
let wechatPassed = 0;
let wechatSkipped = 0;

for (const device of devices) {
  const model = device.model() || "Android device";
  try {
    const context = await device.launchBrowser();
    try {
      const page = await context.newPage();
      await inspectPage(page, `${model} Chrome`);
      chromePassed += 1;
    } finally {
      await context.close();
    }

    const wechatView = (await device.webViews()).find((view) => view.pkg() === "com.tencent.mm");
    if (!wechatView) {
      wechatSkipped += 1;
      console.log(`SKIP: ${model} has no debuggable WeChat WebView; open the live site in WeChat and rerun`);
    } else {
      const wechatPage = await wechatView.page();
      const currentUrl = new URL(wechatPage.url());
      if (currentUrl.hostname !== "www.jabbarsourcing.com") {
        wechatSkipped += 1;
        console.log(`SKIP: ${model} WeChat WebView is not displaying jabbarsourcing.com`);
      } else {
        await inspectPage(wechatPage, `${model} WeChat`, { requireWechatUa: true });
        wechatPassed += 1;
      }
    }
  } finally {
    await device.close();
  }
}

if (REQUIRE_WECHAT && wechatSkipped > 0) {
  throw new Error(`Real Android Chrome smoke passed on ${chromePassed} device(s), but WeChat was skipped on ${wechatSkipped} device(s)`);
}

console.log(`Real Android result: Chrome smoke passed=${chromePassed}; WeChat smoke passed=${wechatPassed}; WeChat skipped=${wechatSkipped}; screenshots at ${OUTPUT_DIR}.`);
