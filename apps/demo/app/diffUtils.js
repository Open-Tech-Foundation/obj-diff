import { diff, patch } from "@opentf/obj-diff";
import { strReplace, isTypedArray } from "@opentf/std";

export const scenarios = [
  {
    id: "profile",
    label: "Profile update",
    detail: "Nested values and arrays",
    before: `{
  user: { id: 42, name: 'Ari', role: 'viewer' },
  teams: ['platform', 'docs'],
  flags: { beta: false }
}`,
    after: `{
  user: { id: 42, name: 'Ari', role: 'admin' },
  teams: ['platform', 'design', 'docs'],
  flags: { beta: true },
  lastSeen: new Date('2026-07-15')
}`,
  },
  {
    id: "collections",
    label: "Native collections",
    detail: "Map, Set, Date, BigInt, TypedArray",
    before: `{
  inventory: new Map([['tea', 4], ['coffee', 8]]),
  tags: new Set(['stable', 'public']),
  released: new Date('2025-01-01'),
  downloads: 9007199254740993n,
  buffer: new Uint8Array([1, 2, 3])
}`,
    after: `{
  inventory: new Map([['tea', 2], ['coffee', 8], ['cocoa', 3]]),
  tags: new Set(['stable', 'featured']),
  released: new Date('2026-07-15'),
  downloads: 9007199254741993n,
  buffer: new Uint8Array([1, 4, 3])
}`,
  },
  {
    id: "sparse",
    label: "Sparse arrays",
    detail: "Holes and nested structures",
    before: `{
  queue: [, { id: 'a', state: 'waiting' }, , 'done'],
  retries: [0, 1, 1]
}`,
    after: `{
  queue: [, { id: 'a', state: 'running' }, { id: 'b' }, 'done'],
  retries: [0, 2, 1]
}`,
  },
  {
    id: "circular",
    label: "Circular objects",
    detail: "Cycle-safe comparison",
    before: `(() => { const item = { id: 1, status: 'draft' }; item.self = item; return item; })()`,
    after: `(() => { const item = { id: 1, status: 'published' }; item.self = item; return item; })()`,
  },
];

export function replacer(key, value) {
  if (typeof value === "bigint") return `__INTERNAL__BIGINT__${value}n`;
  if (value === undefined) return `__INTERNAL__UNDEFINED`;
  if (value instanceof Map) return `Map(${value.size}) ${JSON.stringify(Array.from(value))}`;
  if (value instanceof Set) return `Set(${value.size}) ${JSON.stringify(Array.from(value))}`;
  if (isTypedArray(value)) return `${value.constructor.name}(${value.length}) ${JSON.stringify(Array.from(value))}`;
  return value;
}

export function getDiffResults(diffResult) {
  if (!diffResult) return "";
  let out = JSON.stringify(diffResult, replacer, 4);
  out = strReplace(out, `"__INTERNAL__UNDEFINED"`, "undefined", { all: true });
  const test = /"__INTERNAL__BIGINT__(\d+)n"/;
  function convert(str, p1) { return `${p1}n`; }
  out = strReplace(out, test, convert, { all: true });
  return out;
}

export const OP_META = {
  0: { label: "Deleted", kind: "removed", hasValue: false },
  1: { label: "Added", kind: "added", hasValue: true },
  2: { label: "Changed", kind: "changed", hasValue: true },
  3: { label: "Inserted", kind: "added", hasValue: true },
  4: { label: "Removed", kind: "removed", hasValue: false },
};

export function opMeta(type) {
  return OP_META[type] || OP_META[2];
}

export function formatValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (isTypedArray(value)) return `${value.constructor.name}(${value.length})`;
  if (typeof value === "string") return `“${value}”`;
  if (value && typeof value === "object") return Array.isArray(value) ? `Array(${value.length})` : "Object";
  return String(value);
}

export function formatPath(path) {
  if (!path || path.length === 0) return "root";
  return path.map((part) => typeof part === "number" ? `[${part}]` : `.${part}`).join("").replace(/^\./, "");
}

export const MISSING = Symbol("missing");

