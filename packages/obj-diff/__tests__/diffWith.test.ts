import { ObjectId } from "bson";
import { diffWith } from "../src";

describe("diffWith", () => {
  test("compare custom class object", () => {
    class Person {
      constructor(name) {
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

    expect(result[0].t).toBe(2);
    expect(result[0].p).toEqual(["person"]);
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
        p: ["desc"],
        t: 2,
        v: "The new article description.",
      },
    ]);
    
    result = diffWith(record1, record3, (a, b) => {
      if (a instanceof ObjectId && b instanceof ObjectId) {
        return a.toString() !== b.toString();
      }
    });
    expect(result[0].t).toBe(2);
    expect(result[0].p).toEqual(["_id"]);
  });
});
