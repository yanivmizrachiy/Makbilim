import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outPath = path.join(root, 'artifacts', 'sbom.cdx.json');
await fs.mkdir(path.dirname(outPath), { recursive: true });

// Run npm's own CLI through the current Node binary. `npm run` exports its CLI path as
// npm_execpath; spawning npm.cmd directly is refused on Windows by current Node (EINVAL).
const npmCli = process.env.npm_execpath;
const [command, prefix] = npmCli && /\.c?js$/.test(npmCli)
  ? [process.execPath, [npmCli]]
  : [process.platform === 'win32' ? 'npm.cmd' : 'npm', []];
const child = spawn(command, [...prefix, 'sbom', '--sbom-format=cyclonedx'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: command.endsWith('.cmd'),
});

let stdout = '';
let stderr = '';
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', chunk => { stdout += chunk; });
child.stderr.on('data', chunk => { stderr += chunk; });

const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('close', resolve);
});

if (exitCode !== 0) {
  throw new Error(`sbom: npm sbom failed with code ${exitCode}\n${stderr}`);
}

let sbom;
try {
  sbom = JSON.parse(stdout);
} catch (error) {
  throw new Error(`sbom: npm returned invalid JSON: ${error.message}`);
}

if (sbom.bomFormat !== 'CycloneDX' || !Array.isArray(sbom.components)) {
  throw new Error('sbom: expected CycloneDX document with components');
}

await fs.writeFile(outPath, JSON.stringify(sbom, null, 2) + '\n', 'utf8');
console.log(`sbom: PASS — CycloneDX with ${sbom.components.length} component(s)`);
