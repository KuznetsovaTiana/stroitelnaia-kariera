
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const assert = (v, m) => {
  if (!v) throw new Error(m);
};
await page.goto((process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/') + '#/student');
await page.locator('#interests').fill('Проверка сохранения: планирование работ');
await page.getByRole('button', { name: 'Сохранить интересы' }).click();
await page.getByLabel('Тестовая роль').selectOption('employer_sever_demo');
assert(await page.getByRole('heading', { name: 'Кабинет работодателя' }).isVisible(), 'employer');
await page.reload();
assert(
  await page.getByLabel('Тестовая роль').inputValue() === 'employer_sever_demo',
  'role persistence'
);
await page.getByLabel('Тестовая роль').selectOption('coordinator_mgsu_demo');
await page.getByLabel('Тестовая роль').selectOption('operator_demo');
await page.getByLabel('Тестовая роль').selectOption('persona_anna');
assert(
  await page.locator('#interests').inputValue() === 'Проверка сохранения: планирование работ',
  'draft persistence'
);
await page.locator('.demo-tools').evaluate(el => el.open = true);
await page.getByRole('button', { name: 'Начать заново' }).click();
await page.keyboard.press('Shift+Tab');
assert(
  await page.getByRole('button', { name: 'Восстановить исходный набор', exact: true }).evaluate(el => el === document.activeElement),
  'dialog focus trap'
);
await page.keyboard.press('Escape');
assert(
  await page.locator('#interests').inputValue().then(t => t.startsWith('Проверка')),
  'cancel reset'
);
await page.evaluate(() => localStorage.setItem('other:test', 'keep'));
await page.locator('.demo-tools').evaluate(el => el.open = true);
await page.getByRole('button', { name: 'Начать заново' }).click();
await page.getByRole('button', { name: 'Восстановить исходный набор', exact: true }).click();
assert(await page.evaluate(() => localStorage.getItem('other:test')) === 'keep', 'namespace reset');
assert(await page.locator('#interests').inputValue().then(t => t.startsWith('Хочу')), 'seed reset');
await page.reload();
await mkdir('../docs/previews', { recursive: true });
await page.screenshot({ path: '../docs/previews/s01-desktop.png', fullPage: true });
await page.setViewportSize({ width: 360, height: 800 });
assert(await page.evaluate(() => document.documentElement.scrollWidth <= 360), 'mobile overflow');
await page.screenshot({ path: '../docs/previews/s01-mobile.png', fullPage: true });
await page.getByRole('link', { name: 'К выбору практики' }).click();
await page.getByRole('heading', { name: 'Поиск практики' }).waitFor();
await page.goBack();
await page.locator('#interests').waitFor();
assert(await page.locator('#interests').isVisible(), 'browser back');
await page.goto((process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/') + '#/practices/unknown');
assert(await page.getByRole('heading', { name: 'Страница не найдена' }).isVisible(), 'unknown ID');
await page.goto((process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/') + '#/student');
const second = await page.context().newPage();
await second.goto((process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5173/') + '#/student');
await second.locator('#interests').fill('Из другой вкладки');
await second.getByRole('button', { name: 'Сохранить интересы' }).click();
await page.getByRole('button', { name: 'Загрузить обновления' }).waitFor();
await page.getByRole('button', { name: 'Загрузить обновления' }).click();
await second.close();
await page.reload();
assert(await page.locator('#interests').inputValue() === 'Из другой вкладки', 'cross tab load');
await page.evaluate(() => localStorage.setItem('stroitelnaia-kariera:demo:v1', 'broken'));
await page.reload();
assert(await page.getByRole('alert').isVisible(), 'corrupt warning');
await page.getByLabel('Тестовая роль').selectOption('employer_sever_demo');
assert(
  await page.evaluate(() => localStorage.getItem('stroitelnaia-kariera:demo:v1')) === 'broken',
  'no overwrite'
);
await page.locator('.demo-tools').evaluate(el => el.open = true);
await page.getByRole('button', { name: 'Начать заново' }).click();
await page.getByRole('button', { name: 'Восстановить исходный набор', exact: true }).click();
await page.evaluate(() => {
  Storage.prototype.setItem = () => {
    throw new DOMException('blocked', 'QuotaExceededError');
  };
});
await page.locator('#interests').fill('В памяти');
await page.getByRole('button', { name: 'Сохранить интересы' }).click();
assert(
  await page.getByRole('alert').innerText().then(t => t.includes('пока не сохранены')),
  'quota warning'
);
assert(await page.locator('#interests').inputValue() === 'В памяти', 'memory remains');
assert(errors.length === 0, errors.join('\n'));
console.log('PASS: 4 роли, сохранение, перезагрузка, отмена/сброс namespace, маршруты/назад, повреждение, ошибка записи, 360 px; скриншоты сохранены.');
await browser.close();
