import { isPlainObject, isTypedArray } from "@opentf/std";
import type { DiffType } from "./constants";
import type { DiffResult } from "./types";

/**
 * Self-describing wire codec for diffs. `diff()` returns live objects by
 * reference, so `JSON.stringify` mangles them (Date→string, Map/Set→`{}`,
 * TypedArray→numeric object, BigInt→throws).
 *
 * `serialize` keeps `value`/`path` readable JSON but replaces every special
 * value with a lightweight reference token `"@n"` and collects the real types
 * in a per-op `$refs` table (`{ "n": { _t, _v } }`). `deserialize` resolves the
 * tokens back into live typed values so `patch` reconstructs them across a
 * process boundary.
 *
 * Unsupported values (symbols, functions, class instances) and circular
 * references throw. `Temporal` values require a `Temporal` implementation
 * (native global or a polyfill installed on `globalThis`) at deserialize time.
 */

type RefEntry = { _t: string; _v?: unknown };
type Refs = Record<string, RefEntry>;
type WireOp = { type: DiffType; path: unknown[]; value?: unknown; $refs?: Refs };

/** Returns the Temporal type name (e.g. "Temporal.PlainDate") if x is a Temporal value, else null. */
function temporalName(x: unknown): string | null {
  const tag = Object.prototype.toString.call(x); // "[object Temporal.PlainDate]"
  return tag.startsWith("[object Temporal.") ? tag.slice(8, -1) : null;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type TAConstructor = new (buffer: ArrayBufferLike) => ArrayBufferView;
const TA_CTORS: Record<string, TAConstructor> = {
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  BigInt64Array,
  BigUint64Array,
};

const ERR_CTORS: Record<string, ErrorConstructor> = {
  Error,
  TypeError,
  RangeError,
  ReferenceError,
  SyntaxError,
  EvalError,
  URIError,
};

const REF_TOKEN = /^@\d+$/;

// ---------------------------------------------------------------------------
// encode
// ---------------------------------------------------------------------------

function createEncoder() {
  const refs: Refs = {};
  const seen = new Set<object>();
  let count = 0;

  const ref = (_t: string, _v?: unknown): string => {
    const key = String(++count);
    refs[key] = _v === undefined ? { _t } : { _t, _v };
    return `@${key}`;
  };

  // Returns a JSON-safe node: a primitive, array, plain object, or a "@n" token.
  const node = (x: unknown): unknown => {
    if (x === null) return null;

    const type = typeof x;
    if (type === "string") {
      const s = x as string;
      // Escape a real string that could be mistaken for a ref token or an escape.
      return s.startsWith("@") ? `@${s}` : s;
    }
    if (type === "boolean") return x;
    if (type === "number") {
      const num = x as number;
      // -0, NaN and ±Infinity are not representable in JSON, so they go to a ref.
      if (Number.isFinite(num) && !Object.is(num, -0)) return num;
      return ref(
        "num",
        num === Number.POSITIVE_INFINITY
          ? "Infinity"
          : num === Number.NEGATIVE_INFINITY
            ? "-Infinity"
            : Number.isNaN(num)
              ? "NaN"
              : "-0",
      );
    }
    if (x === undefined) return ref("undef");
    if (type === "bigint") return ref("bigint", (x as bigint).toString());
    if (type === "symbol" || type === "function") {
      throw new TypeError(`obj-diff serialize: ${type} values are not serializable`);
    }

    const obj = x as object;
    if (seen.has(obj)) {
      throw new TypeError("obj-diff serialize: circular references are not serializable");
    }
    seen.add(obj);
    try {
      if (Array.isArray(obj)) return obj.map((e) => node(e));
      if (isPlainObject(obj)) {
        const o = obj as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(o)) out[k] = node(o[k]);
        return out;
      }

      if (obj instanceof Date) {
        return ref("Date", Number.isNaN(obj.getTime()) ? "NaN" : obj.toISOString());
      }
      if (obj instanceof RegExp) return ref("RegExp", [obj.source, obj.flags]);
      if (obj instanceof Map) {
        return ref(
          "Map",
          [...obj].map(([k, v]) => [node(k), node(v)]),
        );
      }
      if (obj instanceof Set)
        return ref(
          "Set",
          [...obj].map((v) => node(v)),
        );
      if (isTypedArray(obj)) {
        const ta = obj as unknown as {
          constructor: { name: string };
          buffer: ArrayBufferLike;
          byteOffset: number;
          byteLength: number;
        };
        return ref(
          ta.constructor.name,
          bytesToB64(new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength)),
        );
      }
      if (obj instanceof ArrayBuffer) return ref("ArrayBuffer", bytesToB64(new Uint8Array(obj)));
      if (obj instanceof DataView) {
        return ref(
          "DataView",
          bytesToB64(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength)),
        );
      }
      if (obj instanceof Error) {
        const src = obj as unknown as Record<string, unknown>;
        const own: Record<string, unknown> = {};
        for (const k of Object.keys(obj)) own[k] = node(src[k]);
        return ref("Error", { name: obj.name, message: obj.message, own });
      }
      if (obj instanceof Number) return ref("Number", node(obj.valueOf()));
      if (obj instanceof String) return ref("String", obj.valueOf());
      if (obj instanceof Boolean) return ref("Boolean", obj.valueOf());

      const tn = temporalName(obj);
      if (tn) return ref(tn, (obj as { toString(): string }).toString());

      throw new TypeError(
        "obj-diff serialize: unsupported value (class instance or exotic object)",
      );
    } finally {
      seen.delete(obj);
    }
  };

  return { node, refs, hasRefs: () => count > 0 };
}

