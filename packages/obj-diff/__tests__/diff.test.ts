import { clone } from "@opentf/std";
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

  test("compare object with null", () => {
    expect(diff({}, null)).toEqual([{ t: 2, p: [], v: null }]);
    expect(diff(null, { a: 1 })).toEqual([{ t: 2, p: [], v: { a: 1 } }]);
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
        p: ["date"],
        t: 2,
        v: new Date("2024-01-02"),
      },
    ]);
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
    expect(diff({ a: undefined }, { a: undefined })).toEqual([]);
    expect(diff({ a: undefined }, {})).toEqual([{ t: 0, p: ["a"] }]);
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
        p: ["description"],
        t: 2,
        v: "Style and speed. Stand out on.",
      },
      {
        p: ["price"],
        t: 2,
        v: 1599,
      },
      {
        p: ["stock", "count"],
        t: 2,
        v: 18,
      },
      {
        p: ["resources", "images", "items", 4],
        t: 0,
      },
      {
        p: ["updatedAt"],
        t: 2,
        v: new Date("2024-01-03"),
      },
    ]);
  });

  test("circular refs", () => {
    let obj1 = {
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
        p: ["self"],
        t: 2,
        v: null,
      },
    ]);

    const tmp = { a: 1 };
    obj1 = { a: { tmp }, b: { tmp } };
    obj2 = structuredClone(obj1);
    obj2.a.tmp.b = 2;

    expect(diff(obj1, obj2)).toEqual([
      {
        p: ["a", "tmp", "b"],
        t: 1,
        v: 2,
      },
      {
        p: ["b", "tmp", "b"],
        t: 1,
        v: 2,
      },
    ]);

    obj1 = { a: { b: 2, c: [1, 2, 3] } };
    obj1.b = obj1;
    obj2 = { a: { b: 2, c: [1, 5, 3] } };
    obj2.b = obj2;
    expect(diff(obj1, obj2)).toEqual([
      {
        p: ["a", "c", 1],
        t: 2,
        v: 5,
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
        p: ["m", "z"],
        t: 1,
        v: 3,
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
        t: 2,
        p: ["m", "x"],
        v: 5,
      },
    ]);
  });

  test("Set", () => {
    let a = { s: new Set([1, 2, 3]) };
    let b = { s: new Set([1, 2, 3]) };
    expect(diff(a, b)).toEqual([]);

    a = { s: new Set([1, 2, 3]) };
    b = { s: new Set([1, 2, 3, 4]) };
    expect(diff(a, b)).toEqual([{ t: 1, p: ["s", 3], v: 4 }]);

    a = { s: new Set([1, 3, 5, 2, 4]) };
    b = { s: new Set([1, 2, 3]) };
    expect(diff(a, b)).toEqual([
      {
        p: ["s", 1],
        t: 2,
        v: 2,
      },
      {
        p: ["s", 2],
        t: 2,
        v: 3,
      },
      {
        p: ["s", 3],
        t: 0,
      },
      {
        p: ["s", 4],
        t: 0,
      },
    ]);
  });

  test("mix objects", () => {
    const a = {
      m: new Map([[1, 2]]),
    };
    const b = {
      m: new Set([1]),
    };

    expect(diff(a, b)).toEqual([{ t: 2, p: ["m"], v: new Set([1]) }]);
  });

  test("multiple references to the same object", () => {
    const array = [1];
    const a = { test1: array, test2: array };
    const b = clone(a);
    b.test1.push(2);
    expect(diff(a, b)).toEqual([
      {
        p: ["test1", 1],
        t: 1,
        v: 2,
      },
      {
        p: ["test2", 1],
        t: 1,
        v: 2,
      },
    ]);
  });
});
