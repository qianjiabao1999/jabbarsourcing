#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../assets/calculator-order-analyzer.js", import.meta.url), "utf8");
const quickSource = await readFile(new URL("../assets/site-enhancements.js", import.meta.url), "utf8");
const count = (pattern) => (source.match(pattern) || []).length;

for (const token of [
  "CONTAINER_CAPACITY_CBM", "CONTAINER_EPSILON_CBM", "MAX_CONTAINER_BARS",
  "loads", "loadIndexes", "visibleContainerLoads", "drawContainerLoadBars",
  "data-container-load", "data-container-index"
]) {
  assert(source.includes(token), `missing full-container-first allocation token ${token}`);
}

assert.match(source, /Math\.ceil\(\(value - CONTAINER_EPSILON_CBM\) \/ CONTAINER_CAPACITY_CBM\)/, "container count must tolerate floating-point noise at exact-capacity boundaries");
assert.match(source, /remaining >= CONTAINER_CAPACITY_CBM - CONTAINER_EPSILON_CBM[\s\S]*\? 100/, "full containers must receive 100% before the remainder");
assert.doesNotMatch(source, /value\s*\/\s*\(count\s*\*\s*(?:68|CONTAINER_CAPACITY_CBM)\)\s*\*\s*100/, "multi-container load must not be averaged across all containers");
assert.match(source, /Analyzer\.prototype\.renderContainer[\s\S]*var loads = this\.visibleContainerLoads\(estimate, MAX_CONTAINER_BARS\)/, "page SVG must use the shared per-container loads");
assert.equal(count(/drawContainerLoadBars\(/g), 2, "both PNG report paths must share per-container bars");
assert.equal(count(/data-container-load=/g), 1, "browser allocation hook count");

for (const token of [
  "containerCapacity", "containerEpsilon", "loads", "data-container-count",
  "data-container-load", "cbm-container-visual", "cbm-container-fill", "is-full"
]) {
  assert(quickSource.includes(token), `missing quick-calculator full-first allocation token ${token}`);
}
assert.match(quickSource, /Math\.ceil\(\(totalCbm - containerEpsilon\) \/ containerCapacity\)/, "quick calculator must tolerate floating-point noise at exact-capacity boundaries");
assert.match(quickSource, /totalCbm - index \* containerCapacity/, "quick calculator must allocate each container in order");
assert.doesNotMatch(quickSource, /totalCbm\s*\/\s*\(count\s*\*\s*containerCapacity\)/, "quick calculator must not average loads across containers");

console.log("Container allocation static guards passed: quick and Excel modes fill complete containers before the remainder.");
