import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.DEMO_BASE_URL??'http://127.0.0.1:4186/';
const roles=[['Студент','student'],['Работодатель','employer'],['Координатор вуза','university'],['Оператор','operator']];
try{
 for(const [width,height] of [[1440,900],[1366,768],[1024,600],[768,1024],[430,932],[390,844],[360,640],[320,568],[844,390],[667,375]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await expect(page.locator('header .case-in-mark')).toBeVisible();
  expect(await page.locator('header .case-in-mark').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
  await page.getByRole('link',{name:'Выбрать роль'}).click();await expect(page.locator('.role-choice')).toHaveCount(4);expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
  for(const [title,home] of roles){
   const card=page.locator('.role-choice').filter({hasText:new RegExp('^'+title)});
   await card.locator('strong').click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
   await expect(dialog.getByRole('heading',{name:title,exact:true})).toBeVisible();
   const cta=dialog.getByRole('button',{name:/Продолжить как/});await expect(cta).toBeEnabled();
   const box=await cta.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   const contentSize=await dialog.locator('.role-dialog-content').evaluate(e=>({scroll:e.scrollHeight,height:e.clientHeight}));expect(contentSize.scroll,`dialog ${title} ${width}x${height}`).toBeLessThanOrEqual(contentSize.height+1);await page.screenshot({path:`../docs/previews/role-dialog-${home}-${width}.png`});
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(card).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);if(home==='student')await page.screenshot({path:`../docs/previews/role-fit-${width}x${height}.png`});
   await card.click();await dialog.getByRole('button',{name:'Назад',exact:true}).click();await expect(dialog).toHaveCount(0);
   await card.click();await page.goBack();await expect(dialog).toHaveCount(0);
   await card.click();await page.reload();await expect(dialog).toBeVisible();await cta.click();
   await expect(page).toHaveURL(new RegExp('#/'+home+'$'));await expect(page.locator('.scenario-title')).toContainText(title);
   await page.reload();await expect(page.locator('.scenario-title')).toContainText(title);
   if(width<700)await expect(page.locator('.sidebar nav').first()).toBeVisible();
   await page.locator('.brand:visible').click();await expect(page).toHaveURL(new RegExp('#/'+home+'$'));
   await page.getByRole('link',{name:'Сменить роль'}).click();
  }
  expect(errors).toEqual([]);await context.close();console.log('PASS roles, dialog/CTA, close/Escape/Back, reload, logo, overflow at',width,height);
 }
}finally{await browser.close()}
