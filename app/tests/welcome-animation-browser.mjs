/* global window */
import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4187/';
const errors = [];
const sample = async (page, time) => page.locator('.architecture-frame').evaluate(
  (frame, time) => {
    for (const image of frame.querySelectorAll('img')) for (const animation of image.getAnimations()) {
      animation.pause();
      animation.currentTime = time;
    }
    return [...frame.querySelectorAll('img')].map(im => ({
      opacity: Number(window.getComputedStyle(im).opacity),
      transform: window.getComputedStyle(im).transform
    }));
  },
  time
);
try {
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 }
  ]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    const background = page.locator('.architecture-background');
    await expect(background).toHaveAttribute('data-phase', 'cycling');
    await expect(background).toHaveAttribute('data-completed', 'true');
    const frames = await background.locator('img').evaluateAll(images => images.map(im => ({
      w: im.clientWidth,
      h: im.clientHeight,
      x: im.getBoundingClientRect().x,
      y: im.getBoundingClientRect().y,
      fit: window.getComputedStyle(im).objectFit,
      pos: window.getComputedStyle(im).objectPosition,
      loaded: im.naturalWidth > 0
    })));
    expect(frames).toHaveLength(3);
    for (const frame of frames) expect(frame).toEqual(frames[0]);
    expect(frames[0].loaded).toBe(true);
    if (viewport.width <= 430) expect(frames[0].fit).toBe('contain');
    const start = await sample(page, 0);
    expect(start.map(s => s.opacity)).toEqual([1, 0, 0]);
    const concrete = await sample(page, 6000);
    expect(concrete.map(s => s.opacity)).toEqual([1, 1, 0]);
    const completed = await sample(page, 10000);
    expect(completed.map(s => s.opacity)).toEqual([1, 1, 1]);
    expect((await sample(page, 10800)).map(s => s.opacity)).toEqual([1, 1, 1]);
    expect((await sample(page, 15000)).map(s => s.opacity)).toEqual([1, 1, 0]);
    expect((await sample(page, 19000)).map(s => s.opacity)).toEqual([1, 0, 0]);
    for (const [time, layer] of [[3000, 1], [8000, 2], [13000, 2], [17000, 1]]) {
      const values = await sample(page, time);
      expect(values[layer].opacity).toBeGreaterThan(0);
      expect(values[layer].opacity).toBeLessThan(1);
      expect(values[0].opacity).toBe(1);
      expect(values[3 - layer].opacity).toBe(layer === 1 ? 0 : 1);
      expect(values.every(v => v.transform === 'none')).toBe(true);
    }
    for (const seam of [
      10000,
      11000,
      15000,
      19000,
      20000,
      40000,
      60000
    ]) {
      const a = await sample(page, seam - 10);
      const b = await sample(page, seam + 10);
      for (let i = 0;i < 3;i++)expect(Math.abs(a[i].opacity - b[i].opacity)).toBeLessThan(.002);
    }
    for (const [name, time] of [['drawing', 0], ['concrete', 6000], ['completed', 10000], ['reverse', 17000]]) {
      await sample(page, time);
      if ([1440, 390].includes(viewport.width)) await page.screenshot({ path: '../docs/previews/cycle-' + name + '-' + viewport.width + '.png' });
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight
      && document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.locator('a.button[href="#/demo"]').click();
    await expect(page.locator('.role-entry')).toBeVisible();
    await page.close();
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(base);
  await expect(reduced.locator('.architecture-background')).toHaveAttribute('data-phase', 'final');
  expect(await reduced.locator('.architecture-frame').evaluate(el => el.getAnimations({ subtree: true }).length))
    .toBe(0);
  await reduced.close();
  for (const source of ['drawing', 'final', 'completed']) {
    const fallback = await browser.newPage();
    await fallback.route('**/welcome-' + source + '.webp', route => route.abort());
    await fallback.goto(base);
    await expect(fallback.locator('.architecture-background')).toHaveAttribute('data-phase', 'final');
    expect(await fallback.locator('.architecture-frame').evaluate(el => el.getAnimations({ subtree: true }).length))
      .toBe(0);
    await fallback.close();
  }
  const dynamic = await browser.newPage();
  await dynamic.goto(base);
  await expect(dynamic.locator('.architecture-background')).toHaveAttribute('data-phase', 'cycling');
  await dynamic.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dynamic.locator('.architecture-background')).toHaveAttribute('data-phase', 'final');
  await dynamic.close();
  // Watch three uninterrupted real-time cycles simultaneously on desktop and mobile.
  const natural = await Promise.all([{ width: 1440, height: 960 }, { width: 390, height: 844 }].map(async viewport => {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await expect(page.locator('.architecture-background')).toHaveAttribute('data-phase', 'cycling');
    return page;
  }));
  console.log('PASS deterministic stages, all reverse seams, mobile crop, entry CTA, reduced motion and missing assets. Watching three natural 20s cycles...');
  await Promise.all(natural.map(async page => {
    await expect.poll(
      () => page.locator('.architecture-final').evaluate(im => im.getAnimations()[0]?.effect.getComputedTiming().currentIteration ?? 0),
      { timeout: 65000, intervals: [1000] }
    )
      .toBeGreaterThanOrEqual(3);
    await expect(page.locator('.architecture-background')).toHaveAttribute('data-phase', 'cycling');
    // Visibility pausing is emulated because a headless tab has no foreground UI.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new window.Event('visibilitychange'));
    });
    await expect(page.locator('.architecture-background')).toHaveAttribute('data-paused', 'true');
    const clock = () => page.locator('.architecture-final').evaluate(im => im.getAnimations()[0].currentTime);
    const before = await clock();
    await page.waitForTimeout(200);
    expect(await clock()).toBe(before);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new window.Event('visibilitychange'));
    });
    await expect(page.locator('.architecture-background')).toHaveAttribute('data-paused', 'false');
    await page.close();
  }));
  expect(errors).toEqual([]);
  console.log('PASS three real-time cycles on desktop and mobile, hidden-tab pause/resume, no runtime errors.');
} finally {
  await browser.close();
}
