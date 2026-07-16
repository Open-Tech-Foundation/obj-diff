// Runs the diff/patch benchmarks and writes table-ready JSON that the docs
// render directly. Run from the repo root:  bun benchmarks/collect.mjs
//
// Outputs:
//   website/app/docs/benchmarks/results.json   (op counts, diff speed, patch speed)
//   website/app/docs/comparison/accuracy.json  (native-type correctness matrix)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { measure } from 'mitata';
import { diff as objDiff, patch as objPatch } from '../packages/obj-diff/dist/index.js';
import mdiff from 'microdiff';
import deepDiff from 'deep-diff';
import { diff as deepDiffTs, applyDiff as deepDiffTsApply } from 'deep-diff-ts';
import { detailedDiff as deepObjectDiff } from 'deep-object-diff';
import { diff as justDiff } from 'just-diff';
import { diffApply as justApply } from 'just-diff-apply';
import { detailedDiff as adobeDiff } from '@adobe/optimized-diff';
import { getDiff as recursiveDiff } from 'recursive-diff';
import * as jsondiffpatch from 'jsondiffpatch';
import * as fastJsonPatch from 'fast-json-patch';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'website', 'app', 'docs', 'benchmarks', 'results.json');
const ACCURACY_OUT = join(here, '..', 'website', 'app', 'docs', 'comparison', 'accuracy.json');

const clone = (o) => structuredClone(o);
const generatedAt = new Date().toISOString().slice(0, 10);

function fmt(ns) {
  if (ns == null) return "—";
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(2)} ms`;
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(2)} µs`;
  return `${Math.round(ns)} ns`;
}

// Measure avg latency (ns); returns null if the library throws on this input.
async function time(fn) {
  try { fn(); } catch { return null; }
  const s = await measure(fn, { min_cpu_time: 120 * 1e6 });
  return s.avg;
}

// Build a transposed table: libraries as rows, scenarios as columns, with the
// fastest cell per column flagged. Keeps the docs rendering trivial.
async function buildTable(libNames, runners, scenarios) {
  const raw = {}; // lib -> [ns|null per scenario]
  for (const lib of libNames) {
    raw[lib] = [];
    for (const sc of scenarios) raw[lib].push(await time(() => runners[lib](sc.a, sc.b)));
    process.stderr.write(`  timed ${lib}\n`);
  }
  const best = scenarios.map((_, i) => {
    const vals = libNames.map((l) => raw[l][i]).filter((v) => v != null);
    return vals.length ? Math.min(...vals) : null;
  });
  const rows = libNames.map((lib) => ({
    lib,
    cells: raw[lib].map((ns, i) => ({ text: fmt(ns), best: ns != null && ns === best[i] })),
  }));
  return { scenarios: scenarios.map((s) => s.short), rows };
}

const N = 10000;
const arr = () => Array.from({ length: N }, (_, i) => i);
const ta1 = new Uint32Array(N);
const ta2 = new Uint32Array(N);
ta2[5000] = 9999;

// ---------- Diff speed ----------
const diffRunners = {
  '@opentf/obj-diff': (a, b) => objDiff(a, b),
  microdiff: (a, b) => mdiff(a, b),
  'deep-diff': (a, b) => deepDiff(a, b),
  'deep-diff-ts': (a, b) => deepDiffTs(a, b),
  'deep-object-diff': (a, b) => deepObjectDiff(a, b),
  'just-diff': (a, b) => justDiff(a, b),
  '@adobe/optimized-diff': (a, b) => adobeDiff(a, b),
  'recursive-diff': (a, b) => recursiveDiff(a, b),
  jsondiffpatch: (a, b) => jsondiffpatch.diff(a, b),
};
const diffLibs = Object.keys(diffRunners);

const diffScenarios = [
  { short: '1 prop', a: { a: 1, b: { c: 2 }, d: [1, 2, 3] }, b: { a: 1, b: { c: 99 }, d: [1, 2, 3] } },
  { short: 'Mixed', a: { str: 'hi', num: 42, arr: [1, 2], obj: { a: 1 } }, b: { str: 'yo', num: 42, arr: [1, 3], obj: { a: 2, b: 3 } } },
  { short: 'Deep (9×)', a: { a: { b: { c: { d: { e: { f: { g: { h: { i: 1 } } } } } } } } }, b: { a: { b: { c: { d: { e: { f: { g: { h: { i: 2 } } } } } } } } } },
  { short: 'Array 10k', a: { arr: arr() }, b: { arr: arr().map((v, i) => (i === 5000 ? 9999 : v)) } },
  { short: 'TypedArray 10k', a: { arr: ta1 }, b: { arr: ta2 } },
];

process.stderr.write('diff speed:\n');
const diffTable = await buildTable(diffLibs, diffRunners, diffScenarios);

