import { diff, patch } from "./utils";

describe("patch", () => {
  test("simple objects", () => {
    const a = { a: 1, b: 2 };
    const b = { a: 2, c: 3 };
    expect(patch(a, diff(a, b))).toEqual(b);
  });

  test("simple arrays", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [1, 3, 5];
    expect(patch(a, diff(a, b))).toEqual(b);
  });

  test("deep objects", () => {
    const a = {
      foo: {
        bar: {
          a: ["a", "b"],
          b: 2,
          c: ["x", "y"],
          e: 100,
        },
      },
      buzz: "world",
    };

    const b = {
      foo: {
        bar: {
          a: ["a"],
          b: 2,
          c: ["x", "y", "z"],
          d: "Hello, world!",
        },
      },
      buzz: "fizz",
    };
    expect(patch(a, diff(a, b))).toEqual(b);
  });

  test("Dates", () => {
    const a = { d: new Date("2024-01-01") };
    const b = { d: new Date("2024-01-02") };
    expect(patch(a, diff(a, b))).toEqual(b);
  });

  test("Maps", () => {
    const a = { m: new Map([["x", 1]]) };
    const b = { m: new Map([["x", 2], ["y", 3]]) };
    expect(patch(a, diff(a, b))).toEqual(b);
  });

  test("Sets", () => {
    const a = { s: new Set([1, 2]) };
    const b = { s: new Set([2, 3]) };
    expect(patch(a, diff(a, b))).toEqual(b);
  });

  test("Maps with object keys", () => {
    const key = { id: 1 };

    // Changed value under an object key
    const a = new Map([[key, "a"]]);
    const b = new Map([[key, "b"]]);
    const res = patch(a, diff(a, b));
    expect(res.size).toBe(1);
    expect([...res.entries()]).toEqual([[{ id: 1 }, "b"]]);

    // Deleted entry with an object key
    const c = new Map<unknown, unknown>([
      [key, "a"],
      ["x", 1],
    ]);
    const d = new Map<unknown, unknown>([["x", 1]]);
    const resDel = patch(c, diff(c, d));
    expect(resDel.size).toBe(1);
    expect(resDel.get("x")).toBe(1);

    // Deep change below an object key
    const e = new Map([[key, { v: 1 }]]);
    const f = new Map([[key, { v: 2 }]]);
    const resDeep = patch(e, diff(e, f));
    expect(resDeep.size).toBe(1);
    expect([...resDeep.values()]).toEqual([{ v: 2 }]);
  });

  test("Sets shrinking by multiple elements", () => {
    const a = new Set([1, 2, 3, 4]);
    const b = new Set([1, 2]);
    expect(patch(a, diff(a, b))).toEqual(b);

    const c = { s: new Set([1, 2, 3]) };
    const d = { s: new Set([1]) };
    expect(patch(c, diff(c, d))).toEqual(d);

    const e = new Set([1, 2, 3]);
    const f = new Set();
    expect(patch(e, diff(e, f))).toEqual(f);

    const g = new Set([{ a: 1 }, 5, 6]);
    const h = new Set([{ a: 2 }]);
    expect(patch(g, diff(g, h))).toEqual(h);
  });

  test("ArrayBuffer", () => {
    const a = { buf: new Uint8Array([1, 2, 3]).buffer };
    const b = { buf: new Uint8Array([1, 9, 3]).buffer };
    const res = patch(a, diff(a, b));
    expect(res.buf).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(res.buf)]).toEqual([1, 9, 3]);
  });

  test("class instances", () => {
    class Point {
      x: number;
      y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
    }

    const a = { p: new Point(1, 2) };
    const b = { p: new Point(1, 5) };
    const res = patch(a, diff(a, b));
    expect(res.p).toBeInstanceOf(Point);
    expect(res.p.y).toBe(5);
  });

  test("invalid patch paths throw descriptive errors", () => {
    expect(() =>
      patch({ a: 1 }, [{ type: 2, path: ["missing", "deep"], value: 1 }]),
    ).toThrow('patch: invalid path "missing.deep" — "missing" is not an object');

    expect(() => patch({ a: 1 }, [{ type: 2, path: ["a", "b"], value: 1 }])).toThrow(
      'patch: invalid path "a.b" — "a" is not an object',
    );

    expect(() => patch(5, [{ type: 2, path: ["a"], value: 1 }])).toThrow(
      "the patched object is not an object",
    );
  });

  test("TypedArray", () => {
    const a = { t: new Uint8Array([1, 2, 3]) };
    const b = { t: new Uint8Array([1, 4, 3]) };
    expect(patch(a, diff(a, b))).toEqual(b);

    const c = { t: new Uint8Array([1, 2, 3]) };
    const d = { t: new Uint8Array([1, 2, 3, 4]) };
    expect(patch(c, diff(c, d))).toEqual(d);

    const e = { t: new Int8Array([1, 2, 3]) };
    const f = { t: new Uint8Array([1, 2, 3]) };
    expect(patch(e, diff(e, f))).toEqual(f);
  });
});

