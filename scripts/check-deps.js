import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

// Path assoluto del progetto
const root = '/vercel/share/v0-project';
const pkgPath = join(root, 'package.json');
const lockPath = join(root, 'package-lock.json');

console.log('[v0] CWD:', process.cwd());
console.log('[v0] Root progetto:', root);
console.log('[v0] package.json path:', pkgPath);

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
console.log('[v0] Versione progetto:', pkg.version);

const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const bad = Object.keys(allDeps).filter(k => k.includes('klinecharts/pro'));
console.log('[v0] @klinecharts/pro in package.json:', bad.length > 0 ? 'SI - PROBLEMA!' : 'NO - OK');
console.log('[v0] klinecharts version:', allDeps['klinecharts'] ?? 'NON TROVATO');

const hasLock = existsSync(lockPath);
console.log('[v0] package-lock.json esiste:', hasLock);

if (hasLock) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const lockVersion = lock.version || lock.packages?.['']?.version;
  console.log('[v0] Lock file version:', lockVersion);
  const allLockPkgs = Object.keys(lock.packages || {});
  const proInLock = allLockPkgs.filter(k => k.includes('klinecharts'));
  console.log('[v0] klinecharts entries nel lock:', proInLock.length > 0 ? proInLock : 'nessuno');
} else {
  console.log('[v0] Nessun package-lock.json - npm install lo rigenererà');
  // Esegui npm install per rigenerare il lock file
  console.log('[v0] Eseguendo npm install --package-lock-only...');
  try {
    const out = execSync('npm install --package-lock-only', { cwd: root, encoding: 'utf8' });
    console.log('[v0] npm output:', out.substring(0, 500));
    console.log('[v0] package-lock.json rigenerato con successo');
  } catch (e) {
    console.error('[v0] Errore npm install:', e.message?.substring(0, 500));
  }
}
