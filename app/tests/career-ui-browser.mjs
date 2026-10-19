/* global window, getComputedStyle */
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('../docs/previews', { recursive: true });
try {
  for (const width of [360, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/demo?role=student');
    await page.getByLabel('Тестовый профиль').selectOption('persona_anna');
    await page.getByRole('button', { name: /Продолжить как/ }).click();
    const actions = page.getByRole('region', { name: 'Работа и карьерные возможности' });
    await expect(actions.getByRole('link', { name: /ИИ для профиля/ })).toContainText('Недоступно в демо');
    const buttons = await actions.locator('a').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { top: rect.top, bottom: rect.bottom, height: rect.height, background: style.backgroundColor };
    }));
    expect(buttons[0].background).not.toBe(buttons[1].background);
    expect(buttons.every(button => button.height >= 44)).toBe(true);
    if (width < 650) expect(buttons.slice(1).every((button, index) => button.top >= buttons[index].bottom + 8)).toBe(true);
    await page.screenshot({ path: '../docs/previews/career-home-' + width + '.png', fullPage: true });
    await actions.getByRole('link', { name: /Найти работу/ }).click();
    await expect(page).toHaveURL(/#\/jobs$/);
    await expect(page.locator('.career-nav')).toHaveAttribute('aria-current', 'page');
    await page.locator('.career-result-link').first().click();
    await expect(page).toHaveURL(/#\/jobs\/[^?]+\?back=/);
    await page.goto(base + '#/student');
    await page.getByRole('link', { name: /Подобрать возможности/ }).click();
    await expect(page.getByLabel('Сортировка', { exact: true })).toHaveValue('matching');
    await page.goto(base + '#/student/profile');
    await page.locator('#profile-about').getByRole('button', { name: /Заполнить с помощью ИИ/ }).click();
    const assistant = page.locator('.ai-assistant');
    await expect(assistant.getByRole('status')).toContainText('ИИ-помощник недоступен в демо');
    await expect(assistant.getByLabel('Ваше сообщение', { exact: true })).toHaveCount(0);
    await expect(assistant.getByRole('alert')).toHaveCount(0);
    const notice = await page.locator('.ai-demo-notice').boundingBox();
    expect(notice.height).toBeLessThan(width < 650 ? 250 : 170);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('#profile-about').screenshot({ path: '../docs/previews/career-ai-' + width + '.png' });
    // The manual editor still saves and reloads while AI is unavailable.
    await page.getByLabel('Текст от студента', { exact: true }).fill('Интересуют графики строительства и ПТО.');
    await page.locator('.profile-editor').getByRole('button', { name: 'Сохранить', exact: true }).click();
    await page.reload();
    await expect(page.locator('#profile-about')).toContainText('Интересуют графики строительства и ПТО.');
    // An enabled service must retain its existing dialog and request handling.
    let posts = 0;
    await page.route('**/.netlify/functions/ai', async route => {
      if (route.request().method() === 'GET') await route.fulfill({ json: { mode: 'live', available: true } });
      else { posts++; await route.fulfill({ status: 503, json: { error: 'UNAVAILABLE' } }); }
    });
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
    console.log('PASS career UI ' + width + ': CTA hierarchy/routes, demo notice, manual save/reload, enabled AI error keeps draft.');
  }
} finally { await browser.close(); }
