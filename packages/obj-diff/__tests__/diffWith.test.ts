import { ObjectId } from "bson";
import { diffWith } from "./utils";

describe("diffWith", () => {
  test("compare custom class object", () => {
    class Person {
      _id: string;
      name: string;
      constructor(name: string) {
        this._id = Math.random().toString().slice(2);
        this.name = name;
      }

      toString() {
        return `Person<${this._id}>`;
      }
    }

    const p1 = new Person("x");
    const p2 = new Person("x");
    const obj1 = {
      person: p1,
    };
    const obj2 = {
      person: p2,
    };

    const result = diffWith(obj1, obj2, (a, b) => {
      if (a instanceof Person && b instanceof Person) {
        return a._id !== b._id;
      }
    });

    expect(result[0].type).toBe(2);
    expect(result[0].path).toEqual(["person"]);
  });

  test("bson ObjectId", () => {
    const _id = new ObjectId();
    const record1 = {
      _id: _id,
      title: "Article 1",
      desc: "The article description.",
    };

    const record2 = {
      _id: _id,
      title: "Article 1",
      desc: "The new article description.",
    };

    const record3 = {
      _id: new ObjectId(),
      title: "Article 1",
      desc: "The article 3 description.",
    };

    let result = diffWith(record1, record2, (a, b) => {
      if (a instanceof ObjectId && b instanceof ObjectId) {
        return a.toString() !== b.toString();
      }
    });
    
    expect(result).toEqual([
      {
        path: ["desc"],
        type: 2,
        value: "The new article description.",
      },
    ]);
    
    result = diffWith(record1, record3, (a, b) => {
      if (a instanceof ObjectId && b instanceof ObjectId) {
        return a.toString() !== b.toString();
      }
    });
    expect(result[0].type).toBe(2);
    expect(result[0].path).toEqual(["_id"]);
  });

  test("explicit equality using false", () => {
    const a = { obj: { x: 1, y: 2 } };
    const b = { obj: { x: 1, y: 3 } }; // 'y' is different

    // Without custom comparator, it should detect a change in 'y'
    expect(diffWith(a, b, () => undefined)).toEqual([
      { type: 2, path: ["obj", "y"], value: 3 },
    ]);

    // With custom comparator returning false, it should treat 'obj' as equal
    const result = diffWith(a, b, (val1, val2) => {
      if ((val1 as any).x === 1 && (val2 as any).x === 1) {
        return false;
      }
    });

    expect(result).toEqual([]);
  });
});
