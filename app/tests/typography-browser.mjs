/* global window */
import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:4187/';
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  const loaded = () => page.evaluate(() => document.fonts.ready);
  const overflow = async (label) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), label).toBe(true);
  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [430, 932], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base);
    await loaded();
    const font = await page.evaluate(async () => {
      await document.fonts.load('400 16px Manrope', 'Строительная карьера');
      return {
        loaded: document.fonts.check('400 16px Manrope'),
        requests: window.performance.getEntriesByType('resource').filter(e => e.name.includes('Manrope') && e.name.endsWith('.ttf'))
          .length
      };
    });
    expect(font.loaded).toBe(true);
    expect(font.requests).toBe(1);
    await overflow('welcome ' + width);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
      'welcome height ' + width
    )
      .toBe(true);
    await page.goto(base + '#/demo');
    await loaded();
    await overflow('roles ' + width);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
      'roles height ' + width
    )
      .toBe(true);
  }
  const enter = async (role) => {
    await page.goto(base + '#/demo?role=' + role);
    await page.getByRole('button', { name: /Продолжить как/ }).click();
  };
  const pages = [
    [
      'student',
      [
        '/student',
        '/student/profile',
        '/practices',
        '/jobs',
        '/practices/offer_pto_demo',
        '/companies',
        '/companies/company_sever_demo',
        '/student/resumes/resume_0/edit'
      ]
    ],
    [
      'employer',
      ['/employer', '/employer/students', '/employer/students/student_anna_demo?offer=offer_pto_demo']
    ],
    ['coordinator', ['/university', '/university/approvals']],
    ['operator', ['/operator', '/operator/organizations']]
  ];
  for (const [role, routes] of pages) {
    await enter(role);
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(base + '#' + route);
        await loaded();
        await overflow(route + ' ' + width);
        const fonts = await page.locator('main h1,main h2,main h3,main p,main button,.sidebar nav a').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height > 0).map(e => ({ font: window.getComputedStyle(e).fontFamily, text: e.textContent.slice(0, 40) })));
        expect(fonts.every(f => f.font.includes('Manrope')), route).toBe(true);
        if ([390, 1440].includes(width)) await page.screenshot({
          path: '../docs/previews/type-' + route.split('?')[0].replaceAll('/', '-').slice(1) + '-' + width + '.png',
          fullPage: true
        });
      }
    }
  }
  // Equivalent narrow CSS viewport of a desktop browser at 200% zoom.
  await enter('student');
  await page.setViewportSize({ width: 640, height: 500 });
  await page.goto(base + '#/student/profile');
  await overflow('profile zoom equivalent');
  expect(await page.locator('.profile-completion').evaluate(e => window.getComputedStyle(e).fontVariantNumeric))
    .toContain('tabular-nums');
  expect(errors).toEqual([]);
  console.log('PASS typography: one local Manrope request, Cyrillic, entry fits, 15 key pages at 320/390/430/1440, all text families, narrow zoom and tabular numbers.');
} finally {
  await browser.close();
}
