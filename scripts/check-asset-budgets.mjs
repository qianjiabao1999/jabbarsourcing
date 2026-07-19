#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync, constants } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ENHANCEMENTS_GZIP_MAX = 17 * 1024;

const source = await readFile(resolve(ROOT, "assets/site-enhancements.js"));
const gzipBytes = gzipSync(source, { level: constants.Z_BEST_COMPRESSION }).byteLength;

assert(
  gzipBytes <= SITE_ENHANCEMENTS_GZIP_MAX,
  `assets/site-enhancements.js is ${gzipBytes} gzip bytes; budget is ${SITE_ENHANCEMENTS_GZIP_MAX}. Split homepage-only behavior before raising the budget.`,
);

console.log(`Asset budget passed: site-enhancements.js ${gzipBytes}/${SITE_ENHANCEMENTS_GZIP_MAX} gzip bytes.`);
