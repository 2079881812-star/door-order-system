import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, build } from './build.mjs';

await build();
const tests = (await readdir(path.join(root, 'tests'))).filter(name => name.endsWith('.test.cjs')).sort();
let failed = 0;
for (const test of tests) {
  console.log(`\n--- ${test} ---`);
  const result = spawnSync(process.execPath, [path.join(root, 'tests', test)], {
    cwd: root, stdio: 'inherit', timeout: 30_000,
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) failed++;
}
console.log(`\n${tests.length - failed}/${tests.length} test suites passed.`);
if (failed) process.exitCode = 1;
