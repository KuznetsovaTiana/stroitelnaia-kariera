/* global window */
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.DEMO_BASE_URL??'http://127.0.0.1:4187/';
const roles=[
 ['student','persona_anna','/student',['/practices','/jobs','/companies','/student/profile','/student/education','/student/resumes','/student/applications','/student/practices','/student/saved','/student/settings','/student/more']],
 ['employer','employer_sever_demo','/employer',['/employer/students','/employer/students/student_anna_demo?offer=offer_pto_demo','/employer/applications','/employer/practices','/employer/jobs','/employer/interns','/employer/company','/employer/team','/employer/university-requests','/employer/analytics','/employer/more']],
 ['coordinator','coordinator_mgsu_demo','/university',['/university/approvals','/university/students','/university/company-requests','/university/requirements','/university/templates','/university/profile','/university/programs','/university/import','/university/analytics','/university/more']],
 ['operator','operator_demo','/operator',['/operator/organizations','/operator/offers','/operator/appeals','/operator/dictionaries','/operator/content','/operator/users','/operator/reports','/operator/ai-quality','/operator/integrations','/operator/more']]
];
const openProfileSearch=async page=>{if(!await page.locator('.profile-editor').count())await page.getByRole('button',{name:'Редактировать: Что я ищу',exact:true}).click()};
try{
 for(const [role,id,home,routes] of roles){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(base+'#/demo?role='+role);await page.getByLabel('Тестовый профиль').selectOption(id);await page.getByRole('button',{name:/Продолжить как/}).click();
  for(const width of [1440,390,360]){
   await page.setViewportSize({width,height:900});await page.goto(base+'#'+home);
   await expect(page.locator('.home-next .primary')).toHaveCount(1);
   const target=await page.locator('.home-next .primary').getAttribute('href');await page.locator('.home-next .primary').click();await expect(page).toHaveURL(base+target);
   await page.goto(base+'#'+home);
   await page.screenshot({path:'../docs/previews/tasks-'+role+'-'+width+'.png',fullPage:true});
   for(const route of routes){
    await page.goto(base+'#'+route);await expect(page.locator('main h1')).toHaveCount(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),role+' '+route+' '+width).toBe(true);
   }
  }
  await page.goto(base+'#'+home);await page.locator('.brand:visible').click();await expect(page.getByRole('heading',{name:/Добро пожаловать/})).toBeVisible();await page.getByRole('link',{name:/Вернуться в кабинет/}).click();await expect(page).toHaveURL(new RegExp('#'+home+'$'));expect(errors).toEqual([]);await context.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('dialog',d=>d.accept());
 const enter=async(role,id)=>{await page.goto(base+'#/demo?role='+role);await page.getByLabel('Тестовый профиль').selectOption(id);await page.getByRole('button',{name:/Продолжить как/}).click()};
 for(const id of ['employer_manager_demo','employer_documents_demo']){
  await enter('employer',id);await expect(page.locator('.home-next .primary')).toHaveAttribute('href','#/employer/interns');
  await expect(page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Кандидаты',exact:true})).toHaveCount(0);
 }
 await enter('employer','employer_recruiter_demo');await expect(page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Кандидаты',exact:true})).toBeVisible();
 await page.goto(base+'#/employer/students');await expect(page.getByRole('button',{name:'Отправить приглашение'})).toHaveCount(0);
 await page.locator('.candidate-result a.button').first().click();await expect(page.getByRole('button',{name:'Отправить приглашение'})).toBeVisible();
 await page.getByLabel('Текст приглашения').fill('Приглашаем обсудить учебную практику');await page.getByRole('button',{name:'Отправить приглашение'}).click();await expect(page.getByRole('status')).toContainText('Приглашение сохранено');await page.reload();
 await enter('student','persona_anna');await page.goto(base+'#/student/applications');await expect(page.locator('main')).toContainText('Приглашения');
 await page.goto(base+'#/practices');await page.getByLabel('Название или компания').fill('ПТО');await expect(page).toHaveURL(/practices\?q=/);const search=page.url();await page.locator('.search-result h2 a').first().click();await expect(page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Поиск',exact:true})).toHaveAttribute('aria-current','page');await page.getByRole('link',{name:'← Вернуться к выдаче'}).click();expect(page.url()).toBe(search);
 await page.goto(base+'#/student/profile');await openProfileSearch(page);await page.getByLabel('Профессиональные интересы').fill('Проверка нового профиля');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.reload();await openProfileSearch(page);await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Проверка нового профиля');
 await enter('employer','employer_sever_demo');await enter('student','persona_anna');await page.goto(base+'#/student/profile');await openProfileSearch(page);await expect(page.getByLabel('Профессиональные интересы')).toHaveValue('Проверка нового профиля');
 await page.close();console.log('PASS task navigation: four homes, 42 lists/forms at desktop/mobile, primary transitions, permissions, candidate invite, search return, active detail navigation, profile persistence across roles.');
}finally{await browser.close()}
