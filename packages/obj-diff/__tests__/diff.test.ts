import { diff } from "../src";

describe("diff", () => {
  test("no params", () => {
    expect(diff()).toEqual([]);
  });

  test("same type of non objects", () => {
    expect(diff(undefined, undefined)).toEqual([]);
    expect(diff(null, null)).toEqual([]);
    expect(diff(0, 0)).toEqual([]);
    expect(diff(1, 1)).toEqual([]);
    expect(diff(1n, 1n)).toEqual([]);
    expect(diff(NaN, NaN)).toEqual([]);
    expect(diff("a", "a")).toEqual([]);
    expect(diff("App", "Apples")).toEqual([
      {
        p: [],
        t: 2,
        v: "Apples",
      },
    ]);
    expect(diff(true, true)).toEqual([]);
    expect(diff(false, false)).toEqual([]);
    expect(diff(1000, NaN)).toEqual([{ t: 2, p: [], v: NaN }]);
  });

  test("different type of non objects", () => {
    expect(diff(undefined, null)).toEqual([{ t: 2, p: [], v: null }]);
    expect(diff(1, "1")).toEqual([{ t: 2, p: [], v: "1" }]);
    expect(diff(1, true)).toEqual([{ t: 2, p: [], v: true }]);
  });

  test("empty objects", () => {
    expect(diff([], [])).toEqual([]);
    expect(diff({}, {})).toEqual([]);
    expect(diff(Object.create(null), Object.create(null))).toEqual([]);
  });

  test("array", () => {
    expect(diff([], [1])).toEqual([{ t: 1, p: [0], v: 1 }]);
    expect(diff([1], [2])).toEqual([{ t: 2, p: [0], v: 2 }]);
    expect(diff([1], [])).toEqual([{ t: 0, p: [0] }]);
    expect(diff([1, 2, 3], [1, 2, 3, 4, 5])).toEqual([
      {
        p: [3],
        t: 1,
        v: 4,
      },
      {
        p: [4],
        t: 1,
        v: 5,
      },
    ]);
    expect(diff([1, 2, 3, 4, 5], [1, 3, 5])).toEqual([
      {
        p: [1],
        t: 2,
        v: 3,
      },
      {
        p: [2],
        t: 2,
        v: 5,
      },
      {
        p: [3],
        t: 0,
      },
      {
        p: [4],
        t: 0,
      },
    ]);
  });

  test("array deep", () => {
    expect(diff([1, 2, [3], 4, 5], [1, 2, [4], 4, 5])).toEqual([
      {
        p: [2, 0],
        t: 2,
        v: 4,
      },
    ]);

    expect(
      diff([1, 2, [3, 6, [1, 2, 3]], 4, 5], [1, 2, [3, 5, [7, 2]], 4, 5, 6])
    ).toEqual([
      {
        p: [2, 1],
        t: 2,
        v: 5,
      },
      {
        p: [2, 2, 0],
        t: 2,
        v: 7,
      },
      {
        p: [2, 2, 2],
        t: 0,
      },
      {
        p: [5],
        t: 1,
        v: 6,
      },
    ]);
  });

  test("objects", () => {
    expect(diff({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diff({ a: 1 }, { a: 2 })).toEqual([{ t: 2, p: ["a"], v: 2 }]);
    expect(diff({ a: 1 }, { a: 1, b: 2 })).toEqual([{ t: 1, p: ["b"], v: 2 }]);
    expect(diff({ a: 1 }, {})).toEqual([{ t: 0, p: ["a"] }]);
    expect(diff({ a: 1, b: 2 }, { a: 2, c: 5 })).toEqual([
      {
        p: ["a"],
        t: 2,
        v: 2,
      },
      {
        p: ["b"],
        t: 0,
      },
      {
        p: ["c"],
        t: 1,
        v: 5,
      },
    ]);
  });

  test("deep objects", () => {
    const lhs = {
      foo: {
        bar: {
          a: ["a", "b"],
          b: 2,
          c: ["x", "y"],
          e: 100, // deleted
        },
      },
      buzz: "world",
    };

    const rhs = {
      foo: {
        bar: {
          a: ["a"], // index 1 ('b')  deleted
          b: 2, // unchanged
          c: ["x", "y", "z"], // 'z' added
          d: "Hello, world!", // added
        },
      },
      buzz: "fizz", // updated
    };

    expect(diff(lhs, rhs)).toEqual([
      {
        p: ["foo", "bar", "a", 1],
        t: 0,
      },
      {
        p: ["foo", "bar", "c", 2],
        t: 1,
        v: "z",
      },
      {
        p: ["foo", "bar", "e"],
        t: 0,
      },
      {
        p: ["foo", "bar", "d"],
        t: 1,
        v: "Hello, world!",
      },
      {
        p: ["buzz"],
        t: 2,
        v: "fizz",
      },
    ]);
  });
});
