// Compares @opentf/obj-diff's general-purpose value codec (stringify / parse)
// against superjson on the three things that decide a type-safe JSON format:
// type fidelity, wire size, and speed. Run from the repo root:
//   bun benchmarks/serialization.mjs
//
// Output:
//   website/app/docs/comparison/serialization.json
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { measure } from 'mitata';
import { stringify as tfStringify, parse as tfParse } from '../packages/obj-diff/dist/index.js';
import superjson from 'superjson';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'website', 'app', 'docs', 'comparison', 'serialization.json');
const generatedAt = new Date().toISOString().slice(0, 10);
const sjVersion = JSON.parse(
  readFileSync(join(here, '..', 'node_modules', 'superjson', 'package.json'), 'utf8'),
).version;

const PKG = '@opentf/obj-diff';
const libs = [
  { name: PKG, stringify: tfStringify, parse: tfParse },
  { name: 'superjson', stringify: (v) => superjson.stringify(v), parse: (s) => superjson.parse(s) },
];

// ---- cycle-safe, type-aware equality (obj-diff's own diff() overflows on
// circular arrays, so the accuracy check can't lean on it) ----
function sameValue(a, b, seen = new Map()) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (a.constructor !== b.constructor) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);

  if (a instanceof Date) return Object.is(a.getTime(), b.getTime());
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (a instanceof URL) return a.href === b.href;
  if (a instanceof Number || a instanceof String || a instanceof Boolean) {
    return Object.is(a.valueOf(), b.valueOf());
  }
  if (a instanceof ArrayBuffer) return sameBytes(new Uint8Array(a), new Uint8Array(b));
  if (a instanceof DataView) {
    return sameBytes(new Uint8Array(a.buffer), new Uint8Array(b.buffer));
  }
  if (ArrayBuffer.isView(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    const be = [...b];
    let i = 0;
    for (const [k, v] of a) {
      if (!sameValue(k, be[i][0], seen) || !sameValue(v, be[i][1], seen)) return false;
      i++;
    }
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    const bv = [...b];
    let i = 0;
    for (const v of a) if (!sameValue(v, bv[i++], seen)) return false;
    return true;
  }
  if (a instanceof Error) {
    return a.name === b.name && a.message === b.message && a.code === b.code;
  }
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!sameValue(a[k], b[k], seen)) return false;
  return true;
}
function sameBytes(x, y) {
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

// ---- accuracy: round-trip fidelity (type + value) ----
const selfCyc = () => {
  const o = { name: 'n' };
  o.self = o;
  return o;
};
const selfArr = () => {
  const a = [1];
  a.push(a);
  return a;
};
const accCases = [
  ['Plain nested object', () => ({ a: { b: [1, 2] } })],
  ['Date', () => new Date(1e12)],
  ['Invalid Date', () => new Date(NaN)],
  ['RegExp', () => /foo\d+/giu],
  ['Map', () => new Map([['k', 1]])],
  ['Set', () => new Set([1, 2, 3])],
  ['BigInt', () => 9007199254740993n],
  ['Int8Array', () => new Int8Array([1, 2, 3])],
  ['Float64Array [NaN,-0,∞]', () => new Float64Array([NaN, -0, Infinity])],
  ['BigInt64Array', () => new BigInt64Array([9007199254740993n])],
  ['ArrayBuffer', () => new Uint8Array([9, 8, 7]).buffer],
  ['DataView', () => new DataView(new Uint8Array([1, 2, 3, 4]).buffer)],
  ['Error + custom prop', () => Object.assign(new TypeError('boom'), { code: 'E1' })],
  ['Boxed Number', () => new Number(42)],
  ['Boxed String', () => new String('hi')],
  ['undefined', () => undefined],
  ['NaN', () => NaN],
  ['-0', () => -0],
  ['Infinity', () => Infinity],
  ['URL', () => new URL('https://a.example/p?q=1')],
  ['Circular reference', selfCyc],
  ['Circular array', selfArr],
];

function accuracyFor(lib) {
  const cells = accCases.map(([, make]) => {
    const value = make();
    try {
      const back = lib.parse(lib.stringify(value));
      return sameValue(value, back) ? 'pass' : 'fail';
    } catch {
      return 'crash';
    }
  });
  return { name: lib.name, cells, score: `${cells.filter((c) => c === 'pass').length}/${cells.length}` };
}

// ---- wire size (bytes) on representative values ----
const sizeCases = [
  ['Flat object', { id: 1, name: 'Ada', active: true }],
  ['Mixed native types', { at: new Date(0), tags: new Set(['a', 'b']), prefs: new Map([['t', 'dark']]) }],
  ['Typed array (8)', { buf: new Int8Array([1, 2, 3, 4, 5, 6, 7, 8]) }],
  ['Nested record', { user: { id: 1, joined: new Date(0), roles: new Set(['admin', 'editor']), big: 42n } }],
  ['Tricky numbers', { a: NaN, b: -0, c: Infinity }],
  ['Circular graph', selfCyc()],
];
const size = {
  scenarios: sizeCases.map(([s]) => s),
  rows: libs.map((lib) => ({
    lib: lib.name,
    cells: sizeCases.map(([, v]) => {
      try {
        return lib.stringify(v).length;
      } catch {
        return null;
      }
    }),
  })),
};
// flag the smaller cell per column
size.best = size.scenarios.map((_, i) => {
  const vals = size.rows.map((r) => r.cells[i]).filter((v) => v != null);
  return vals.length ? Math.min(...vals) : null;
});

// ---- speed ----
async function timeNs(fn) {
  try {
    fn();
  } catch {
    return null;
  }
  const s = await measure(fn, { min_cpu_time: 120 * 1e6 });
  return s.avg;
}
function pickUnit(vals) {
  const v = vals.filter((x) => x != null).sort((a, b) => a - b);
  const m = v.length ? v[Math.floor(v.length / 2)] : 0;
  if (m >= 1e6) return { div: 1e6, label: 'ms' };
  if (m >= 1e3) return { div: 1e3, label: 'µs' };
  return { div: 1, label: 'ns' };
}
function fmt(ns, unit) {
  if (ns == null) return '—';
  const v = ns / unit.div;
  const s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  return `${s} ${unit.label}`;
}

const speedPayload = {
  user: {
    id: 1,
    joined: new Date(0),
    roles: new Set(['admin', 'editor']),
    prefs: new Map([['theme', 'dark'], ['lang', 'en']]),
    scores: new Float64Array([1.5, 2.5, 3.5]),
    big: 123n,
    tags: ['a', 'b', 'c'],
    note: null,
  },
};
const ops = ['stringify', 'parse', 'round trip'];
const speedRaw = [];
for (const lib of libs) {
  const wire = lib.stringify(speedPayload);
  const s = await timeNs(() => lib.stringify(speedPayload));
  const p = await timeNs(() => lib.parse(wire));
  const rt = await timeNs(() => lib.parse(lib.stringify(speedPayload)));
  speedRaw.push({ lib: lib.name, ns: [s, p, rt] });
  process.stderr.write(`  timed ${lib.name}\n`);
}
const speedUnits = ops.map((_, i) => pickUnit(speedRaw.map((r) => r.ns[i])));
const speedBest = ops.map((_, i) => {
  const vals = speedRaw.map((r) => r.ns[i]).filter((v) => v != null);
  return vals.length ? Math.min(...vals) : null;
});
const speed = {
  ops,
  rows: speedRaw.map((r) => ({
    lib: r.lib,
    cells: r.ns.map((ns, i) => ({ text: fmt(ns, speedUnits[i]), best: ns != null && ns === speedBest[i] })),
  })),
  payloadBytes: libs.map((lib) => ({ lib: lib.name, bytes: lib.stringify(speedPayload).length })),
};

const data = {
  meta: {
    generatedAt,
    superjson: sjVersion,
    package: PKG,
    regenerate: 'bun benchmarks/serialization.mjs',
  },
  accuracy: {
    types: accCases.map(([t]) => t),
    libraries: libs.map(accuracyFor),
  },
  size,
  speed,
};
writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
process.stderr.write(`wrote ${OUT}\n`);
