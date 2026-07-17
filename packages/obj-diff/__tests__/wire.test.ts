import { Temporal } from "@js-temporal/polyfill";
import { deserialize, diff, patch, serialize } from "./utils";

// deserialize reconstructs Temporal values via a Temporal implementation on
// globalThis; the polyfill doesn't auto-install, so wire it up for the tests.
(globalThis as { Temporal?: unknown }).Temporal = Temporal;

/** serialize -> deserialize -> patch must reproduce `b` from `a`. */
function survivesWire(a: unknown, b: unknown): boolean {
  const wire = serialize(diff(a, b));
  if (typeof wire !== "string") return false;
  JSON.parse(wire); // must be valid JSON with no live objects
  const restored = deserialize(wire);
  return diff(patch(a, restored), b).length === 0;
}

describe("wire (serialize / deserialize)", () => {
  test("primitives, incl. undefined / NaN / ±Infinity / -0 / bigint", () => {
    expect(survivesWire({ a: 1 }, { a: 2, s: "x", t: true, n: null })).toBe(true);
    expect(survivesWire({}, { u: undefined })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: Number.NaN })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: Number.POSITIVE_INFINITY })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: Number.NEGATIVE_INFINITY })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: -0 })).toBe(true);
    expect(survivesWire({ x: 1n }, { x: 9007199254740993n })).toBe(true);
  });

  test("Date (valid and invalid)", () => {
    expect(survivesWire({ d: new Date(0) }, { d: new Date("2021-06-15T08:30:00Z") })).toBe(true);
    expect(survivesWire({ d: new Date(0) }, { d: new Date(Number.NaN) })).toBe(true);
  });

  test("RegExp", () => {
    expect(survivesWire({ r: /a/ }, { r: /foo\d+/giu })).toBe(true);
  });

  test("URL", () => {
    expect(survivesWire({ u: 1 }, { u: new URL("https://a.example/x?q=1#h") })).toBe(true);
    const restored = deserialize(serialize(diff({}, { u: new URL("https://a.example/p") })));
    expect(restored[0].value).toBeInstanceOf(URL);
    expect((restored[0].value as URL).href).toBe("https://a.example/p");
  });

  test("Map and Set", () => {
    expect(survivesWire({ m: new Map([["k", 1]]) }, { m: new Map([["k", 2], ["j", 3]]) })).toBe(true);
    expect(survivesWire({ s: new Set([1, 2]) }, { s: new Set([1, 2, 3]) })).toBe(true);
    // whole Map/Set as an added value (the case JSON silently drops)
    expect(survivesWire({}, { m: new Map([["k", 9]]), s: new Set([1, 2, 3]) })).toBe(true);
  });

  test("TypedArrays / ArrayBuffer / DataView (byte-exact, incl. NaN floats & bigint)", () => {
    expect(survivesWire({ x: new Uint8Array([1]) }, { x: new Uint8Array([1, 2, 3]) })).toBe(true);
    expect(survivesWire({ x: new Float64Array([0]) }, { x: new Float64Array([Number.NaN, Number.POSITIVE_INFINITY, -0]) })).toBe(true);
    expect(survivesWire({ x: new BigInt64Array([0n]) }, { x: new BigInt64Array([9007199254740993n]) })).toBe(true);
    const buf = new Uint8Array([9, 8, 7]).buffer;
    expect(survivesWire({}, { b: buf })).toBe(true);
    expect(survivesWire({}, { d: new DataView(new Uint8Array([1, 2, 3, 4]).buffer) })).toBe(true);
  });

  test("Error and standard subclasses (name, message, own props)", () => {
    const e = new TypeError("boom");
    (e as unknown as Record<string, unknown>).code = "E_BOOM";
    expect(survivesWire({}, { e })).toBe(true);
    expect(survivesWire({ e: new Error("a") }, { e: new RangeError("b") })).toBe(true);
  });

  test("boxed primitives", () => {
    // biome-ignore lint/complexity/useLiteralKeys: exercising boxed objects on purpose
    expect(survivesWire({ x: 1 }, { x: new Number(42) })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: new String("hi") })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: new Boolean(true) })).toBe(true);
  });

  test("Temporal (via globalThis.Temporal at decode)", () => {
    expect(survivesWire({ d: Temporal.PlainDate.from("2020-01-01") }, { d: Temporal.PlainDate.from("2021-06-15") })).toBe(true);
    expect(survivesWire({ z: Temporal.ZonedDateTime.from("2020-01-01T00:00[UTC]") }, { z: Temporal.ZonedDateTime.from("2021-06-15T08:30[America/New_York]") })).toBe(true);
    expect(survivesWire({ dur: Temporal.Duration.from({ hours: 2 }) }, { dur: Temporal.Duration.from({ minutes: 120 }) })).toBe(true);
  });

  test("deeply nested mix of special types", () => {
    const a = {};
    const b = {
      user: {
        joined: new Date("2020-01-01T00:00:00Z"),
        roles: new Set(["admin"]),
        prefs: new Map([["theme", "dark"]]),
        scores: new Float32Array([1.5, 2.5]),
        big: 123n,
        seen: [new Date(0), undefined],
      },
    };
    expect(survivesWire(a, b)).toBe(true);
  });

  test("encodes path elements, incl. object Map keys", () => {
    const k = { id: 1 };
    const d = diff(new Map([[k, 1]]), new Map([[k, 2]]));
    const restored = deserialize(serialize(d));
    expect(restored[0].type).toBe(2);
    expect(restored[0].path[0]).toEqual({ id: 1 });
    expect(restored[0].value).toBe(2);
  });

  test("plain objects with `_t`/`_v` keys pass through untouched", () => {
    // `_t`/`_v` only live inside $refs, so a user object using them is just data.
    expect(survivesWire({}, { data: { _t: "hello", n: 5 } })).toBe(true);
    const restored = deserialize(serialize(diff({}, { data: { _t: "x", _v: "y" } })));
    expect(restored[0].value).toEqual({ _t: "x", _v: "y" });
    expect(survivesWire({}, { data: { _t: "Date", _v: "not a date" } })).toBe(true);
  });

  test("escapes real strings that look like `@n` ref tokens", () => {
    expect(survivesWire({ x: 1 }, { x: "@1" })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: "@42 hello" })).toBe(true);
    expect(survivesWire({ x: 1 }, { x: "@@escaped" })).toBe(true);
    // a real "@1" string sitting next to an actual Date ref must stay a string
    const restored = deserialize(serialize(diff({}, { o: { a: "@1", b: new Date(0) } })));
    const value = restored[0].value as { a: unknown; b: unknown };
    expect(value.a).toBe("@1");
    expect(value.b).toBeInstanceOf(Date);
  });

  test("output is JSON with no live objects", () => {
    const s = serialize(diff({}, { d: new Date(0), m: new Map([["k", 1]]) }));
    expect(typeof s).toBe("string");
    const parsed = JSON.parse(s);
    expect(Array.isArray(parsed)).toBe(true);
  });

  test("throws on unsupported values and cycles", () => {
    expect(() => serialize(diff({}, { s: Symbol("s") }))).toThrow();
    expect(() => serialize(diff({}, { f: () => 1 }))).toThrow();
    class Widget {}
    expect(() => serialize(diff({}, { w: new Widget() }))).toThrow();
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    expect(() => serialize(diff({}, { c: cyc }))).toThrow();
  });

  test("deserialize throws on an unknown type tag or missing ref", () => {
    expect(() =>
      deserialize('[{"type":2,"path":[],"value":"@1","$refs":{"1":{"_t":"Bogus","_v":1}}}]'),
    ).toThrow();
    expect(() => deserialize('[{"type":2,"path":[],"value":"@9"}]')).toThrow();
  });

  test("output matches the readable ref-table shape", () => {
    const op = JSON.parse(serialize(diff({}, { user: { d: new Date(0), s: new Set([1]) } })))[0];
    expect(op.path).toEqual(["user"]);
    expect(op.value).toEqual({ d: "@1", s: "@2" });
    expect(op.$refs["1"]).toEqual({ _t: "Date", _v: "1970-01-01T00:00:00.000Z" });
    expect(op.$refs["2"]).toEqual({ _t: "Set", _v: [1] });
  });
});
