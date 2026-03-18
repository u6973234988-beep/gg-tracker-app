/**
 * Script to verify package.json is clean of @klinecharts/pro
 * and report the current dependency list.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const bad = Object.keys(allDeps).filter(k => k.includes('@klinecharts/pro'));

if (bad.length > 0) {
  console.error('[v0] FOUND bad deps:', bad);
  process.exit(1);
} else {
  console.log('[v0] package.json is clean - no @klinecharts/pro found');
  console.log('[v0] klinecharts version:', allDeps['klinecharts']);
  console.log('[v0] All dependencies:', Object.keys(allDeps).join(', '));
}
