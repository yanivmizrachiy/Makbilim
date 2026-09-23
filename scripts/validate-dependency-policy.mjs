import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const direct = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
};

const nonExact = Object.entries(direct).filter(([, version]) => !exactVersion.test(version));
if (nonExact.length) {
  throw new Error(`dependency-policy: direct dependencies must be exact versions: ${JSON.stringify(nonExact)}`);
}

if (lock.lockfileVersion !== 3) {
  throw new Error(`dependency-policy: expected package-lock lockfileVersion=3, found ${lock.lockfileVersion}`);
}

const rootPackage = lock.packages?.[''];
if (!rootPackage) throw new Error('dependency-policy: package-lock root package missing');

for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
  if (rootPackage.dependencies?.[name] !== version) {
    throw new Error(`dependency-policy: lock root mismatch for dependency ${name}`);
  }
}
for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
  if (rootPackage.devDependencies?.[name] !== version) {
    throw new Error(`dependency-policy: lock root mismatch for devDependency ${name}`);
  }
}

const unsafeResolved = [];
const missingIntegrity = [];
for (const [key, entry] of Object.entries(lock.packages ?? {})) {
  if (!key || !entry || typeof entry !== 'object') continue;
  if (entry.link === true) continue;
  if (entry.resolved && !String(entry.resolved).startsWith('https://registry.npmjs.org/')) {
    unsafeResolved.push({ key, resolved: entry.resolved });
  }
  if (entry.resolved && !entry.integrity) missingIntegrity.push(key);
}

if (unsafeResolved.length) {
  throw new Error(`dependency-policy: non-registry resolved packages found: ${JSON.stringify(unsafeResolved)}`);
}
if (missingIntegrity.length) {
  throw new Error(`dependency-policy: packages with resolved URL but missing integrity: ${missingIntegrity.join(', ')}`);
}

console.log(`dependency-policy: PASS — ${Object.keys(direct).length} direct dependencies pinned exactly; lockfile v3; registry/integrity policy clean`);
