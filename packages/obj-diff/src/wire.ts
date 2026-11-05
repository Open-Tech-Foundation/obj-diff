import { decode, encode, parse, type Refs, SerializeError, stringify } from "@opentf/serialize";
import type { DiffType } from "./constants";
import type { DiffResult } from "./types";

/**
 * Self-describing wire codec for diffs. `diff()` returns live objects by
 * reference, so `JSON.stringify` mangles them (Date→string, Map/Set→`{}`,
 * TypedArray→numeric object, BigInt→throws).
 *
 * The codec itself lives in [`@opentf/serialize`](https://github.com/Open-Tech-Foundation/js-serialize);
 * obj-diff only shapes the low-level `encode`/`decode` envelope into its
 * per-op diff format. `serialize` keeps `value`/`path` readable JSON but
 * replaces every special value with a lightweight reference token `"@n"` and
 * collects the real types in a per-op `$refs` table (`{ "n": { _t, _v } }`).
 * `deserialize` resolves the tokens back into live typed values so `patch`
 * reconstructs them across a process boundary.
 *
 * All supported native types (`Date`, `Map`, `Set`, `TypedArray`, `ArrayBuffer`,
 * `DataView`, `Error`, `URL`, `BigInt`, `Temporal`, `NaN`/`±Infinity`/`-0`,
 * `undefined`, …), circular references and shared identity are handled by the
 * shared codec. Unsupported values (symbols, functions, class instances) throw
 * a `SerializeError`. Deserializing a `Temporal` value needs a `Temporal`
 * implementation (native global or a polyfill installed on `globalThis`).
 */

type WireOp = { type: DiffType; path: unknown[]; value?: unknown; $refs?: Refs };

/** Encode a diff into a self-describing JSON string that survives transport. */
export function serialize(patches: DiffResult[]): string {
  const wire: WireOp[] = patches.map((op) => {
    const hasValue = "value" in op;
    const { values, refs } = hasValue ? encode([op.path, op.value]) : encode([op.path]);
    const out: WireOp = { type: op.type, path: values[0] as unknown[] };
    if (hasValue) out.value = values[1];
    if (refs) out.$refs = refs;
    return out;
  });
  return JSON.stringify(wire);
}

/** Decode a string produced by `serialize` back into a diff with live typed values. */
export function deserialize(wire: string): DiffResult[] {
  const raw = JSON.parse(wire) as WireOp[];
  return raw.map((op) => {
    const hasValue = "value" in op;
    const values = hasValue ? decode([op.path, op.value], op.$refs) : decode([op.path], op.$refs);
    const out: DiffResult = { type: op.type, path: values[0] as unknown[] };
    if (hasValue) out.value = values[1];
    return out;
  });
}

export { parse, SerializeError, stringify };
