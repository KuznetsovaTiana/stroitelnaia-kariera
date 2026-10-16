/* global window */
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.DEMO_BASE_URL||'http://127.0.0.1:4187/';
try{
 for(const viewport of [{width:1440,height:960},{width:390,height:844},{width:360,height:800}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);const background=page.locator('.architecture-background');
  await expect(background).toHaveAttribute('data-phase','reveal');
  await expect(background).toHaveAttribute('data-completed','true');
  const frames=await background.locator('img').evaluateAll(images=>images.map(im=>({w:im.clientWidth,h:im.clientHeight,x:im.getBoundingClientRect().x,y:im.getBoundingClientRect().y,fit:window.getComputedStyle(im).objectFit,pos:window.getComputedStyle(im).objectPosition,loaded:im.naturalWidth>0})));
  expect(frames).toHaveLength(3);for(const frame of frames)expect(frame).toEqual(frames[0]);expect(frames[0].loaded).toBe(true);
  await expect(background).toHaveAttribute('data-phase','final',{timeout:12000});
  expect(await page.locator('.architecture-actors,.architecture-controls').count()).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=window.innerHeight&&document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('a.button[href="#/demo"]').click();await expect(page.locator('.role-entry')).toBeVisible();expect(errors).toEqual([]);await page.close();
 }
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(base);await expect(reduced.locator('.architecture-background')).toHaveAttribute('data-phase','final');await reduced.close();
 const fallback=await browser.newPage();await fallback.route('**/welcome-drawing.webp',route=>route.abort());await fallback.goto(base);await expect(fallback.locator('.architecture-background')).toHaveAttribute('data-phase','final');await fallback.close();
 console.log('Welcome: restored stages, shared crop, desktop/mobile, no overflow, role navigation, reduced motion and missing drawing passed.');
}finally{await browser.close()}
