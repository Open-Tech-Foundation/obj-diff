import { run, bench, group } from 'mitata';
import { diff as objDiff } from '../packages/obj-diff/dist/index.js';
import mdiff from 'microdiff';
import deepDiff from 'deep-diff';
import { detailedDiff as deepObjectDiff } from 'deep-object-diff';
import { diff as justDiff } from 'just-diff';

const noChanges1 = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
const noChanges2 = { a: 1, b: { c: 2 }, d: [1, 2, 3] };

const oneProp1 = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
const oneProp2 = { a: 1, b: { c: 99 }, d: [1, 2, 3] };

const deep1 = { a: { b: { c: { d: { e: { f: { g: { h: { i: 1 } } } } } } } } };
const deep2 = { a: { b: { c: { d: { e: { f: { g: { h: { i: 2 } } } } } } } } };

const largeArray1 = { arr: Array.from({ length: 10000 }, (_, i) => i) };
const largeArray2 = { arr: Array.from({ length: 10000 }, (_, i) => i === 5000 ? 9999 : i) };

const mixed1 = { str: "hello", num: 42, arr: [1, 2], obj: { a: 1 } };
const mixed2 = { str: "world", num: 42, arr: [1, 3], obj: { a: 2, b: 3 } };

group('No changes', () => {
  bench('@opentf/obj-diff', () => objDiff(noChanges1, noChanges2));
  bench('microdiff', () => mdiff(noChanges1, noChanges2));
  bench('deep-diff', () => deepDiff(noChanges1, noChanges2));
  bench('deep-object-diff', () => deepObjectDiff(noChanges1, noChanges2));
  bench('just-diff', () => justDiff(noChanges1, noChanges2));
});

group('One property changed', () => {
  bench('@opentf/obj-diff', () => objDiff(oneProp1, oneProp2));
  bench('microdiff', () => mdiff(oneProp1, oneProp2));
  bench('deep-diff', () => deepDiff(oneProp1, oneProp2));
  bench('deep-object-diff', () => deepObjectDiff(oneProp1, oneProp2));
  bench('just-diff', () => justDiff(oneProp1, oneProp2));
});

group('Deep nested change', () => {
  bench('@opentf/obj-diff', () => objDiff(deep1, deep2));
  bench('microdiff', () => mdiff(deep1, deep2));
  bench('deep-diff', () => deepDiff(deep1, deep2));
  bench('deep-object-diff', () => deepObjectDiff(deep1, deep2));
  bench('just-diff', () => justDiff(deep1, deep2));
});

group('Large array (10k elements, 1 change)', () => {
  bench('@opentf/obj-diff', () => objDiff(largeArray1, largeArray2));
  bench('microdiff', () => mdiff(largeArray1, largeArray2));
  bench('deep-diff', () => deepDiff(largeArray1, largeArray2));
  bench('deep-object-diff', () => deepObjectDiff(largeArray1, largeArray2));
  bench('just-diff', () => justDiff(largeArray1, largeArray2));
});

group('Mixed object changes', () => {
  bench('@opentf/obj-diff', () => objDiff(mixed1, mixed2));
  bench('microdiff', () => mdiff(mixed1, mixed2));
  bench('deep-diff', () => deepDiff(mixed1, mixed2));
  bench('deep-object-diff', () => deepObjectDiff(mixed1, mixed2));
  bench('just-diff', () => justDiff(mixed1, mixed2));
});

await run();