// ---------------------------------------------------------------------------
// decode
// ---------------------------------------------------------------------------

function createDecoder(refs: Refs) {
  const cache = new Map<string, unknown>();

  const build = (entry: RefEntry): unknown => {
    const t = entry._t;
    const v = entry._v;
    switch (t) {
      case "undef":
        return undefined;
      case "bigint":
        return BigInt(v as string);
      case "num":
        return v === "Infinity"
          ? Number.POSITIVE_INFINITY
          : v === "-Infinity"
            ? Number.NEGATIVE_INFINITY
            : v === "NaN"
              ? Number.NaN
              : -0;
      case "Date":
        return new Date(v === "NaN" ? Number.NaN : (v as string));
      case "RegExp": {
        const [source, flags] = v as [string, string];
        return new RegExp(source, flags);
      }
      case "Map":
        return new Map((v as [unknown, unknown][]).map(([k, val]) => [node(k), node(val)]));
      case "Set":
        return new Set((v as unknown[]).map((e) => node(e)));
      case "ArrayBuffer":
        return b64ToBytes(v as string).buffer;
      case "DataView":
        return new DataView(b64ToBytes(v as string).buffer);
      case "Error":
        return buildError(v as { name: string; message: string; own: Record<string, unknown> });
      case "Number":
        return new Number(node(v));
      case "String":
        return new String(v);
      case "Boolean":
        return new Boolean(v);
      default: {
        if (t in TA_CTORS) return new TA_CTORS[t](b64ToBytes(v as string).buffer);
        if (t.startsWith("Temporal.")) {
          const T = (globalThis as { Temporal?: Record<string, { from(s: string): unknown }> })
            .Temporal;
          if (!T) {
            throw new TypeError(
              `obj-diff deserialize: Temporal is not available in this runtime (needed for "${t}")`,
            );
          }
          return T[t.slice("Temporal.".length)].from(v as string);
        }
        throw new TypeError(`obj-diff deserialize: unknown type tag "${t}"`);
      }
    }
  };

  const buildError = (v: {
    name: string;
    message: string;
    own: Record<string, unknown>;
  }): Error => {
    const Ctor = ERR_CTORS[v.name] ?? Error;
    const e = new Ctor(v.message);
    if (e.name !== v.name) e.name = v.name;
    const target = e as unknown as Record<string, unknown>;
    for (const k of Object.keys(v.own)) target[k] = node(v.own[k]);
    return e;
  };

  const resolve = (key: string): unknown => {
    if (cache.has(key)) return cache.get(key);
    const entry = refs[key];
    if (!entry) throw new TypeError(`obj-diff deserialize: missing $ref "@${key}"`);
    const built = build(entry);
    cache.set(key, built);
    return built;
  };

  const node = (x: unknown): unknown => {
    if (typeof x === "string") {
      if (REF_TOKEN.test(x)) return resolve(x.slice(1));
      return x.startsWith("@") ? x.slice(1) : x; // unescape
    }
    if (x === null || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map((e) => node(e));
    const o = x as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) out[k] = node(o[k]);
    return out;
  };

  return { node };
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/** Encode a diff into a self-describing JSON string that survives transport. */
export function serialize(patches: DiffResult[]): string {
  const wire: WireOp[] = patches.map((op) => {
    const enc = createEncoder();
    const out: WireOp = { type: op.type, path: op.path.map((k) => enc.node(k)) };
    if ("value" in op) out.value = enc.node(op.value);
    if (enc.hasRefs()) out.$refs = enc.refs;
    return out;
  });
  return JSON.stringify(wire);
}

/** Decode a string produced by `serialize` back into a diff with live typed values. */
export function deserialize(wire: string): DiffResult[] {
  const raw = JSON.parse(wire) as WireOp[];
  return raw.map((op) => {
    const dec = createDecoder(op.$refs ?? {});
    const out: DiffResult = { type: op.type, path: op.path.map((k) => dec.node(k)) };
    if ("value" in op) out.value = dec.node(op.value);
    return out;
  });
}
