import { run, bench, group } from 'mitata';
import { diff as objDiff, patch as objPatch } from '../packages/obj-diff/dist/index.js';
import * as jsondiffpatch from 'jsondiffpatch';
import * as fastJsonPatch from 'fast-json-patch';
import { createPatch as rfc6902Patch, applyPatch as rfc6902Apply } from 'rfc6902';
import { diff as justDiff } from 'just-diff';
import { diffApply as justApply } from 'just-diff-apply';

// Deep clone helper for patch libraries that mutate
const clone = (obj) => JSON.parse(JSON.stringify(obj));

const oneProp1 = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
const oneProp2 = { a: 1, b: { c: 99 }, d: [1, 2, 3] };

const mixed1 = { str: "hello", num: 42, arr: [1, 2], obj: { a: 1 } };
const mixed2 = { str: "world", num: 42, arr: [1, 3], obj: { a: 2, b: 3 } };

group('Diff + Patch: One property changed', () => {
  bench('@opentf/obj-diff', () => {
    const d = objDiff(oneProp1, oneProp2);
    objPatch(oneProp1, d); // obj-diff patch does not mutate original, returns new
  });
  
  bench('jsondiffpatch', () => {
    const d = jsondiffpatch.diff(oneProp1, oneProp2);
    jsondiffpatch.patch(clone(oneProp1), d);
  });
  
  bench('fast-json-patch', () => {
    const d = fastJsonPatch.compare(oneProp1, oneProp2);
    fastJsonPatch.applyPatch(clone(oneProp1), d);
  });
  
  bench('rfc6902', () => {
    const d = rfc6902Patch(oneProp1, oneProp2);
    rfc6902Apply(clone(oneProp1), d);
  });
  
  bench('just-diff + just-diff-apply', () => {
    const d = justDiff(oneProp1, oneProp2);
    justApply(clone(oneProp1), d);
  });
});

group('Diff + Patch: Mixed changes', () => {
  bench('@opentf/obj-diff', () => {
    const d = objDiff(mixed1, mixed2);
    objPatch(mixed1, d);
  });
  
  bench('jsondiffpatch', () => {
    const d = jsondiffpatch.diff(mixed1, mixed2);
    jsondiffpatch.patch(clone(mixed1), d);
  });
  
  bench('fast-json-patch', () => {
    const d = fastJsonPatch.compare(mixed1, mixed2);
    fastJsonPatch.applyPatch(clone(mixed1), d);
  });
  
  bench('rfc6902', () => {
    const d = rfc6902Patch(mixed1, mixed2);
    rfc6902Apply(clone(mixed1), d);
  });
  
  bench('just-diff + just-diff-apply', () => {
    const d = justDiff(mixed1, mixed2);
    justApply(clone(mixed1), d);
  });
});

await run();
