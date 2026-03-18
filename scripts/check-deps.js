import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const bad = Object.keys(allDeps).filter(k => k.includes('klinecharts/pro'));

if (bad.length > 0) {
  console.error('[v0] TROVATA dipendenza errata:', bad);
  process.exit(1);
} else {
  console.log('[v0] package.json e pulito - nessun @klinecharts/pro trovato');
  console.log('[v0] versione klinecharts:', allDeps['klinecharts']);
  console.log('[v0] Tutte le dipendenze:', Object.keys(allDeps).join(', '));
}
