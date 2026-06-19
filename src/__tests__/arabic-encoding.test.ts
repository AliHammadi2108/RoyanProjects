import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const MOJIBAKE = /[\u0637][\u00a0-\u00ff]{1,3}[\u0638]/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !['node_modules', '.next'].includes(ent.name)) walk(p, acc);
    else if (/\.(tsx?|ts)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

describe('Arabic source encoding', () => {
  it('purchase forms do not contain mojibake literals', () => {
    const roots = ['src/components/pages', 'src/services/document-guard.service.ts'];
    const offenders: string[] = [];

    for (const root of roots) {
      const files = fs.statSync(root).isDirectory() ? walk(root) : [root];
      for (const file of files) {
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
        const text = fs.readFileSync(file, 'utf8');
        if (/ط§ظ„|ط­ط|ظ„ط§ ظٹ/.test(text) || MOJIBAKE.test(text)) {
          offenders.push(file);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
