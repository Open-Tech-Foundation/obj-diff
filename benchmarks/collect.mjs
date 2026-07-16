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
