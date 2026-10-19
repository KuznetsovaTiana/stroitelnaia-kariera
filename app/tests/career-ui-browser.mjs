/* global window */
import { chromium, expect } from '@playwright/test';

const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [360, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/demo?role=student');
    await page.getByLabel('Тестовый профиль').selectOption('persona_anna');
    await page.getByRole('button', { name: /Продолжить как/ }).click();
    await expect(page.locator('.career-actions')).toHaveCount(0);
    await expect(page.locator('.home-next .button')).toBeVisible();
    await page.goto(base + '#/practices');
    await page.locator('.context-nav a[href="#/jobs"]').click();
    await expect(page).toHaveURL(/#\/jobs$/);
    await expect(page.locator('.context-nav a[href="#/jobs"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.context-nav a[aria-current]')).toHaveCount(1);
    await page.locator('.career-result-link').first().click();
    await expect(page).toHaveURL(/#\/jobs\/[^?]+\?back=/);
    await page.goto(base + '#/student');
    await page.locator('.home-recommendations a[href="#/practices?sort=matching"]').click();
    await expect(page.getByLabel('Сортировка', { exact: true })).toHaveValue('matching');
    await page.goto(base + '#/student/profile');
    await expect(page.locator('.career-actions')).toHaveCount(0);
    await page.locator('#profile-about').getByRole('button', { name: /Заполнить с помощью ИИ/ }).click();
    const assistant = page.locator('.ai-assistant');
    await expect(assistant.getByRole('status')).toContainText('ИИ-помощник недоступен в демо');
    await expect(assistant.getByLabel('Ваше сообщение', { exact: true })).toHaveCount(0);
    await expect(assistant.getByRole('alert')).toHaveCount(0);
    const notice = await page.locator('.ai-demo-notice').boundingBox();
    expect(notice.height).toBeLessThan(width < 650 ? 250 : 170);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // The manual editor still saves and reloads while AI is unavailable.
    await page.getByLabel('Текст от студента', { exact: true }).fill('Интересуют графики строительства и ПТО.');
    await page.locator('.profile-editor').getByRole('button', { name: 'Сохранить', exact: true }).click();
    await page.reload();
    await expect(page.locator('#profile-about')).toContainText('Интересуют графики строительства и ПТО.');
    // An enabled service must retain its existing dialog and request handling.
    let posts = 0;
    await page.route(
      '**/.netlify/functions/ai',
      async route => {
        if (route.request().method() === 'GET') await route.fulfill({ json: { mode: 'live', available: true } });
        else {
          posts++;
          await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE' } });
        }
      }
    );
    await page.reload();
    await page.locator('#profile-about').getByRole('button', { name: /Заполнить с помощью ИИ/ }).click();
    await expect(assistant).toContainText('GigaChat');
    await page.getByLabel('Ваше сообщение', { exact: true }).fill('Сохранить введённое при ошибке');
    await page.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(assistant.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Ваше сообщение', { exact: true })).toHaveValue('Сохранить введённое при ошибке');
    expect(posts).toBe(1);
    expect(errors).toEqual([]);
    await page.close();
    console.log('PASS career UI ' + width + ': banner removed, existing routes, demo notice, manual save/reload, enabled AI error keeps draft.');
  }
} finally {
  await browser.close();
}
