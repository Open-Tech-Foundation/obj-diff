/**
 * Bounded Myers O(ND) shortest-edit-script diff.
 *
 * Operates on index windows of two arrays via a caller-supplied equality
 * predicate and returns a run-length-encoded edit script, or `null` when the
 * edit distance exceeds the computed cap (the caller then falls back to
 * positional diffing).
 */

export type ScriptOp = { t: "eq"; n: number } | { t: "del"; ai: number } | { t: "ins"; bi: number };

/** Absolute cap on the edit distance; bounds trace memory to ~D². */
const MAX_D = 1024;
/** Rough cap on total equality checks (~(N+M)·D). */
const MAX_COST = 2_000_000;

export function maxEditDistance(aLen: number, bLen: number): number {
  const windowSum = aLen + bLen;
  return Math.min(windowSum, MAX_D, Math.ceil(MAX_COST / Math.max(windowSum, 1)));
}

/**
 * Computes the shortest edit script turning a[0..aLen) into b[0..bLen).
 * `eq(ai, bi)` compares elements by window-relative index.
 */
export function myersScript(
  aLen: number,
  bLen: number,
  eq: (ai: number, bi: number) => boolean,
  maxD: number,
): ScriptOp[] | null {
  const off = maxD;
  const v = new Int32Array(2 * maxD + 1);
  // trace[d] = compact copy of V after depth d, covering k in [-d, d]
  const trace: Int32Array[] = [];
  let foundD = -1;

  outer: for (let d = 0; d <= maxD; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) {
        x = v[off + k + 1]; // down: insertion from b
      } else {
        x = v[off + k - 1] + 1; // right: deletion from a
      }
      let y = x - k;
      while (x < aLen && y < bLen && eq(x, y)) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= aLen && y >= bLen) {
        trace.push(v.slice(off - d, off + d + 1));
        foundD = d;
        break outer;
      }
    }
    trace.push(v.slice(off - d, off + d + 1));
  }

  if (foundD === -1) return null;

  // Backtrack from (aLen, bLen) to (0, 0), emitting the script in reverse.
  const script: ScriptOp[] = [];
  let x = aLen;
  let y = bLen;

  for (let d = foundD; d > 0; d--) {
    const prev = trace[d - 1]; // covers k in [-(d-1), d-1], index k + (d - 1)
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && prev[k - 1 + d - 1] < prev[k + 1 + d - 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = prev[prevK + d - 1];
    const prevY = prevX - prevK;

    // Snake (equal run) following the edit at this depth
    let n = 0;
    while (x > prevX && y > prevY) {
      x--;
      y--;
      n++;
    }
    if (n > 0) script.push({ t: "eq", n });

    if (prevK === k + 1) {
      y--;
      script.push({ t: "ins", bi: y });
    } else {
      x--;
      script.push({ t: "del", ai: x });
    }
  }

  // Leading snake at depth 0
  if (x > 0) script.push({ t: "eq", n: x });

  script.reverse();
  return script;
}
