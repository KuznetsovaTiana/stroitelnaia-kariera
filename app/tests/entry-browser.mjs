import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.DEMO_BASE_URL??'http://127.0.0.1:4186/';
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const welcome=()=>expect(page.getByRole('heading',{name:/Добро пожаловать/})).toBeVisible();
const start=async(role,id)=>{await page.getByRole('button',{name:role,exact:false}).filter({has:page.locator('strong')}).click();await page.getByLabel('Тестовый профиль').selectOption(id);await page.getByRole('button',{name:'Начать тестирование'}).click()};
try{
 await page.goto(base);await welcome();await expect(page.getByLabel('Тестовая роль')).toHaveCount(0);await expect(page.locator('.sidebar,.demo-tools,.notification-link')).toHaveCount(0);
 await page.getByRole('link',{name:'Выбрать роль'}).click();await expect(page.getByRole('button',{name:'Начать тестирование'})).toBeDisabled();
 for(const [role,id,home] of [['Студент','persona_anna','student'],['Работодатель','employer_sever_demo','employer'],['Координатор вуза','coordinator_mgsu_demo','university'],['Оператор','operator_demo','operator']]){
  await start(role,id);await expect(page).toHaveURL(new RegExp('#/'+home+'$'));await expect(page.locator('.scenario-title')).toContainText('Демо · ');await expect(page.locator('header select')).toHaveCount(0);await page.locator('.brand:visible').click();await welcome();await page.reload();await welcome();await expect(page.locator('.sidebar')).toHaveCount(0);await page.getByRole('link',{name:'Выбрать роль'}).click();
 }
 for(const [id,label] of [['employer_recruiter_demo','Рекрутер'],['employer_manager_demo','Руководитель подразделения'],['employer_documents_demo','Специалист по документам']]){
  await start('Работодатель',id);await expect(page.locator('.scenario-title')).toHaveText('Демо · Работодатель · '+label);await expect(page.locator('.scenario-indicator a,.scenario-indicator button,.scenario-indicator select')).toHaveCount(0);
  const url=page.url();await page.locator('.scenario-title').click();expect(page.url()).toBe(url);await expect(page.getByRole('heading',{name:'Выберите роль',exact:true})).toHaveCount(0);
  await page.setViewportSize({width:360,height:800});await expect(page.locator('.mobile-brand')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);await page.screenshot({path:'../docs/previews/scenario-'+id+'-mobile.png',fullPage:true});
  await page.locator('.brand:visible').click();await welcome();await page.getByRole('link',{name:'Выбрать роль'}).click();await page.setViewportSize({width:1280,height:900});
 }
 await start('Студент','persona_anna');
 await page.getByLabel('Профессиональные интересы').fill('Сохранённый результат');await page.getByRole('button',{name:'Сохранить интересы'}).click();await page.reload();await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Сохранённый результат');
 const before=await page.evaluate(()=>localStorage.getItem('stroitelnaia-kariera:demo:v1'));
 await page.getByLabel('Профессиональные интересы').fill('Несохранённый текст');page.once('dialog',d=>d.dismiss());await page.locator('.brand:visible').click();await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Несохранённый текст');
 page.once('dialog',d=>d.accept());await page.locator('.brand:visible').click();await welcome();expect(await page.evaluate(()=>localStorage.getItem('stroitelnaia-kariera:demo:v1'))).toBe(before);
 await page.setViewportSize({width:360,height:800});await page.screenshot({path:'../docs/previews/welcome-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.architecture-cloud').evaluate(e=>globalThis.getComputedStyle(e).animationName)).toBe('none');
 await page.setViewportSize({width:1366,height:900});await page.screenshot({path:'../docs/previews/welcome-desktop.png',fullPage:true});
 const fresh=await browser.newContext(),direct=await fresh.newPage();await direct.goto(base+'#/operator/users');await expect(direct).toHaveURL(/#\/demo$/);await expect(direct.locator('.sidebar')).toHaveCount(0);
 await direct.getByRole('button',{name:/^Студент/}).click();await direct.getByLabel('Тестовый профиль').selectOption('persona_anna');await direct.getByRole('button',{name:'Начать тестирование'}).click();await expect(direct).toHaveURL(/operator\/users/);await expect(direct.locator('main')).toContainText(/недоступ|Недоступ/);await fresh.close();
 await page.getByRole('link',{name:'Выбрать роль'}).click();await page.setViewportSize({width:360,height:800});await page.getByRole('button',{name:/^Работодатель/}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);await page.screenshot({path:'../docs/previews/role-selection-mobile.png',fullPage:true});
 expect(errors).toEqual([]);console.log('PASS: first visit, four roles, logo/reload, data preservation, unsaved form cancel/confirm, direct-link access, 360px, reduced motion; no JS errors.');
}finally{await browser.close()}
