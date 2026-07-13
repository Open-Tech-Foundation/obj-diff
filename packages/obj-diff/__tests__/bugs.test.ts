import { diff, patch } from "./utils";

describe("bug fixes", () => {
  test("asymmetrical circular reference", () => {
    const a: any = { id: 1 };
    a.self = a;
    const b: any = { id: 1, self: { id: 2 } };
    
    const d = diff(a, b);
    expect(d.length).toBeGreaterThan(0);
    const patched = patch(a, d);
    expect(patched.self.id).toBe(2);
  });

  test("unhandled object types (RegExp, Error) fallback", () => {
    const a = { regex: /foo/g, err: new Error("a") };
    const b = { regex: /bar/g, err: new Error("b") };
    
    const d = diff(a, b);
    expect(d.length).toBe(2);
    expect(d[0].path).toEqual(["regex"]);
    expect(d[1].path).toEqual(["err"]);
    
    const patched = patch(a, d);
    expect(patched.regex).toEqual(/bar/g);
    expect(patched.err).toEqual(b.err);
  });

  test("Set traversal in patch", () => {
    const a = new Set([{ id: 1 }]);
    const b = new Set([{ id: 2 }]);
    
    const d = diff(a, b);
    const patched = patch(a, d);
    expect([...patched][0]).toEqual({ id: 2 });
  });

  test("packSparseArrays inside Map and Set", () => {
    const aMap = new Map();
    aMap.set("arr", [1, 2, 3]);
    const bMap = new Map();
    bMap.set("arr", [1, 3]);
    
    const dMap = diff(aMap, bMap);
    const patchedMap = patch(aMap, dMap);
    expect(patchedMap.get("arr")).toEqual([1, 3]);

    const aSet = new Set([[1, 2, 3]]);
    const bSet = new Set([[1, 3]]);
    
    const dSet = diff(aSet, bSet);
    const patchedSet = patch(aSet, dSet);
    expect([...patchedSet][0]).toEqual([1, 3]);
  });
});
