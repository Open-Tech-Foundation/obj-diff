import { run, bench, group } from 'mitata';
import { diff as objDiff, patch as objPatch } from '../packages/obj-diff/dist/index.js';
import mdiff from 'microdiff';
import deepDiff from 'deep-diff';
import { diff as justDiff } from 'just-diff';

// Array edit patterns where positional diffing historically produced
// O(n) ops for O(1) edits. Tracks both speed and diff compactness.

const N = 10000;
const base = Array.from({ length: N }, (_, i) => i);

const insertFront = [-1, ...base];
const insertMiddle = [...base.slice(0, N / 2), -1, ...base.slice(N / 2)];
const removeMiddle = base.filter((_, i) => i !== N / 2);
const removeRunMiddle = [...base.slice(0, N / 2), ...base.slice(N / 2 + 10)];
const mixedEdit = (() => {
  const arr = base.slice();
  arr.splice(3, 1); // remove near front
  arr.splice(N / 2, 0, -1, -2); // insert two mid
  arr[N - 100] = -3; // change near end
  return arr;
})();

const objBase = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item-${i}` }));
const objInsertFront = [{ id: -1, name: 'new' }, ...objBase];

console.log('--- Diff size (ops count) ---');
for (const [label, a, b] of [
  ['insert front (10k)', base, insertFront],
  ['insert middle (10k)', base, insertMiddle],
  ['remove middle (10k)', base, removeMiddle],
  ['remove run of 10 (10k)', base, removeRunMiddle],
  ['mixed edit (10k)', base, mixedEdit],
  ['objects: insert front (1k)', objBase, objInsertFront],
]) {
  console.log(
    `${label}: obj-diff=${objDiff(a, b).length}, microdiff=${mdiff(a, b).length}, just-diff=${justDiff(a, b).length}`,
  );
}
console.log('');

group('Insert at front (10k numbers)', () => {
  bench('@opentf/obj-diff', () => objDiff(base, insertFront));
  bench('microdiff', () => mdiff(base, insertFront));
  bench('deep-diff', () => deepDiff(base, insertFront));
  bench('just-diff', () => justDiff(base, insertFront));
});

group('Remove from middle (10k numbers)', () => {
  bench('@opentf/obj-diff', () => objDiff(base, removeMiddle));
  bench('microdiff', () => mdiff(base, removeMiddle));
  bench('deep-diff', () => deepDiff(base, removeMiddle));
  bench('just-diff', () => justDiff(base, removeMiddle));
});

group('Mixed edits (10k numbers)', () => {
  bench('@opentf/obj-diff', () => objDiff(base, mixedEdit));
  bench('microdiff', () => mdiff(base, mixedEdit));
  bench('deep-diff', () => deepDiff(base, mixedEdit));
  bench('just-diff', () => justDiff(base, mixedEdit));
});

group('Objects: insert at front (1k entities)', () => {
  bench('@opentf/obj-diff', () => objDiff(objBase, objInsertFront));
  bench('microdiff', () => mdiff(objBase, objInsertFront));
  bench('just-diff', () => justDiff(objBase, objInsertFront));
});

group('Patch: insert at front (10k numbers)', () => {
  const d = objDiff(base, insertFront);
  bench('@opentf/obj-diff patch', () => objPatch(base, d));
});

await run();