// ---------- Patch speed (diff + apply round-trip) ----------
const patchRunners = {
  '@opentf/obj-diff': (a, b) => objPatch(a, objDiff(a, b)),
  jsondiffpatch: (a, b) => jsondiffpatch.patch(clone(a), jsondiffpatch.diff(a, b)),
  'just-diff': (a, b) => justApply(clone(a), justDiff(a, b)),
  'deep-diff-ts': (a, b) => deepDiffTsApply(clone(a), deepDiffTs(a, b)),
  'fast-json-patch': (a, b) => fastJsonPatch.applyPatch(clone(a), fastJsonPatch.compare(a, b)).newDocument,
};
const patchLibs = Object.keys(patchRunners);

const patchScenarios = [
  { short: '1 prop', a: { a: 1, b: { c: 2 }, d: [1, 2, 3] }, b: { a: 1, b: { c: 99 }, d: [1, 2, 3] } },
  { short: 'Mixed', a: { str: 'hi', num: 42, arr: [1, 2], obj: { a: 1 } }, b: { str: 'yo', num: 42, arr: [1, 3], obj: { a: 2, b: 3 } } },
  { short: 'Array 10k', a: { arr: arr() }, b: { arr: arr().map((v, i) => (i === 5000 ? 9999 : v)) } },
];

process.stderr.write('patch round-trip:\n');
const patchTable = await buildTable(patchLibs, patchRunners, patchScenarios);

// ---------- Diff size (deterministic op counts) ----------
const base = arr();
const opScenarios = [
  { label: 'Insert 1 element at the front', b: [-1, ...base] },
  { label: 'Insert 1 element in the middle', b: [...base.slice(0, N / 2), -1, ...base.slice(N / 2)] },
  { label: 'Remove 1 element from the middle', b: base.filter((_, i) => i !== N / 2) },
  { label: 'Remove a run of 10 elements', b: [...base.slice(0, N / 2), ...base.slice(N / 2 + 10)] },
];
const opCounts = opScenarios.map((sc) => ({
  label: sc.label,
  obj: objDiff(base, sc.b).length,
  micro: mdiff(base, sc.b).length,
}));

// TypedArray speedup factor for the prose callout.
const objTaNs = await time(() => objDiff({ arr: ta1 }, { arr: ta2 }));
const microTaNs = await time(() => mdiff({ arr: ta1 }, { arr: ta2 }));
const taFactor = objTaNs && microTaNs ? Math.round(microTaNs / objTaNs) : null;

const data = {
  meta: { generatedAt, arraySize: N, taFactor, regenerate: 'bun benchmarks/collect.mjs' },
  opCounts,
  diffTable,
  patchTable,
};
writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
process.stderr.write(`wrote ${OUT}\n`);

// ---------- Accuracy (native-type correctness) ----------
const accuracyCases = [
  { name: 'Nested Objects', get: () => [{ a: { b: 1 } }, { a: { b: 2 } }] },
  { name: 'Dates', get: () => [{ d: new Date('2024-01-01') }, { d: new Date('2024-01-02') }] },
  { name: 'RegExps', get: () => [{ regex: /foo/g }, { regex: /bar/g }] },
  { name: 'Maps', get: () => [new Map([['key', 1]]), new Map([['key', 2], ['new', 3]])] },
  { name: 'Sets', get: () => [new Set([1, 2]), new Set([2, 3])] },
  { name: 'TypedArrays', get: () => [new Uint8Array([1, 2, 3]), new Uint8Array([1, 4, 3])] },
  { name: 'Circular References', get: () => { const a = { id: 1 }; a.self = a; return [a, { id: 1, self: { id: 2 } }]; } },
];

function hasChanges(result) {
  if (!result) return false;
  if (Array.isArray(result)) return result.length > 0;
  if (typeof result === 'object') {
    if (result.added || result.updated || result.deleted) {
      return (
        Object.keys(result.added || {}).length > 0 ||
        Object.keys(result.updated || {}).length > 0 ||
        Object.keys(result.deleted || {}).length > 0
      );
    }
    return Object.keys(result).length > 0;
  }
  return false;
}

const accuracy = diffLibs.map((name) => {
  const results = {};
  for (const tc of accuracyCases) {
    try {
      const [a, b] = tc.get();
      results[tc.name] = hasChanges(diffRunners[name](a, b)) ? 'pass' : 'fail';
    } catch {
      results[tc.name] = 'crash';
    }
  }
  return { name, results };
});

const accuracyData = {
  meta: { generatedAt, categories: accuracyCases.map((c) => c.name), regenerate: 'bun benchmarks/collect.mjs' },
  libraries: accuracy,
};
writeFileSync(ACCURACY_OUT, JSON.stringify(accuracyData, null, 2) + '\n');
process.stderr.write(`wrote ${ACCURACY_OUT}\n`);
