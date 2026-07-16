import { clone } from "@opentf/std";
import { diff, diffWith, patch } from "./utils";

describe("diff", () => {
  test("no params", () => {
    // @ts-ignore
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
        path: [],
        type: 2,
        value: "Apples",
      },
    ]);
    expect(diff(true, true)).toEqual([]);
    expect(diff(false, false)).toEqual([]);
    expect(diff(1000, NaN)).toEqual([{ type: 2, path: [], value: NaN }]);
  });

  test("different type of non objects", () => {
    expect(diff(undefined, null)).toEqual([{ type: 2, path: [], value: null }]);
    expect(diff(1, "1")).toEqual([{ type: 2, path: [], value: "1" }]);
    expect(diff(1, true)).toEqual([{ type: 2, path: [], value: true }]);
  });

  test("compare object with null", () => {
    expect(diff({}, null)).toEqual([{ type: 2, path: [], value: null }]);
    expect(diff(null, { a: 1 })).toEqual([{ type: 2, path: [], value: { a: 1 } }]);
  });

  test("empty objects", () => {
    expect(diff([], [])).toEqual([]);
    expect(diff({}, {})).toEqual([]);
    expect(diff(Object.create(null), Object.create(null))).toEqual([]);
  });

  test("dates", () => {
    expect(
      diff({ date: new Date("2024-01-01") }, { date: new Date("2024-01-01") })
    ).toEqual([]);
    expect(
      diff({ date: new Date("2024-01-01") }, { date: new Date("2024-01-02") })
    ).toEqual([
      {
        path: ["date"],
        type: 2,
        value: new Date("2024-01-02"),
      },
    ]);

    // Two invalid dates are equal
    expect(diff(new Date(NaN), new Date(NaN))).toEqual([]);
    expect(diff({ d: new Date(NaN) }, { d: new Date("2024-01-01") })).toEqual([
      { type: 2, path: ["d"], value: new Date("2024-01-01") },
    ]);
  });

  test("array", () => {
    expect(diff([], [1])).toEqual([{ type: 3, path: [0], value: 1 }]);
    expect(diff([1], [2])).toEqual([{ type: 2, path: [0], value: 2 }]);
    expect(diff([1], [])).toEqual([{ type: 4, path: [0] }]);
    expect(diff([1, 2, 3], [1, 2, 3, 4, 5])).toEqual([
      {
        path: [3],
        type: 3,
        value: 4,
      },
      {
        path: [4],
        type: 3,
        value: 5,
      },
    ]);
    // Common prefix [1] and suffix [5] are trimmed; the middle window pairs
    // 2 -> 3 and splices out the two leftover elements (application-time indexes).
    expect(diff([1, 2, 3, 4, 5], [1, 3, 5])).toEqual([
      {
        path: [1],
        type: 2,
        value: 3,
      },
      {
        path: [2],
        type: 4,
      },
      {
        path: [2],
        type: 4,
      },
    ]);
    // Single insert in the middle of a large array is a single op
    expect(diff([1, 2, 3, 4, 5], [1, 2, 9, 3, 4, 5])).toEqual([
      { type: 3, path: [2], value: 9 },
    ]);
    // Single removal from the front is a single op
    expect(diff([1, 2, 3, 4, 5], [2, 3, 4, 5])).toEqual([{ type: 4, path: [0] }]);
  });

  test("array deep", () => {
    expect(diff([1, 2, [3], 4, 5], [1, 2, [4], 4, 5])).toEqual([
      {
        path: [2, 0],
        type: 2,
        value: 4,
      },
    ]);

    expect(
      diff([1, 2, [3, 6, [1, 2, 3]], 4, 5], [1, 2, [3, 5, [7, 2]], 4, 5, 6])
    ).toEqual([
      {
        path: [2, 1],
        type: 2,
        value: 5,
      },
      {
        path: [2, 2, 0],
        type: 2,
        value: 7,
      },
      {
        path: [2, 2, 2],
        type: 4,
      },
      {
        path: [5],
        type: 3,
        value: 6,
      },
    ]);
  });

  test("objects", () => {
    expect(diff({ a: undefined }, { a: undefined })).toEqual([]);
    expect(diff({ a: undefined }, {})).toEqual([{ type: 0, path: ["a"] }]);
    expect(diff({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diff({ a: 1 }, { a: 2 })).toEqual([{ type: 2, path: ["a"], value: 2 }]);
    expect(diff({ a: 1 }, { a: 1, b: 2 })).toEqual([{ type: 1, path: ["b"], value: 2 }]);
    expect(diff({ a: 1 }, {})).toEqual([{ type: 0, path: ["a"] }]);
    expect(diff({ a: 1, b: 2 }, { a: 2, c: 5 })).toEqual([
      {
        path: ["a"],
        type: 2,
        value: 2,
      },
      {
        path: ["b"],
        type: 0,
      },
      {
        path: ["c"],
        type: 1,
        value: 5,
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
        path: ["foo", "bar", "a", 1],
        type: 4,
      },
      {
        path: ["foo", "bar", "c", 2],
        type: 3,
        value: "z",
      },
      {
        path: ["foo", "bar", "e"],
        type: 0,
      },
      {
        path: ["foo", "bar", "d"],
        type: 1,
        value: "Hello, world!",
      },
      {
        path: ["buzz"],
        type: 2,
        value: "fizz",
      },
    ]);

    const obj1 = {
      id: 8,
      title: "Microsoft Surface Laptop 4",
      description: "Style and speed. Stand out on ...",
      price: 1499,
      discountPercentage: 10.23,
      rating: 4.43,
      stock: { inStock: true, count: 68 },
      brand: "Microsoft Surface",
      category: "laptops",
      resources: {
        images: {
          thumbnail: "https://cdn.dummyjson.com/product-images/8/thumbnail.jpg",
          items: [
            "https://cdn.dummyjson.com/product-images/8/1.jpg",
            "https://cdn.dummyjson.com/product-images/8/2.jpg",
            "https://cdn.dummyjson.com/product-images/8/3.jpg",
            "https://cdn.dummyjson.com/product-images/8/4.jpg",
            "https://cdn.dummyjson.com/product-images/8/thumbnail.jpg",
          ],
        },
      },
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    };

    const obj2 = {
      id: 8,
      title: "Microsoft Surface Laptop 4",
      description: "Style and speed. Stand out on.",
      price: 1599,
      discountPercentage: 10.23,
      rating: 4.43,
      stock: { inStock: true, count: 18 },
      brand: "Microsoft Surface",
      category: "laptops",
      resources: {
        images: {
          thumbnail: "https://cdn.dummyjson.com/product-images/8/thumbnail.jpg",
          items: [
            "https://cdn.dummyjson.com/product-images/8/1.jpg",
            "https://cdn.dummyjson.com/product-images/8/2.jpg",
            "https://cdn.dummyjson.com/product-images/8/3.jpg",
            "https://cdn.dummyjson.com/product-images/8/4.jpg",
          ],
        },
      },
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-03"),
    };

    expect(diff(obj1, obj2)).toEqual([
      {
        path: ["description"],
        type: 2,
        value: "Style and speed. Stand out on.",
      },
      {
        path: ["price"],
        type: 2,
        value: 1599,
      },
      {
        path: ["stock", "count"],
        type: 2,
        value: 18,
      },
      {
        path: ["resources", "images", "items", 4],
        type: 4,
      },
      {
        path: ["updatedAt"],
        type: 2,
        value: new Date("2024-01-03"),
      },
    ]);
  });

  test("circular refs", () => {
    let obj1: any = {
      a: 1,
    };
    obj1.self = obj1;
    let obj2 = structuredClone(obj1);
    expect(diff(obj1, obj2)).toEqual([]);

    obj1 = {
      a: 1,
    };
    obj1.self = obj1;
    obj2 = structuredClone(obj1);
    obj2.self = null;
    expect(diff(obj1, obj2)).toEqual([
      {
        path: ["self"],
        type: 2,
        value: null,
      },
    ]);

    const tmp: any = { a: 1 };
    obj1 = { a: { tmp }, b: { tmp } };
    obj2 = structuredClone(obj1);
    obj2.a.tmp.b = 2;

    expect(diff(obj1, obj2)).toEqual([
      {
        path: ["a", "tmp", "b"],
        type: 1,
        value: 2,
      },
      {
        path: ["b", "tmp", "b"],
        type: 1,
        value: 2,
      },
    ]);

    obj1 = { a: { b: 2, c: [1, 2, 3] } };
    obj1.b = obj1;
    obj2 = { a: { b: 2, c: [1, 5, 3] } };
    obj2.b = obj2;
    expect(diff(obj1, obj2)).toEqual([
      {
        path: ["a", "c", 1],
        type: 2,
        value: 5,
      },
    ]);
  });

  test("Map", () => {
    expect(
      diff(
        {
          m: new Map([
            ["x", 1],
            ["y", 2],
          ]),
        },
        {
          m: new Map([
            ["x", 1],
            ["y", 2],
          ]),
        }
      )
    ).toEqual([]);

    expect(
      diff(
        {
          m: new Map([
            ["x", 1],
            ["y", 2],
          ]),
        },
        {
          m: new Map([
            ["x", 1],
            ["y", 2],
            ["z", 3],
          ]),
        }
      )
    ).toEqual([
      {
        path: ["m", "z"],
        type: 1,
        value: 3,
      },
    ]);

    expect(
      diff(
        {
          m: new Map([
            ["x", 1],
            ["y", 2],
          ]),
        },
        {
          m: new Map([
            ["x", 5],
            ["y", 2],
          ]),
        }
      )
    ).toEqual([
      {
        type: 2,
        path: ["m", "x"],
        value: 5,
      },
    ]);
  });

  test("Set", () => {
    let a: any = { s: new Set([1, 2, 3]) };
    let b: any = { s: new Set([1, 2, 3]) };
    expect(diff(a, b)).toEqual([]);

    a = new Set([1, 2, 3]);
    b = new Set([1, 2, 3]);
    b.delete(1);
    b.delete(2);
    b.delete(3);
    b.add(3);
    b.add(2);
    b.add(1);

    expect(diff(a, b)).toEqual([
      { type: 2, path: [0], value: 3 },
      { type: 2, path: [2], value: 1 },
    ]);

    a = new Set([1, 2, 3]);
    b = clone(a);
    b.clear();
    const res = diff(a, b);
    // Deletions are emitted in descending index order so that patching
    // can remove elements sequentially without index shifting.
    expect(res).toEqual([
      {
        path: [2],
        type: 0,
        value: 3,
      },
      {
        path: [1],
        type: 0,
        value: 2,
      },
      {
        path: [0],
        type: 0,
        value: 1,
      },
    ]);

    a = { s: new Set([1, 2, 3]) };
    b = { s: new Set([1, 2, 3, 4]) };
    expect(diff(a, b)).toEqual([{ type: 1, path: ["s", 3], value: 4 }]);

    a = { s: new Set([1, 3, 5, 2, 4]) };
    b = { s: new Set([1, 2, 3]) };
    expect(diff(a, b)).toEqual([
      {
        path: ["s", 1],
        type: 2,
        value: 2,
      },
      {
        path: ["s", 2],
        type: 2,
        value: 3,
      },
      {
        path: ["s", 4],
        type: 0,
        value: 4,
      },
      {
        path: ["s", 3],
        type: 0,
        value: 2,
      },
    ]);
  });

  test("Errors", () => {
    expect(diff(new Error("a"), new Error("a"))).toEqual([]);
    expect(diff(new Error("a"), new Error("b"))).toEqual([
      { type: 2, path: [], value: new Error("b") },
    ]);

    // Same message but different custom properties
    const e1: any = new Error("same");
    e1.code = 1;
    const e2: any = new Error("same");
    e2.code = 2;
    expect(diff(e1, e2)).toEqual([{ type: 2, path: [], value: e2 }]);

    // Different error classes with the same message
    expect(diff(new TypeError("x"), new RangeError("x"))).toEqual([
      { type: 2, path: [], value: new RangeError("x") },
    ]);
  });

  test("boxed primitives", () => {
    expect(diff(new Number(1), new Number(1))).toEqual([]);
    expect(diff(new Number(1), new Number(2))).toEqual([
      { type: 2, path: [], value: new Number(2) },
    ]);
    expect(diff(new String("a"), new String("b"))).toEqual([
      { type: 2, path: [], value: new String("b") },
    ]);

    // Same boxed value but different custom properties
    const n1: any = new Number(1);
    n1.extra = "x";
    const n2: any = new Number(1);
    n2.extra = "y";
    expect(diff(n1, n2)).toEqual([{ type: 2, path: ["extra"], value: "y" }]);
  });

  test("ArrayBuffer and DataView", () => {
    const bufA = new Uint8Array([1, 2, 3]).buffer;
    const bufB = new Uint8Array([1, 2, 3]).buffer;
    const bufC = new Uint8Array([1, 9, 3]).buffer;

    expect(diff(bufA, bufB)).toEqual([]);
    expect(diff(bufA, bufC)).toEqual([{ type: 2, path: [], value: bufC }]);
    expect(diff({ b: bufA }, { b: bufC })).toEqual([{ type: 2, path: ["b"], value: bufC }]);

    // Different lengths
    expect(diff(bufA, new Uint8Array([1, 2]).buffer)).toHaveLength(1);

    const dvA = new DataView(bufA);
    const dvB = new DataView(bufB);
    const dvC = new DataView(bufC);
    expect(diff(dvA, dvB)).toEqual([]);
    expect(diff(dvA, dvC)).toEqual([{ type: 2, path: [], value: dvC }]);

    // Same buffer, different view windows
    const dvOffset = new DataView(bufA, 1);
    expect(diff(dvA, dvOffset)).toHaveLength(1);
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

    expect(diff(new Point(1, 2), new Point(1, 2))).toEqual([]);
    expect(diff(new Point(1, 2), new Point(1, 5))).toEqual([{ type: 2, path: ["y"], value: 5 }]);
    expect(diff({ p: new Point(1, 2) }, { p: new Point(3, 2) })).toEqual([
      { type: 2, path: ["p", "x"], value: 3 },
    ]);

    // Different prototypes are a whole-object replacement
    class Vector {
      x: number;
      y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
    }
    expect(diff(new Point(1, 2), new Vector(1, 2))).toEqual([
      { type: 2, path: [], value: new Vector(1, 2) },
    ]);
    expect(diff(new Point(1, 2), { x: 1, y: 2 })).toEqual([
      { type: 2, path: [], value: { x: 1, y: 2 } },
    ]);
  });

  test("same object reference is equal", () => {
    const shared = { a: 1, wm: new WeakMap() };
    expect(diff(shared, shared)).toEqual([]);
    expect(diff({ o: shared }, { o: shared })).toEqual([]);
  });

  test("mix objects", () => {
    const a = {
      m: new Map([[1, 2]]),
    };
    const b = {
      m: new Set([1]),
    };

    expect(diff(a, b)).toEqual([{ type: 2, path: ["m"], value: new Set([1]) }]);
  });

  test("multiple references to the same object", () => {
    const array = [1];
    const a = { test1: array, test2: array };
    const b = clone(a);
    b.test1.push(2);
    expect(diff(a, b)).toEqual([
      {
        path: ["test1", 1],
        type: 3,
        value: 2,
      },
      {
        path: ["test2", 1],
        type: 3,
        value: 2,
      },
    ]);
  });

  test("shared object swap", () => {
    const obj1 = { x: 1 };
    const obj2 = { x: 2 };
    const a = { foo: obj1, bar: obj2 };
    const b = { foo: obj2, bar: obj1 };
    expect(diff(a, b)).toEqual([
      { type: 2, path: ["foo", "x"], value: 2 },
      { type: 2, path: ["bar", "x"], value: 1 },
    ]);
  });

  test("TypedArray", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 4, 3]);
    expect(diff(a, b)).toEqual([
      { type: 2, path: [1], value: 4 },
    ]);

    const c = new Uint8Array([1, 2, 3]);
    const d = new Uint8Array([1, 2, 3, 4]);
    expect(diff(c, d)).toEqual([
      { type: 2, path: [], value: d },
    ]);

    const e = new Int8Array([1, 2, 3]);
    const f = new Uint8Array([1, 2, 3]);
    expect(diff(e, f)).toEqual([
      { type: 2, path: [], value: f },
    ]);
  });
});

