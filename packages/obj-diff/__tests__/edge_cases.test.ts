import { diff, patch } from "./utils";
import { clone } from "@opentf/std";

describe("edge cases", () => {
  describe("Arrays", () => {
    test("sparse arrays (holes)", () => {
      const a = [1, , 3];
      const b = [1, 2, 3];
      const d = diff(a, b);
      expect(d).toEqual([{ type: 1, path: [1], value: 2 }]);
      expect(patch(a, d)).toEqual(b);
    });

    test("array length truncation", () => {
      const a = [1, 2, 3, 4, 5];
      const b = [1, 2];
      const d = diff(a, b);
      // Current implementation might produce multiple deletions
      expect(patch(a, d)).toEqual(b);
    });

    test("patching to a sparse target preserves interior holes", () => {
      const a = [1, 2, 3];
      const b = [1, , 3];
      const res = patch(a, diff(a, b));
      expect(res.length).toBe(3);
      expect(1 in res).toBe(false);
      expect(res[0]).toBe(1);
      expect(res[2]).toBe(3);
    });

    test("untouched sparse arrays are not compacted", () => {
      const a = { arr: [1, , 3], x: 1 };
      const b = { arr: [1, , 3], x: 2 };
      const res = patch(a, diff(a, b));
      expect(res.x).toBe(2);
      expect(res.arr.length).toBe(3);
      expect(1 in res.arr).toBe(false);
    });

    test("patch does not mutate the target object's arrays", () => {
      const b = { a: [1, , 3] };
      patch({}, diff({}, b));
      expect(b.a.length).toBe(3);
      expect(1 in b.a).toBe(false);
    });

    test("array with non-index properties", () => {
      const a: any = [1];
      a.foo = "bar";
      const b: any = [1];
      b.foo = "baz";
      const d = diff(a, b);
      expect(d).toEqual([{ type: 2, path: ["foo"], value: "baz" }]);
      expect(patch(a, d)).toEqual(b);
    });
  });

  describe("Circular References & Shared State", () => {
    test("deeply nested circular reference", () => {
      const a: any = { node: { id: 1 } };
      a.node.parent = a;
      const b: any = { node: { id: 2 } };
      b.node.parent = b;
      
      const d = diff(a, b);
      // It should only diff the 'id' and not infinite loop
      expect(d).toEqual([{ type: 2, path: ["node", "id"], value: 2 }]);
      
      const res = patch(a, d);
      expect(res.node.id).toBe(2);
      expect(res.node.parent).toBe(res);
    });

    test("shared instance across different paths (aliasing preservation)", () => {
      const shared = { x: 1 };
      const a = { first: shared, second: shared };
      const b = { first: { x: 1 }, second: { x: 2 } };
      
      const d = diff(a, b);
      const res = patch(a, d);
      
      // Documented behavior: sharing is preserved, so mutating 'second' affects 'first'
      expect(res.first.x).toBe(2);
      expect(res.second.x).toBe(2);
    });
  });

  describe("Object Prototypes", () => {
    test("objects with null prototype", () => {
      const a = Object.create(null);
      a.x = 1;
      const b = Object.create(null);
      b.x = 2;
      
      const d = diff(a, b);
      expect(d).toEqual([{ type: 2, path: ["x"], value: 2 }]);
      const res = patch(a, d);
      expect(Object.getPrototypeOf(res)).toBeNull();
      expect(res.x).toBe(2);
    });
  });

  describe("Deep Nesting Stress Test", () => {
    test("100 levels of nesting", () => {
      const createDeep = (levels: number, val: any) => {
        let obj: any = val;
        for (let i = 0; i < levels; i++) {
          obj = { child: obj };
        }
        return obj;
      };

      const a = createDeep(100, { x: 1 });
      const b = createDeep(100, { x: 2 });
      
      const d = diff(a, b);
      expect(d.length).toBe(1);
      expect(patch(a, d)).toEqual(b);
    });
  });

  describe("Identity Swaps", () => {
    test("swapping two objects in an array", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const a = [obj1, obj2];
      const b = [obj2, obj1];
      
      const d = diff(a, b);
      expect(patch(a, d)).toEqual(b);
    });
  });
});
