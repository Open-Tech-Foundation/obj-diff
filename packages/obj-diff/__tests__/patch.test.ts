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

