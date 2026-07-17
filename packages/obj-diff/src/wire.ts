import { isPlainObject, isTypedArray } from "@opentf/std";
import type { DiffType } from "./constants";
import type { DiffResult } from "./types";

/**
 * Self-describing wire codec for diffs. `diff()` returns live objects by
 * reference, so `JSON.stringify` mangles Date/Map/Set/TypedArray/BigInt/… .
 * `serialize` encodes a diff to a JSON string whose special values are tagged
 * with `_t`/`_v` envelopes; `deserialize` restores the exact types so `patch`
 * works across a process boundary.
 *
 * Unsupported values (symbols, functions, class instances) and circular
 * references throw. `Temporal` values require a `Temporal` implementation
 * (native global or a polyfill installed on `globalThis`) at deserialize time.
 */

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

function encode(x: unknown, seen: Set<object>): unknown {
  if (x === undefined) return { _t: "undef" };
  if (x === null) return null;

  const type = typeof x;
  if (type === "bigint") return { _t: "bigint", _v: (x as bigint).toString() };
  if (type === "number") {
    const n = x as number;
    if (n === Number.POSITIVE_INFINITY) return { _t: "num", _v: "Infinity" };
    if (n === Number.NEGATIVE_INFINITY) return { _t: "num", _v: "-Infinity" };
    if (Number.isNaN(n)) return { _t: "num", _v: "NaN" };
    if (Object.is(n, -0)) return { _t: "num", _v: "-0" };
    return n;
  }
  if (type === "string" || type === "boolean") return x;
  if (type === "symbol" || type === "function") {
    throw new TypeError(`obj-diff serialize: ${type} values are not serializable`);
  }

  const obj = x as object;
  if (seen.has(obj)) {
    throw new TypeError("obj-diff serialize: circular references are not serializable");
  }
  seen.add(obj);
  try {
    if (Array.isArray(obj)) return obj.map((e) => encode(e, seen));

    if (obj instanceof Date) {
      return { _t: "Date", _v: Number.isNaN(obj.getTime()) ? "NaN" : obj.toISOString() };
    }
    if (obj instanceof RegExp) return { _t: "RegExp", _v: [obj.source, obj.flags] };
    if (obj instanceof Map) {
      return { _t: "Map", _v: [...obj].map(([k, v]) => [encode(k, seen), encode(v, seen)]) };
    }
    if (obj instanceof Set) return { _t: "Set", _v: [...obj].map((v) => encode(v, seen)) };
    if (isTypedArray(obj)) {
      const ta = obj as unknown as {
        constructor: { name: string };
        buffer: ArrayBufferLike;
        byteOffset: number;
        byteLength: number;
      };
      return {
        _t: ta.constructor.name,
        _v: bytesToB64(new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength)),
      };
    }
    if (obj instanceof ArrayBuffer)
      return { _t: "ArrayBuffer", _v: bytesToB64(new Uint8Array(obj)) };
    if (obj instanceof DataView) {
      return {
        _t: "DataView",
        _v: bytesToB64(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength)),
      };
    }
    if (obj instanceof Error) {
      const src = obj as unknown as Record<string, unknown>;
      const own: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) own[k] = encode(src[k], seen);
      return { _t: "Error", _v: { name: obj.name, message: obj.message, own } };
    }
    if (obj instanceof Number) return { _t: "Number", _v: encode(obj.valueOf(), seen) };
    if (obj instanceof String) return { _t: "String", _v: obj.valueOf() };
    if (obj instanceof Boolean) return { _t: "Boolean", _v: obj.valueOf() };

    const tn = temporalName(obj);
    if (tn) return { _t: tn, _v: (obj as { toString(): string }).toString() };

    if (isPlainObject(obj)) {
      const o = obj as Record<string, unknown>;
      const enc: Record<string, unknown> = {};
      for (const k of Object.keys(o)) enc[k] = encode(o[k], seen);
      // Escape a plain object that itself owns "_t" so decode won't misread it as an envelope.
      return Object.hasOwn(o, "_t") ? { _t: "raw", _v: enc } : enc;
    }

    throw new TypeError("obj-diff serialize: unsupported value (class instance or exotic object)");
  } finally {
    seen.delete(obj);
  }
}

function decodePlainObject(src: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src)) out[k] = decode(src[k]);
  return out;
}

function decodeError(v: { name: string; message: string; own: Record<string, unknown> }): Error {
  const Ctor = ERR_CTORS[v.name] ?? Error;
  const e = new Ctor(v.message);
  if (e.name !== v.name) e.name = v.name;
  const target = e as unknown as Record<string, unknown>;
  for (const k of Object.keys(v.own)) target[k] = decode(v.own[k]);
  return e;
}

function decode(node: unknown): unknown {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(decode);

  const rec = node as Record<string, unknown>;
  const t = rec._t as string | undefined;
  if (t === undefined) return decodePlainObject(rec);

  const v = rec._v;
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
      return new Map((v as [unknown, unknown][]).map(([k, val]) => [decode(k), decode(val)]));
    case "Set":
      return new Set((v as unknown[]).map(decode));
    case "ArrayBuffer":
      return b64ToBytes(v as string).buffer;
    case "DataView":
      return new DataView(b64ToBytes(v as string).buffer);
    case "Error":
      return decodeError(v as { name: string; message: string; own: Record<string, unknown> });
    case "Number":
      return new Number(decode(v));
    case "String":
      return new String(v);
    case "Boolean":
      return new Boolean(v);
    case "raw":
      return decodePlainObject(v as Record<string, unknown>);
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
}

type WireOp = { type: DiffType; path: unknown[]; value?: unknown };

/** Encode a diff into a self-describing JSON string that survives transport. */
export function serialize(patches: DiffResult[]): string {
  const wire: WireOp[] = patches.map((op) => {
    const out: WireOp = { type: op.type, path: op.path.map((k) => encode(k, new Set())) };
    if ("value" in op) out.value = encode(op.value, new Set());
    return out;
  });
  return JSON.stringify(wire);
}

/** Decode a string produced by `serialize` back into a diff with live typed values. */
export function deserialize(wire: string): DiffResult[] {
  const raw = JSON.parse(wire) as WireOp[];
  return raw.map((op) => {
    const out: DiffResult = { type: op.type, path: op.path.map((k) => decode(k)) };
    if ("value" in op) out.value = decode(op.value);
    return out;
  });
}
