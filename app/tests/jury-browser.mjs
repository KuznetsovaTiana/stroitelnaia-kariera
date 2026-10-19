import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const p = await browser.newPage();
  p.on('dialog', d => d.accept());
  const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:4175/';
  await p.goto(base + '#/demo');
  await p.getByLabel('Тестовая роль').selectOption('coordinator_mgsu_demo');
  await p.goto(base + '#/university/practices/practice_1');
  await p.getByRole('button', { name: 'Демо: перейти к окончанию практики' }).click();
  await p.getByLabel('Пояснение итога').fill('Учебные задачи Марии выполнены и проверены для показа');
  await p.getByRole('button', { name: 'Зафиксировать зачёт' }).click();
  await p.reload();
  expect(await p.evaluate(() => JSON.parse(localStorage.getItem('stroitelnaia-kariera:demo:v1')).changes.b2.practices.practice_1.academicResult))
    .toBe('credited');
  await p.getByLabel('Тестовая роль').selectOption('operator_demo');
  await p.goto(base + '#/operator/reports');
  await expect(p.locator('main')).toContainText('Зачтённые практики (2 /');
  console.log('PASS jury: prepared Maria case → credited/reload → operator aggregate 2.');
} finally {
  await browser.close();
}
