/* global window */
import {chromium,expect} from '@playwright/test';
const base=process.env.DEMO_BASE_URL??'http://127.0.0.1:5190/';
const browser=await chromium.launch({channel:'msedge',headless:true}),key='stroitelnaia-kariera:demo:v1';
try{
 for(const width of [360,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/demo?role=student');await page.getByLabel('Тестовый профиль').selectOption('persona_anna');await page.getByRole('button',{name:/Продолжить как/}).click();await page.goto(base+'#/student/profile');
  const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const open=async field=>{await page.locator('#profile-'+field).getByRole('button',{name:'Заполнить с помощью ИИ',exact:true}).click();await page.locator('.profile-editor').getByRole('button',{name:'ИИ-помощник',exact:true}).click();await expect(page.locator('.ai-assistant')).toContainText('Демонстрационный режим · без языковой модели')};
  await open('about');await page.getByLabel('Ваше сообщение',{exact:true}).fill('Мне интересны графики строительства');await page.getByRole('button',{name:'Отправить',exact:true}).click();await expect(page.locator('.ai-dialog')).toContainText('Какие строительные задачи');await page.getByLabel('Ваше сообщение',{exact:true}).fill('В курсовой составила учебный график работ');await page.getByRole('button',{name:'Отправить',exact:true}).click();await expect(page.getByLabel('Изменить текст',{exact:true})).toBeVisible();
  expect((await stored()).changes.b1?.profiles?.student_anna_demo?.professional?.about).toBeUndefined();
  await page.getByLabel('Изменить текст',{exact:true}).fill('В курсовой составила график работ. Интересует ПТО.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'../docs/previews/ai-about-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Добавить в профиль',exact:true}).click();await expect(page.locator('.ai-assistant')).toHaveCount(0);await expect(page.locator('#profile-about')).toContainText('Интересует ПТО');await page.reload();await expect(page.locator('#profile-about')).toContainText('демонстрационный помощник');
  expect((await stored()).changes.b1.assistant).toEqual({});
  await page.locator('#profile-experienceSummary').getByRole('button',{name:'Редактировать',exact:true}).click();await page.getByLabel('Текст от студента',{exact:true}).fill('В учебном проекте проверяла график.');await page.locator('.profile-editor').getByRole('button',{name:'Сохранить',exact:true}).click();
  await open('experienceSummary');await page.getByRole('button',{name:'Улучшить мой текст',exact:true}).click();await expect(page.getByLabel('Изменить текст',{exact:true})).toHaveValue('В учебном проекте проверяла график.');await page.getByRole('button',{name:'Добавить в профиль',exact:true}).click();
  // A failed live request keeps the message, rejects double submission and never writes the profile.
  let posts=0,release;const gate=new Promise(resolve=>{release=resolve});
  await page.route('**/.netlify/functions/ai',async route=>{if(route.request().method()==='GET')await route.fulfill({json:{mode:'live',available:true}});else{posts++;await gate;await route.fulfill({status:503,json:{error:'UNAVAILABLE'}})}});
  await page.locator('#profile-about').getByRole('button',{name:'Редактировать',exact:true}).click();await page.locator('.profile-editor').getByRole('button',{name:'ИИ-помощник',exact:true}).click();await expect(page.locator('.ai-assistant')).toContainText('GigaChat');await page.getByLabel('Ваше сообщение',{exact:true}).fill('Сообщение для повторной попытки');await page.getByRole('button',{name:'Отправить',exact:true}).evaluate(button=>{button.click();button.click()});await expect(page.getByRole('button',{name:'Готовим ответ…',exact:true})).toBeDisabled();await expect.poll(()=>posts).toBe(1);release();await expect(page.locator('.ai-assistant [role=alert]')).toContainText('ИИ-помощник сейчас недоступен');await expect(page.getByLabel('Ваше сообщение',{exact:true})).toHaveValue('Сообщение для повторной попытки');
  await page.getByRole('button',{name:'Закрыть ИИ-помощника',exact:true}).click();await page.locator('.profile-editor').getByRole('button',{name:'Отмена',exact:true}).click();await page.reload();await expect(page.locator('#profile-about')).toContainText('Интересует ПТО');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);await page.close();
 }
 console.log('PASS AI: actual local mock handler, both blocks, manual approval, provenance/reload, no persisted chat, live error/no fallback, draft kept, single request, 360/390/1440.');
}finally{await browser.close()}
