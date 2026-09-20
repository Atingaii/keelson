import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (/\.[cm]?js$/.test(file)) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
}
for (const dir of ['bin', 'src', 'hooks', 'scripts']) visit(dir);
