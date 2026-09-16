import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const source = path.join(root, 'node_modules', '@mathjax', 'src', 'bundle');
const destination = path.join(root, 'public', 'vendor', 'mathjax');
const entry = path.join(source, 'tex-svg.js');

try {
  await fs.access(entry);
} catch {
  throw new Error(`MathJax bundle is missing: ${entry}. Run npm install first.`);
}

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.cp(source, destination, { recursive: true });

console.log('mathjax: prepared self-hosted @mathjax/src 4.1.3 bundle for SVG typesetting');
