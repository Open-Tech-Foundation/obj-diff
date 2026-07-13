import { diff as objDiff } from '../packages/obj-diff/dist/index.js';
import mdiff from 'microdiff';
import * as jsondiffpatch from 'jsondiffpatch';

// Helper to generate large objects
function generateLargeObject(sizeKb) {
  const obj = { data: [] };
  const items = (sizeKb * 1024) / 50; // approximate 50 bytes per item
  for (let i = 0; i < items; i++) {
    obj.data.push({ id: i, value: `Random string payload ${Math.random()}` });
  }
  return obj;
}

const obj100k_1 = generateLargeObject(100);
const obj100k_2 = JSON.parse(JSON.stringify(obj100k_1));
obj100k_2.data[Math.floor(obj100k_2.data.length / 2)].value = "CHANGED";
obj100k_2.data.push({ id: 99999, value: "ADDED" });

const obj1m_1 = generateLargeObject(1024);
const obj1m_2 = JSON.parse(JSON.stringify(obj1m_1));
obj1m_2.data[Math.floor(obj1m_2.data.length / 2)].value = "CHANGED";
obj1m_2.data.push({ id: 99999, value: "ADDED" });

function runBenchmark(name, obj1, obj2) {
  console.log(`\n--- ${name} ---`);
  
  const libs = [
    { name: '@opentf/obj-diff', run: () => objDiff(obj1, obj2) },
    { name: 'microdiff', run: () => mdiff(obj1, obj2) },
    { name: 'jsondiffpatch', run: () => jsondiffpatch.diff(obj1, obj2) }
  ];

  for (const lib of libs) {
    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();
    const result = lib.run();
    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;
    
    const size = Buffer.byteLength(JSON.stringify(result));
    const time = (end - start).toFixed(2);
    const mem = ((endMem - startMem) / 1024 / 1024).toFixed(2);
    
    console.log(`${lib.name.padEnd(20)} | Time: ${time}ms | Diff Size: ${size} bytes | Mem: ${mem} MB`);
  }
}

runBenchmark('100KB JSON', obj100k_1, obj100k_2);
runBenchmark('1MB JSON', obj1m_1, obj1m_2);
