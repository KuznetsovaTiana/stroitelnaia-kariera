import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.DEMO_BASE_URL??'http://127.0.0.1:4187/';
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const key='stroitelnaia-kariera:demo:v1';
const start=async(role,id)=>{await page.locator('.role-choice').filter({hasText:new RegExp('^'+role)}).click();await page.getByLabel('Тестовый профиль').selectOption(id);await page.getByRole('button',{name:/Продолжить как/}).click()};
const openProfileSearch=async page=>{if(!await page.locator('.profile-editor').count())await page.getByRole('button',{name:'Редактировать: Что я ищу',exact:true}).click()};
try{
 await page.goto(base);await expect(page.getByRole('heading',{name:/Добро пожаловать/})).toBeVisible();await expect(page.locator('.sidebar,.notification-link')).toHaveCount(0);
 await page.getByRole('link',{name:'Выбрать роль'}).click();
 for(const [role,id,home] of [['Студент','persona_anna','student'],['Работодатель','employer_sever_demo','employer'],['Координатор вуза','coordinator_mgsu_demo','university'],['Оператор','operator_demo','operator']]){
  await start(role,id);await expect(page).toHaveURL(new RegExp('#/'+home+'$'));await expect(page.locator('.scenario-title')).toContainText(role);await expect(page.locator('.personal-identity .avatar')).toBeVisible();await expect(page.locator('header select')).toHaveCount(0);
  for(const width of [1366,360]){await page.setViewportSize({width,height:900});await expect(page.locator('.personal-identity .avatar')).toBeVisible();await expect(page.locator('header .header-change-role')).toBeInViewport();await expect(page.locator('header .case-in-mark')).toBeInViewport();expect(await page.locator('header .case-in-mark').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.locator('.workspace>header').screenshot({path:`../docs/previews/personal-header-${home}-${width}.png`});}
  const before=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.getByRole('link',{name:'О платформе',exact:true}).click();await expect(page.getByRole('heading',{name:'О платформе',exact:true})).toBeVisible();await page.reload();await expect(page.locator('.scenario-title')).toContainText(role);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
  await page.goBack();await expect(page).toHaveURL(new RegExp('#/'+home+'$'));await page.goForward();await expect(page.getByRole('heading',{name:'О платформе',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Вернуться в кабинет',exact:true}).click();await expect(page).toHaveURL(new RegExp('#/'+home+'$'));
  await page.goto(base+'#/help');await page.getByRole('link',{name:'Вернуться в кабинет',exact:true}).click();await expect(page).toHaveURL(new RegExp('#/'+home+'$'));expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
  await page.goto(base+'#/practices');await expect(page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link').first()).toHaveAttribute('href','#/'+home);await expect(page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'О платформе'})).toHaveCount(0);
  await page.locator('.brand:visible').click();await expect(page.getByRole('heading',{name:/Добро пожаловать/})).toBeVisible();await page.getByRole('link',{name:/Вернуться в кабинет/}).click();await expect(page).toHaveURL(new RegExp('#/'+home+'$'));await page.reload();await expect(page.locator('.scenario-title')).toContainText(role);
  await page.getByRole('link',{name:'Сменить роль'}).click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);await page.getByRole('link',{name:'Вернуться в кабинет'}).click();await expect(page).toHaveURL(new RegExp('#/'+home+'$'));
  await page.getByRole('link',{name:'Сменить роль'}).click();
 }
 for(const [id,label] of [['employer_recruiter_demo','Рекрутер'],['employer_manager_demo','Руководитель подразделения'],['employer_documents_demo','Специалист по документам']]){
  await start('Работодатель',id);await expect(page.locator('.scenario-title')).toHaveText('Работодатель · '+label);await expect(page.locator('.scenario-indicator .header-change-role')).toHaveCount(1);await expect(page.locator('header select')).toHaveCount(0);await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);await page.getByRole('link',{name:'Сменить роль'}).click();
 }
 await start('Студент','persona_anna');await page.goto(base+'#/student/profile');await openProfileSearch(page);await page.getByLabel('Профессиональные интересы').fill('Сохранённый результат');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.reload();await openProfileSearch(page);await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Сохранённый результат');
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await openProfileSearch(page);await page.getByLabel('Профессиональные интересы').fill('Несохранённый текст');page.once('dialog',d=>d.dismiss());await page.getByRole('link',{name:'Сменить роль'}).click();await openProfileSearch(page);await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Несохранённый текст');
 page.once('dialog',d=>d.accept());await page.getByRole('link',{name:'Сменить роль'}).click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
 await start('Работодатель','employer_sever_demo');await page.getByRole('link',{name:'Сменить роль'}).click();await start('Студент','persona_anna');await page.goto(base+'#/student/profile');await openProfileSearch(page);await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Сохранённый результат');
 if(await page.locator('.profile-editor').count())await page.getByRole('button',{name:'Отмена',exact:true}).click();
 for(const width of [1366,768,390,360]){
  await page.setViewportSize({width,height:900});await expect(page.locator('.personal-identity .avatar')).toBeVisible();await page.screenshot({path:`../docs/previews/personal-workspace-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.goto(base+'#/student/profile');await expect(page.locator('.profile-identity .avatar-large')).toBeVisible();await page.screenshot({path:`../docs/previews/personal-profile-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.locator('.brand:visible').click();await page.getByRole('link',{name:/Вернуться в кабинет/}).click();
 }
 const fresh=await browser.newContext(),direct=await fresh.newPage();await direct.goto(base+'#/operator/users');await expect(direct).toHaveURL(/#\/demo$/);await direct.getByRole('button',{name:/^Студент/}).click();await direct.getByRole('button',{name:/Продолжить как/}).click();await expect(direct).toHaveURL(/operator\/users/);await expect(direct.locator('main')).toContainText(/недоступ|Недоступ/);await fresh.close();
 expect(errors).toEqual([]);console.log('PASS: 4 roles, 3 employer subroles; about/help preserve profile/data, role menu in catalogs, logo home/reload, separate change role/cancel, unsaved form protection, cross-role saved interests, identity/profile at 1366/768/390/360px, direct-link access; no JS errors.');
}finally{await browser.close()}
