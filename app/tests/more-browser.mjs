import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:4186/';
const key = 'stroitelnaia-kariera:demo:v1';
try {
  await page.goto(base);
  for (const [role, id, home] of [
    ['Студент', 'persona_anna', 'student'],
    ['Работодатель', 'employer_sever_demo', 'employer'],
    ['Координатор вуза', 'coordinator_mgsu_demo', 'university'],
    ['Оператор', 'operator_demo', 'operator']
  ]) {
    if (await page.getByRole('link', { name: 'Выбрать роль' }).count()) await page.getByRole('link', { name: 'Выбрать роль' }).click();
    await page.getByRole('button', { name: new RegExp('^' + role) }).click();
    await page.getByLabel('Тестовый профиль').selectOption(id);
    await page.getByRole('button', { name: /Продолжить как/ }).click();
    await page.goto(base + '#/' + home + '/more');
    const groups = page.locator('.more-groups');
    await expect(groups.locator(':scope > section')).toHaveCount(3);
    await expect(groups.getByRole('heading', { name: 'Демонстрация', exact: true })).toHaveCount(0);
    await expect(groups.getByText(/Учебная дата и ограничения|Начать заново|На публичный сайт/)).toHaveCount(0);
    if (home === 'university') {
      const boxes = await groups.locator(':scope > section').evaluateAll(nodes => nodes.map(n => ({ x: n.getBoundingClientRect().x, y: n.getBoundingClientRect().y })));
      expect(new Set(boxes.map(b => b.y)).size).toBe(1);
      expect(new Set(boxes.map(b => b.x)).size).toBe(3);
      await page.screenshot({ path: '../docs/previews/more-coordinator-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 360, height: 800 });
      const mobile = await groups.locator(':scope > section').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().x));
      expect(new Set(mobile).size).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      await page.screenshot({ path: '../docs/previews/more-coordinator-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.locator('footer').getByRole('link', { name: 'Учебная дата и ограничения' }).click();
    await expect(page.locator('main')).toContainText('Учебная дата сценария:');
    await page.getByRole('button', { name: 'Сбросить демоданные', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Это действие нельзя отменить');
    await page.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('link', { name: 'Сменить роль' }).click();
  }
  if (await page.getByRole('link', { name: 'Выбрать роль' }).count()) await page.getByRole('link', { name: 'Выбрать роль' }).click();
  await page.getByRole('button', { name: /^Студент/ }).click();
  await page.getByLabel('Тестовый профиль').selectOption('persona_anna');
  await page.getByRole('button', { name: /Продолжить как/ }).click();
  await page.getByLabel('Профессиональные интересы').fill('Проверка сброса');
  await page.getByRole('button', { name: 'Сохранить интересы' }).click();
  await page.evaluate(() => localStorage.setItem('unrelated:keep', 'yes'));
  await page.locator('footer').getByRole('link', { name: 'Учебная дата и ограничения' }).click();
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  await page.getByRole('button', { name: 'Сбросить демоданные', exact: true }).click();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
  await page.getByRole('button', { name: 'Сбросить демоданные', exact: true }).click();
  await page.getByRole('button', { name: 'Восстановить исходный набор' }).click();
  await expect(page.getByRole('heading', { name: /Добро пожаловать/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated:keep'))).toBe('yes');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).changes.interests, key)).toEqual({});
  await page.reload();
  await expect(page.getByRole('heading', { name: /Добро пожаловать/ })).toBeVisible();
  expect(errors).toEqual([]);
  console.log('PASS: More for all roles, coordinator 3 columns/360px stack, footer date/limitations, reset cancel/confirm/namespace/reload; no JS errors.');
} finally {
  await browser.close();
}
