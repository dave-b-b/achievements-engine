/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

it('finishes the normal Rollup CLI build without retaining compiler watchers', () => {
  const root = path.resolve(__dirname, '..');
  const result = spawnSync(process.execPath, ['node_modules/rollup/dist/bin/rollup', '-c'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  for (const entry of ['index', 'server']) {
    for (const extension of ['cjs', 'esm.js', 'd.ts']) {
      expect(fs.statSync(path.join(root, 'dist', `${entry}.${extension}`)).size).toBeGreaterThan(0);
    }
  }
}, 35000);
