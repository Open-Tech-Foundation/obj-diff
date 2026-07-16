import assert from "node:assert";
import { clone } from "@opentf/std";
import { diff, patch } from "./utils";

/**
 * Property-based round-trip tests: for randomly generated values `a` and a
 * randomly edited copy `b`, `patch(a, diff(a, b))` must always deep-equal `b`.
 * The generator is seeded so failures are reproducible.
 */

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const int = (rng: Rng, max: number) => Math.floor(rng() * max);
const pick = <T>(rng: Rng, arr: T[]): T => arr[int(rng, arr.length)];

function genPrimitive(rng: Rng): unknown {
  return pick(rng, [0, 1, -1, 42, "a", "hello", true, false, null, undefined, NaN, 3.14]);
}

function genValue(rng: Rng, depth: number): unknown {
  if (depth <= 0 || rng() < 0.5) return genPrimitive(rng);
  if (rng() < 0.5) return genArray(rng, depth - 1);
  return genObject(rng, depth - 1);
}

function genArray(rng: Rng, depth: number): unknown[] {
  return Array.from({ length: int(rng, 10) }, () => genValue(rng, depth));
}

function genObject(rng: Rng, depth: number): Record<string, unknown> {
  const keys = ["a", "b", "c", "d", "e", "f"];
  const obj: Record<string, unknown> = {};
  for (const k of keys.slice(0, int(rng, keys.length) + 1)) {
    obj[k] = genValue(rng, depth);
  }
  return obj;
}

/** Applies a random mutation somewhere inside the value. */
function mutate(rng: Rng, val: unknown, depth = 3): void {
  if (Array.isArray(val)) {
    // Recurse half the time if possible
    if (depth > 0 && val.length > 0 && rng() < 0.4) {
      const target = val[int(rng, val.length)];
      if (target && typeof target === "object") return mutate(rng, target, depth - 1);
    }
    const op = int(rng, 5);
    const i = int(rng, val.length + 1);
    if (op === 0) val.splice(i, 0, genValue(rng, 1)); // insert
    else if (op === 1 && val.length > 0) val.splice(int(rng, val.length), 1); // remove
    else if (op === 2 && val.length > 0) val[int(rng, val.length)] = genValue(rng, 1); // replace
    else if (op === 3 && val.length > 1) {
      // swap two elements
      const x = int(rng, val.length);
      const y = int(rng, val.length);
      [val[x], val[y]] = [val[y], val[x]];
    } else val.push(genValue(rng, 1)); // append
    return;
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (depth > 0 && keys.length > 0 && rng() < 0.4) {
      const target = obj[pick(rng, keys)];
      if (target && typeof target === "object") return mutate(rng, target, depth - 1);
    }
    const op = int(rng, 3);
    if (op === 0 || keys.length === 0) obj[`k${int(rng, 5)}`] = genValue(rng, 1); // add
    else if (op === 1) delete obj[pick(rng, keys)]; // remove
    else obj[pick(rng, keys)] = genValue(rng, 1); // change
  }
}

describe("property-based round-trip", () => {
  test("random arrays with random edit scripts", () => {
    const rng = mulberry32(0xa11ce);
    for (let iter = 0; iter < 300; iter++) {
      const a = genArray(rng, 3);
      const b = clone(a);
      const edits = int(rng, 6) + 1;
      for (let e = 0; e < edits; e++) mutate(rng, b);

      const d = diff(a, b);
      assert.deepStrictEqual(
        patch(a, d),
        b,
        `roundtrip failed at iteration ${iter}\na=${JSON.stringify(a)}\nb=${JSON.stringify(b)}\nd=${JSON.stringify(d)}`,
      );
    }
  });

  test("random object trees with random edit scripts", () => {
    const rng = mulberry32(0xb0b);
    for (let iter = 0; iter < 200; iter++) {
      const a = genObject(rng, 3);
      const b = clone(a);
      const edits = int(rng, 6) + 1;
      for (let e = 0; e < edits; e++) mutate(rng, b);

      const d = diff(a, b);
      assert.deepStrictEqual(
        patch(a, d),
        b,
        `roundtrip failed at iteration ${iter}\na=${JSON.stringify(a)}\nb=${JSON.stringify(b)}\nd=${JSON.stringify(d)}`,
      );
    }
  });

  test("identical values always produce an empty diff", () => {
    const rng = mulberry32(0xcafe);
    for (let iter = 0; iter < 100; iter++) {
      const a = genValue(rng, 3);
      expect(diff(a, clone(a))).toEqual([]);
    }
  });
});
