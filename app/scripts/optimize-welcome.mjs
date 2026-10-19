import { Buffer } from 'node:buffer';
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const [source, target] of [
    ['../source/assets/welcome-architecture-original.png', 'public/architecture/welcome-final.webp'],
    ['../source/assets/welcome-drawing-generated.png', 'public/architecture/welcome-drawing.webp'],
    ['../source/assets/welcome-completed-generated.png', 'public/architecture/welcome-completed.webp']
  ]) {
    const input = await readFile(source);
    const result = await page.evaluate(
      async data => {
        const im = new globalThis.Image();
        im.src = 'data:image/png;base64,' + data;
        await im.decode();
        const canvas = document.createElement('canvas');
        canvas.width = im.naturalWidth;
        canvas.height = im.naturalHeight;
        canvas.getContext('2d').drawImage(im, 0, 0);
        return {
          width: canvas.width,
          height: canvas.height,
          data: canvas.toDataURL('image/webp', .9).split(',')[1]
        };
      },
      input.toString('base64')
    );
    await writeFile(target, Buffer.from(result.data, 'base64'));
    console.log(target, result.width, result.height, Buffer.byteLength(result.data, 'base64'));
  }
} finally {
  await browser.close();
}
