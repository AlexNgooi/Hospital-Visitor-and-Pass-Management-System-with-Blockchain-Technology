import fs from 'node:fs';
import path from 'node:path';
import sharp from 'file:///C:/Users/alexy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const dir = path.resolve('planning/figma_assets');
for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.svg'))) {
  const source = path.join(dir, name);
  const target = path.join(dir, name.replace('.svg', '.png'));
  await sharp(source, { density: 144 }).resize({ width: 2200, withoutEnlargement: true }).png().toFile(target);
}
