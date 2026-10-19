/* global window */
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/';
await mkdir('../docs/previews', { recursive: true });
try {
  for (const [width, height] of [[320, 568], [360, 800], [390, 844], [768, 1024], [1440, 960], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const checkHeader = async name => {
      const header = page.locator('header').first();
      const caseLogo = header.getByRole('img', { name: 'CASE-IN', exact: true });
      const vectorLogo = header.getByRole('img', { name: 'Вектор развития', exact: true });
      await expect(caseLogo).toBeVisible();
      await expect(vectorLogo).toBeVisible();
      await expect.poll(() => vectorLogo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      const left = await caseLogo.boundingBox(), right = await vectorLogo.boundingBox();
      expect(right.x).toBeGreaterThanOrEqual(left.x + left.width + 8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if ([390, 1440].includes(width)) await header.screenshot({ path: '../docs/previews/partner-' + name + '-' + width + '.png' });
    };
    await page.goto(base + '#/');
    await checkHeader('welcome');
    if (width === 320) await page.screenshot({ path: '../docs/previews/partner-welcome-320.png', fullPage: true });
    await page.goto(base + '#/demo?role=student');
    await checkHeader('roles');
    await page.getByLabel('Тестовый профиль').selectOption('persona_anna');
    await page.getByRole('button', { name: /Продолжить как/ }).click();
    await checkHeader('workspace');
    const notification = page.getByRole('link', { name: /Уведомления: непрочитанных/ });
    await expect(notification).toBeInViewport();
    const logoBox = await page.locator('.vector-development-mark').boundingBox();
    const notificationBox = await notification.boundingBox();
    expect(notificationBox.x).toBeGreaterThanOrEqual(logoBox.x + logoBox.width);
    expect(errors).toEqual([]);
    await page.close();
    console.log('PASS partner marks ' + width + 'x' + height + ': welcome, role selection, workspace, asset loading, spacing and notifications.');
  }
} finally {
  await browser.close();
}
