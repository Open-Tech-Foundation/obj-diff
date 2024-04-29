import { clone, set, unset } from "@opentf/std";
import { DiffResult } from "./types";

export default function patch(obj: object, patches: Array<DiffResult>) {
  const c = clone(obj);

  for (const p of patches) {
    if (p.t === 1 || p.t === 2) {
      set(c, p.p, p.v);
    }

    if (p.t === 0) {
      unset(c, p.p);
    }
  }

  return c;
}
