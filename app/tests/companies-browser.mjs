import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.DEMO_BASE_URL??'http://127.0.0.1:4187/';
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.getByRole('link',{name:'Выбрать роль'}).click();await page.getByRole('button',{name:/^Студент/}).click();await page.getByRole('button',{name:/Продолжить как/}).click();await page.goto(base+'#/companies');
 const cards=page.locator('.company-card');await expect(cards).toHaveCount(4);await expect(page.locator('.company-logo img')).toHaveCount(0);
 const initialCounts=await cards.locator('.company-offer-count').allTextContents();
 for(const width of [1440,1024,768,390,360]){
  await page.setViewportSize({width,height:900});await expect(cards).toHaveCount(4);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const columns=await cards.evaluateAll(nodes=>new Set(nodes.map(n=>Math.round(n.getBoundingClientRect().x))).size);expect(columns).toBe(width>1100?2:1);
  for(const card of await cards.all()){await expect(card.locator('.company-logo')).toBeVisible();await expect(card.getByRole('link',{name:'Карточка компании'})).toBeVisible();}
  expect(await cards.locator('.company-offer-count').allTextContents()).toEqual(initialCounts);
  await page.screenshot({path:`../docs/previews/companies-${width}.png`,fullPage:true});
 }
 await page.getByLabel('Название компании').fill('Северный');await expect(cards).toHaveCount(1);await page.reload();await expect(cards).toHaveCount(1);const count=await cards.locator('.company-offer-count strong').textContent();
 await cards.getByRole('link',{name:'Карточка компании'}).click();await expect(page.getByRole('heading',{name:'Северный контур — демо',exact:true})).toBeVisible();await page.goBack();await expect(cards).toHaveCount(1);await expect(cards.locator('.company-offer-count strong')).toHaveText(count);
 await page.getByLabel('Название компании').fill('Нет такой компании');await expect(cards).toHaveCount(0);await expect(page.getByText('Ничего не найдено.',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Сбросить фильтры'}).click();await expect(cards).toHaveCount(4);
 await page.getByLabel('Регион компании').selectOption('Казань');await expect(page).toHaveURL(/region=/);const regionCount=await cards.count();expect(regionCount).toBeGreaterThan(0);await page.reload();await expect(cards).toHaveCount(regionCount);await page.getByLabel('Направление компании').selectOption('ПТО');await expect(page).toHaveURL(/direction=/);await page.getByRole('link',{name:'Сбросить фильтры'}).click();await expect(cards).toHaveCount(4);
 // Test-only company: verifies optional logo persistence, zero offers and load-error fallback.
 await page.route('**/test-company-logo.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" fill="#ddd7cc"/></svg>'}));
 const addLogo=async logoUrl=>page.evaluate(logoUrl=>{const key='stroitelnaia-kariera:demo:v1',state=JSON.parse(localStorage.getItem(key));state.changes.b2??={practices:{},documents:[],tasks:[],messages:[],invitations:[],offers:{},companies:{}};state.changes.b2.companies.test_company={id:'test_company',name:'Тестовый знак — демо',description:'Только браузерная проверка',status:'approved',logoUrl,version:1,createdAt:'2026-10-14',updatedAt:'2026-10-14'};localStorage.setItem(key,JSON.stringify(state))},logoUrl);
 await addLogo('./test-company-logo.svg');await page.reload();const fixture=cards.filter({hasText:'Тестовый знак — демо'});await expect(fixture).toHaveCount(1);await expect(fixture.locator('img')).toBeVisible();expect(await fixture.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);await expect(fixture.locator('.company-offer-count strong')).toHaveText('0');
 await page.route('**/missing-company-logo.svg',r=>r.fulfill({status:404,body:''}));await addLogo('./missing-company-logo.svg');await page.reload();await expect(fixture.locator('.company-logo img')).toHaveCount(0);await expect(fixture.getByLabel('Условный знак компании «Тестовый знак — демо»')).toHaveText('ТЗ');
 expect(errors).toEqual([]);console.log('PASS: company cards 1440/1024/768/390/360, columns/no overflow, unchanged counts, search/region/direction/reset, detail/Back/reload, optional logo persistence, zero offers, broken image fallback; no JS errors.');
}finally{await context.close();await browser.close()}
