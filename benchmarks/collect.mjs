// Runs the diff benchmarks and writes structured results to
// website/app/docs/benchmarks/results.json, which the Benchmarks page renders
// from directly. Run from the repo root:  bun benchmarks/collect.mjs
import os from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { measure } from 'mitata';
import { diff as objDiff, patch as objPatch } from '../packages/obj-diff/dist/index.js';
import mdiff from 'microdiff';
import deepDiff from 'deep-diff';
import { detailedDiff as deepObjectDiff } from 'deep-object-diff';
import { diff as justDiff } from 'just-diff';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'website', 'app', 'docs', 'benchmarks', 'results.json');
const ACCURACY_OUT = join(here, '..', 'website', 'app', 'docs', 'comparison', 'accuracy.json');

const runtime = typeof Bun !== 'undefined'
  ? `Bun ${Bun.version}`
  : `Node.js ${process.version.replace(/^v/, '')}`;

// --- Timing scenarios: measured avg latency (nanoseconds) per library ---
const N = 10000;
const ta1 = new Uint32Array(N);
const ta2 = new Uint32Array(N);
ta2[5000] = 9999;

const timingScenarios = [
  {
    label: 'One property changed (small object)',
    a: { a: 1, b: { c: 2 }, d: [1, 2, 3] },
    b: { a: 1, b: { c: 99 }, d: [1, 2, 3] },
  },
  {
    label: 'Mixed object changes',
    a: { str: 'hello', num: 42, arr: [1, 2], obj: { a: 1 } },
    b: { str: 'world', num: 42, arr: [1, 3], obj: { a: 2, b: 3 } },
  },
  {
    label: 'Deep nested change (9 levels)',
    a: { a: { b: { c: { d: { e: { f: { g: { h: { i: 1 } } } } } } } } },
    b: { a: { b: { c: { d: { e: { f: { g: { h: { i: 2 } } } } } } } } },
  },
  {
    label: 'Large plain array (10k numbers, 1 change)',
    a: { arr: Array.from({ length: N }, (_, i) => i) },
    b: { arr: Array.from({ length: N }, (_, i) => (i === 5000 ? 9999 : i)) },
  },
  {
    label: 'Large TypedArray (10k, 1 change)',
    a: { arr: ta1 },
    b: { arr: ta2 },
  },
];

const libs = {
  '@opentf/obj-diff': (a, b) => objDiff(a, b),
  microdiff: (a, b) => mdiff(a, b),
  'deep-diff': (a, b) => deepDiff(a, b),
  'deep-object-diff': (a, b) => deepObjectDiff(a, b),
  'just-diff': (a, b) => justDiff(a, b),
};

const timings = [];
for (const sc of timingScenarios) {
  const results = {};
  for (const [name, fn] of Object.entries(libs)) {
    const stats = await measure(() => fn(sc.a, sc.b), { min_cpu_time: 300 * 1e6 });
    results[name] = { avgNs: stats.avg, p99Ns: stats.p99 };
  }
  timings.push({ label: sc.label, results });
  process.stderr.write(`timed: ${sc.label}\n`);
}

// --- Op-count scenarios: deterministic diff size (obj-diff vs microdiff) ---
const base = Array.from({ length: N }, (_, i) => i);
const opScenarios = [
  { label: 'Insert 1 element at the front', b: [-1, ...base] },
  { label: 'Insert 1 element in the middle', b: [...base.slice(0, N / 2), -1, ...base.slice(N / 2)] },
  { label: 'Remove 1 element from the middle', b: base.filter((_, i) => i !== N / 2) },
  { label: 'Remove a run of 10 elements', b: [...base.slice(0, N / 2), ...base.slice(N / 2 + 10)] },
];

const opCounts = opScenarios.map((sc) => ({
  label: sc.label,
  arraySize: N,
  results: {
    '@opentf/obj-diff': objDiff(base, sc.b).length,
    microdiff: mdiff(base, sc.b).length,
  },
}));

// --- Accuracy: does each library even notice a change in native types? ---
// Mirrors benchmarks/category-d-accuracy.js: a "fail" means the library
// returned an empty diff for two genuinely different values.
const accuracyCases = [
  { name: 'Nested Objects', get: () => [{ a: { b: 1 } }, { a: { b: 2 } }] },
  { name: 'Dates', get: () => [{ d: new Date('2024-01-01') }, { d: new Date('2024-01-02') }] },
  { name: 'RegExps', get: () => [{ regex: /foo/g }, { regex: /bar/g }] },
  { name: 'Maps', get: () => [new Map([['key', 1]]), new Map([['key', 2], ['new', 3]])] },
  { name: 'Sets', get: () => [new Set([1, 2]), new Set([2, 3])] },
  { name: 'TypedArrays', get: () => [new Uint8Array([1, 2, 3]), new Uint8Array([1, 4, 3])] },
  {
    name: 'Circular References',
    get: () => {
      const a = { id: 1 };
      a.self = a;
      return [a, { id: 1, self: { id: 2 } }];
    },
  },
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

const accuracyLibs = Object.entries(libs).map(([name, fn]) => ({ name, fn }));
const accuracy = accuracyLibs.map(({ name, fn }) => {
  const results = {};
  for (const tc of accuracyCases) {
    try {
      const [a, b] = tc.get();
      results[tc.name] = hasChanges(fn(a, b)) ? 'pass' : 'fail';
    } catch {
      results[tc.name] = 'crash';
    }
  }
  return { name, results };
});

const data = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    cpu: os.cpus()[0]?.model?.trim() ?? 'unknown',
    runtime,
    libraries: Object.keys(libs),
    note: 'Absolute timings vary by machine; relative gaps are stable. Regenerate with `bun benchmarks/collect.mjs`.',
  },
  opCounts,
  timings,
};

writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
process.stderr.write(`wrote ${OUT}\n`);

const accuracyData = {
  meta: {
    generatedAt: data.meta.generatedAt,
    runtime,
    categories: accuracyCases.map((c) => c.name),
    note: 'A "fail" means the library returned an empty diff for two genuinely different values. Regenerate with `bun benchmarks/collect.mjs`.',
  },
  libraries: accuracy,
};
writeFileSync(ACCURACY_OUT, JSON.stringify(accuracyData, null, 2) + '\n');
process.stderr.write(`wrote ${ACCURACY_OUT}\n`);