export function isContainer(v) {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return true;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

export function eqNodes(a, b) {
  try { return diff(a, b).length === 0; } catch (e) { return a === b; }
}

export function leafText(v) { return formatValue(v); }

export function arrayPairs(a, b) {
  const n = a.length, m = b.length;
  let lo = 0;
  while (lo < n && lo < m && eqNodes(a[lo], b[lo])) lo++;
  let hiA = n, hiB = m;
  while (hiA > lo && hiB > lo && eqNodes(a[hiA - 1], b[hiB - 1])) { hiA--; hiB--; }

  const pairs = [];
  for (let i = 0; i < lo; i++) pairs.push([a[i], b[i]]);

  const midA = a.slice(lo, hiA), midB = b.slice(lo, hiB);
  const p = midA.length, q = midB.length;
  if (p === q) {
    for (let i = 0; i < p; i++) pairs.push([midA[i], midB[i]]);
  } else if (p === 0) {
    for (let i = 0; i < q; i++) pairs.push([MISSING, midB[i]]);
  } else if (q === 0) {
    for (let i = 0; i < p; i++) pairs.push([midA[i], MISSING]);
  } else if (p * q > 4000) {
    const k = Math.max(p, q);
    for (let i = 0; i < k; i++) pairs.push([i < p ? midA[i] : MISSING, i < q ? midB[i] : MISSING]);
  } else {
    const dp = Array.from({ length: p + 1 }, () => new Array(q + 1).fill(0));
    for (let i = p - 1; i >= 0; i--)
      for (let j = q - 1; j >= 0; j--)
        dp[i][j] = eqNodes(midA[i], midB[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const raw = [];
    let i = 0, j = 0;
    while (i < p && j < q) {
      if (eqNodes(midA[i], midB[j])) { raw.push([midA[i], midB[j]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { raw.push([midA[i], MISSING]); i++; }
      else { raw.push([MISSING, midB[j]]); j++; }
    }
    while (i < p) { raw.push([midA[i], MISSING]); i++; }
    while (j < q) { raw.push([MISSING, midB[j]]); j++; }
    for (let k = 0; k < raw.length; k++) {
      const cur = raw[k], nxt = raw[k + 1];
      if (nxt && cur[1] === MISSING && nxt[0] === MISSING) { pairs.push([cur[0], nxt[1]]); k++; }
      else if (nxt && cur[0] === MISSING && nxt[1] === MISSING) { pairs.push([nxt[0], cur[1]]); k++; }
      else pairs.push(cur);
    }
  }

  const s = n - hiA;
  for (let k = 0; k < s; k++) pairs.push([a[hiA + k], b[hiB + k]]);
  return pairs;
}

export function walkDiff(a, b, key, depth, out, seen) {
  const aMiss = a === MISSING, bMiss = b === MISSING;
  const status = aMiss ? "added" : bMiss ? "deleted" : (eqNodes(a, b) ? "same" : "changed");
  const present = bMiss ? a : b;
  const bothSameKind = !aMiss && !bMiss && isContainer(a) && isContainer(b) && Array.isArray(a) === Array.isArray(b);
  const container = ((status === "added" || status === "deleted") && isContainer(present)) || ((status === "same" || status === "changed") && bothSameKind);

  if (container) {
    if ((!aMiss && seen.has(a)) || (!bMiss && seen.has(b))) {
      out.push({ depth, key, status: status === "changed" ? "same" : status, kind: "leaf", text: "[Circular]" });
      return;
    }
    if (!aMiss) seen.add(a);
    if (!bMiss) seen.add(b);
    const arr = Array.isArray(present);
    const braceStatus = status === "changed" ? "same" : status;
    out.push({ depth, key, status: braceStatus, kind: "open", text: arr ? "[" : "{" });
    if (arr) {
      const pairs = arrayPairs(aMiss ? [] : a, bMiss ? [] : b);
      for (const [av, bv] of pairs) walkDiff(av, bv, null, depth + 1, out, seen);
    } else {
      const keys = [], seenK = new Set();
      if (!bMiss) for (const k of Object.keys(b)) { keys.push(k); seenK.add(k); }
      if (!aMiss) for (const k of Object.keys(a)) if (!seenK.has(k)) keys.push(k);
      for (const k of keys) {
        const av = aMiss || !Object.prototype.hasOwnProperty.call(a, k) ? MISSING : a[k];
        const bv = bMiss || !Object.prototype.hasOwnProperty.call(b, k) ? MISSING : b[k];
        walkDiff(av, bv, k, depth + 1, out, seen);
      }
    }
    out.push({ depth, status: braceStatus, kind: "close", text: arr ? "]" : "}" });
    if (!aMiss) seen.delete(a);
    if (!bMiss) seen.delete(b);
    return;
  }

  if (status === "same") out.push({ depth, key, status: "same", kind: "leaf", text: leafText(b) });
  else if (status === "added") out.push({ depth, key, status: "added", kind: "leaf", text: leafText(b) });
  else if (status === "deleted") out.push({ depth, key, status: "deleted", kind: "leaf", text: leafText(a) });
  else if (isContainer(a) || isContainer(b)) {
    const oldRows = [], newRows = [];
    walkDiff(a, MISSING, key, depth, oldRows, seen);
    walkDiff(MISSING, b, key, depth, newRows, seen);
    oldRows.forEach((r, i) => { r.status = "cold"; if (i === 0) r.head = true; out.push(r); });
    newRows.forEach((r) => { r.status = "cnew"; out.push(r); });
  }
  else out.push({ depth, key, status: "changed", kind: "change", oldText: leafText(a), newText: leafText(b) });
}

export function buildDiffRows(a, b) {
  const rows = [];
  try { walkDiff(a, b, undefined, 0, rows, new Set()); } catch (e) { return []; }
  return rows;
}

export function diffKey(k) { return (k === undefined || k === null) ? "" : `${k}: `; }

export function diffMark(status) { return status === "added" ? "+" : status === "deleted" ? "−" : status === "changed" ? "*" : ""; }

export function safeEval(code) {
  try {
    return new Function(`return ${code}`)();
  } catch (e) {
    return null;
  }
}

export function getDiff(a, b) {
  if (!a || !b) return [];
  try { return diff(a, b); } catch (e) { return []; }
}

export function getPatch(code, d) {
  if (!code || !d || d.length === 0) return null;
  try { return patch(safeEval(code), d); } catch (e) { return null; }
}
