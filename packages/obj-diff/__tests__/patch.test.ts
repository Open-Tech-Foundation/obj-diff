import { diff, patch } from "../src";

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
});
