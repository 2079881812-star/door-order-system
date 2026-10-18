import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

export const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');

export async function build({ check = false } = {}) {
  const [page, engine, productionUI, rulesText, templateText, packageText] = await Promise.all([
    read('src/app.html'), read('src/engine.js'), read('src/production-ui.js'),
    read('src/rules.json'), read('src/workbook-template.json'), read('package.json'),
  ]);
  const rules = JSON.parse(rulesText);
  const template = JSON.parse(templateText);
  const { version } = JSON.parse(packageText);
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(rules.userRules, 'Missing business rules');
  assert.deepEqual(template.styles.map(row => row.length), [14, 30, 34]);
  for (let n = 1; n <= 3; n++) assert.ok(template.files[`xl/worksheets/sheet${n}.xml`]);
  const inlineJSON = value => JSON.stringify(value).replace(/<\//g, '<\\/');
  const replacements = {
    '/*ENGINE*/': `globalThis.OrderRules=${inlineJSON(rules)};\n${engine}`,
    '/*TEMPLATE*/': inlineJSON(template),
    '/*PRODUCTION_UI*/': productionUI,
  };
  let html = page.replaceAll('__APP_VERSION__', version);
  for (const [marker, content] of Object.entries(replacements)) {
    assert.equal(html.split(marker).length, 2, `Expected one ${marker} placeholder`);
    html = html.replace(marker, () => content);
  }
  const output = path.join(root, 'dist/index.html');
  if (check) {
    assert.equal(await readFile(output, 'utf8'), html, 'dist/index.html is outdated. Run: node scripts/build.mjs');
    console.log(`Build matches source: v${version}`);
  } else {
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, html, 'utf8');
    console.log(`Built dist/index.html (v${version})`);
  }
  return html;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build({ check: process.argv.includes('--check') });
}
