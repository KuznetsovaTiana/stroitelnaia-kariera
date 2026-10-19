import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:4175/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let accept = false;
page.on('dialog', d => accept ? d.accept() : d.dismiss());
const go = async r => {
  await page.goto(base + '#' + r);
  await page.locator('main h1').first().waitFor();
};
const role = async id => page.getByLabel('Тестовая роль').selectOption(id);
const key = 'stroitelnaia-kariera:demo:v1';
try {
  await go('/student');
  await page.evaluate(() => localStorage.setItem('unrelated:demo', 'keep'));
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти к содержимому' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await go('/student/profile');
  await go('/student/resumes');
  await role('employer_sever_demo');
  await go('/employer/practices/new/edit');
  await page.getByLabel('Название предложения').fill('Черновик SC10');
  await page.getByLabel('Назначенный наставник').fill('Наставник — демо');
  await page.getByLabel('Ожидаемые учебные задачи').fill('Учебный график SC10');
  await page.getByRole('button', { name: 'Сохранить предложение', exact: true }).click();
  await expect.poll(() => page.evaluate(
    k => Object.values(JSON.parse(localStorage.getItem(k)).changes.b2?.offers ?? {}).some(o => o.title === 'Черновик SC10'),
    key
  ))
    .toBe(true);
  await role('persona_anna');
  await page.reload();
  await role('employer_sever_demo');
  await go('/employer/practices');
  await expect(page.locator('main')).toContainText('Черновик SC10');
  const clean = await browser.newContext();
  const cp = await clean.newPage();
  await cp.goto(base + '#/student');
  await expect(cp.getByLabel('Тестовая роль')).toHaveValue('persona_anna');
  await expect(cp.locator('main')).not.toContainText('Черновик SC10');
  await clean.close();
  await go('/employer/practices');
  await go('/employer/practices/new/edit');
  await page.getByLabel('Название предложения').fill('Не потерять при возврате');
  await page.goBack();
  await expect(page.getByLabel('Название предложения')).toHaveValue('Не потерять при возврате');
  await expect(page).toHaveURL(/new\/edit/);
  accept = true;
  await go('/employer/practices');
  accept = false;
  await page.locator('.demo-tools').evaluate(el => el.open = true);
  await page.getByRole('button', { name: 'Начать заново', exact: true }).click();
  const reset = page.getByRole('dialog');
  await expect(reset.getByRole('button', { name: 'Отмена', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(reset.getByRole('button', { name: 'Восстановить исходный набор' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(reset).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Начать заново', exact: true })).toBeFocused();
  await page.locator('.demo-tools').evaluate(el => el.open = true);
  await page.getByRole('button', { name: 'Начать заново', exact: true }).click();
  await page.getByRole('button', { name: 'Восстановить исходный набор' }).click();
  await expect(page.getByLabel('Тестовая роль')).toHaveValue('persona_anna');
  expect(await page.evaluate(() => localStorage.getItem('unrelated:demo'))).toBe('keep');
  await role('operator_demo');
  await go('/operator/reports');
  await page.getByRole('button', { name: 'Экспорт текущей выборки CSV' }).click();
  const exp = page.getByRole('dialog');
  await expect(exp.getByRole('button', { name: 'Отмена экспорта' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(exp.getByRole('button', { name: 'Скачать CSV', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(exp.getByRole('button', { name: 'Отмена экспорта' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(exp).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Экспорт текущей выборки CSV' })).toBeFocused();
  await role('persona_anna');
  for (const route of [
    '/documents/missing',
    '/support/missing',
    '/student/practices/missing',
    '/practices/missing',
    '/unknown'
  ]) {
    await go(route);
    await expect(page.locator('main')).toContainText(/не найден|недоступ/i);
    await page.reload();
    await expect(page.locator('main')).toContainText(/не найден|недоступ/i);
  }
  await go('/student');
  await page.evaluate(k => localStorage.setItem(k, '{broken'), key);
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe('{broken');
  await page.locator('.demo-tools').evaluate(el => el.open = true);
  await page.getByRole('button', { name: 'Начать заново', exact: true }).click();
  await page.getByRole('button', { name: 'Восстановить исходный набор' }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  await go('/student');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await mkdir('../docs/previews', { recursive: true });
  await page.screenshot({ path: '../docs/previews/d-student-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log('PASS D/SC10: saved draft across roles/reload, independent context, back/discard protection, reset namespace, modal keyboard/focus restoration, unknown IDs, corrupt storage, 360px; no JS errors.');
} finally {
  await browser.close();
}
