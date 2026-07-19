#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync, constants } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUDGETS = {
  "assets/site-enhancements.js": 15 * 1024,
  "assets/site-home-enhancements.js": 4 * 1024,
  "assets/site-footer-tools.js": 3 * 1024,
};

const results = [];
for (const [file, budget] of Object.entries(BUDGETS)) {
  const source = await readFile(resolve(ROOT, file));
  const gzipBytes = gzipSync(source, { level: constants.Z_BEST_COMPRESSION }).byteLength;
  assert(
    gzipBytes <= budget,
    `${file} is ${gzipBytes} gzip bytes; budget is ${budget}. Split page-specific behavior before raising the budget.`,
  );
  results.push(`${file} ${gzipBytes}/${budget}`);
}

console.log(`Asset budgets passed: ${results.join(", ")}.`);
