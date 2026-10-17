/* global window */
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.DEMO_BASE_URL??'http://127.0.0.1:4187/';
const key='stroitelnaia-kariera:demo:v1';
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const enter=async(role,id)=>{await page.goto(base+'#/demo?role='+role);await page.getByLabel('Тестовый профиль').selectOption(id);await page.getByRole('button',{name:/Продолжить как/}).click()};
 const profile=()=>page.goto(base+'#/student/profile');
 const edit=async(name)=>{await page.getByRole('button',{name,exact:true}).click();return page.locator('.profile-editor')};
 const save=async()=>{await page.locator('.profile-editor').getByRole('button',{name:'Сохранить',exact:true}).click();await expect(page.locator('.profile-editor')).toHaveCount(0)};
 await enter('student','persona_anna');await profile();
 expect(await page.locator('.student-profile-section').count()).toBe(12);
 await expect(page.locator('#profile-experience')).toContainText('Опыт ещё не добавлен');
 await expect(page.locator('#profile-languages')).toContainText('Языки пока не указаны');
 await page.getByRole('button',{name:'Редактировать профиль',exact:true}).click();
 await page.getByLabel('Профессиональные интересы').fill('Хочу работать с графиками и документацией');
 await page.getByLabel('Тип занятости',{exact:true}).selectOption('Стажировка');await page.getByLabel('Формат работы',{exact:true}).selectOption('Гибрид');await page.getByLabel('Статус поиска').selectOption('Ищу стажировку');await save();
 await expect(page.locator('.profile-search-status')).toHaveText('Ищу стажировку');
 await edit('Добавить / изменить: Опыт и практика');await page.getByRole('button',{name:'Добавить место',exact:true}).click();
 await page.getByLabel('Компания',{exact:true}).fill('Учебный контур');await page.getByLabel('Должность',{exact:true}).fill('Практикант ПТО');await page.getByLabel('Начало',{exact:true}).fill('2026-05');await page.getByLabel('Окончание',{exact:true}).fill('2026-06');await page.getByLabel('Описание деятельности').fill('Подготовка учебного графика');await save();
 await expect(page.locator('#profile-experience')).toContainText('Указано студентом');
 await edit('Редактировать: Навыки');await page.getByLabel('Навыки через запятую').fill('Чтение чертежей, AutoCAD');await save();
 await edit('Добавить / изменить: Достижения и обучение');await page.getByRole('button',{name:'Добавить достижение',exact:true}).click();await page.getByLabel('Название достижения или курса').fill('Учебный кейс');await page.getByLabel('Организатор, год и результат').fill('Командный проект, 2026');await save();
 await edit('Редактировать: Языки');await page.getByRole('button',{name:'Добавить язык',exact:true}).click();await page.getByLabel('Язык',{exact:true}).fill('Русский');await save();
 await edit('Редактировать: Контакты');await expect(page.getByLabel('Видимость в поиске работодателя')).toHaveCount(0);await page.getByLabel('Email',{exact:true}).fill('anna@example.invalid');await save();await edit('Настроить видимость: Видимость');await expect(page.getByLabel('Email',{exact:true})).toHaveCount(0);await page.getByLabel('Видимость в поиске работодателя').selectOption('hidden');await save();await page.reload();
 await expect(page.locator('#profile-contacts')).toContainText('anna@example.invalid');await expect(page.locator('#profile-languages')).toContainText('Русский');
 await edit('Редактировать: Что я ищу');await page.getByLabel('Профессиональные интересы').fill('Отменённые изменения');await page.getByRole('button',{name:'Отмена',exact:true}).click();
 await expect(page.locator('#profile-search')).toContainText('Хочу работать с графиками');
 // Navigation away from a dirty edit can be cancelled or confirmed.
 await edit('Редактировать: Что я ищу');await page.getByLabel('Профессиональные интересы').fill('Несохранённый текст');
 page.once('dialog',d=>d.dismiss());await page.locator('.mobile-brand').click();await expect(page.locator('.profile-editor')).toBeVisible();
 page.once('dialog',d=>d.accept());await page.locator('.mobile-brand').click();await expect(page.getByRole('heading',{name:/Добро пожаловать/})).toBeVisible();
 await page.getByRole('link',{name:/Вернуться в кабинет/}).click();await profile();
 await page.getByRole('link',{name:'Запросить исправление →'}).click();await expect(page).toHaveURL(/education\/history/);await page.goBack();await expect(page.locator('#profile-education')).toBeVisible();
 const resumesBefore=await page.locator('.profile-resume').count();await page.getByRole('button',{name:'+ Создать резюме',exact:true}).click();await expect(page).toHaveURL(/resumes\/[^/]+\/edit/);await page.goBack();await expect(page.locator('.profile-resume')).toHaveCount(resumesBefore+1);
 const snapshot=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).changes.b1.profiles.student_anna_demo.professional,key);
 await enter('employer','employer_sever_demo');await page.goto(base+'#/employer/students');await expect(page.locator('.candidate-result')).toHaveCount(11);await expect(page.locator('main')).not.toContainText('anna@example.invalid');
 await enter('student','persona_anna');await profile();expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).changes.b1.profiles.student_anna_demo.professional,key)).toEqual(snapshot);
 // Long values stay within cards and do not create document overflow.
 await edit('Редактировать: Что я ищу');await page.getByLabel('Профессиональные интересы').fill('Описание '.repeat(65));await save();
 await edit('Редактировать: Языки');await page.getByLabel('Язык',{exact:true}).fill('Длинноеназвание'.repeat(5));await save();
 await page.evaluate(k=>{const state=JSON.parse(localStorage.getItem(k));const profile=state.changes.b1.profiles.student_anna_demo;profile.firstName='Длинноеимя'.repeat(8);profile.lastName='Длиннаяфамилия'.repeat(7);localStorage.setItem(k,JSON.stringify(state))},key);
 for(const width of [360,390,412,430,1440]){
  await page.setViewportSize({width,height:900});await profile();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'../docs/previews/student-profile-'+width+'.png',fullPage:true});
 }
 expect(errors).toEqual([]);console.log('PASS profile: 12 sections, separate contacts and visibility, all inline editors, sources, persistence, cancel/dirty/back, resume creation, visibility across roles, long text and 360/390/412/430/1440.');
}finally{await browser.close()}
