import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:4187/';
const assert = (v, message) => {
  if (!v) throw new Error(message);
};
const errors = [];
async function setup() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => {
    if (d.message().startsWith('Есть несохранённый')) return d.accept();
  });
  const role = async id => {
    await page.goto(base + '#/demo?role=' + (id === 'persona_anna'
      ? 'student'
      : id.startsWith('coordinator') ? 'coordinator' : id.startsWith('operator') ? 'operator' : 'employer'));
    await page.getByLabel('Тестовый профиль').selectOption(id);
    await page.getByRole('button', { name: /Продолжить как/ }).click();
  };
  const go = async route => {
    await page.goto(base + '#' + route);
    if (await page.locator('.entry-page').count()) {
      await role('persona_anna');
      await page.goto(base + '#' + route);
    }
    await page.locator('main').waitFor();
  };
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('stroitelnaia-kariera:demo:v1')));
  return {
    context,
    page,
    go,
    role,
    stored
  };
}
try {
  const { context, page, go, role, stored } = await setup();
  const doc = type => page.locator('[data-document="' + type + '"]');
  const approve = async (type, reason) => {
    await doc(type).getByLabel('Комментарий проверки документа').fill(reason);
    await doc(type).getByRole('button', { name: 'Согласовать учебную версию', exact: true }).click();
  };
  const sendDocs = async () => {
    for (const type of ['agreement', 'direction', 'assignment']) await doc(type).getByRole('button', { name: 'Направить версию на проверку' }).click();
    await page.getByRole('button', { name: 'Отправить дело на согласование' }).click();
  };
  await go('/practices/offer_pto_demo');
  await page.getByRole('checkbox', { name: 'Подтверждаю передачу', exact: false }).check();
  await page.getByRole('button', { name: 'Отправить отклик', exact: true }).click();
  await page.getByRole('link', { name: 'Отклик уже отправлен', exact: false }).waitFor();
  const appId = (await stored()).changes.b1.applications[0].id;
  await role('employer_sever_demo');
  await go('/employer/applications/' + appId);
  await page.getByLabel('Комментарий решения').fill('Учебная подготовка подходит');
  await page.getByRole('button', { name: 'Предложить место', exact: true }).click();
  await page.getByLabel('Сообщение', { exact: true }).fill('Предлагаем учебное место ПТО');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await role('persona_anna');
  await go('/student/applications/' + appId);
  assert(
    await page.locator('main').innerText().then(t => t.includes('Предлагаем учебное место')),
    'application chat shared'
  );
  await page.getByRole('button', { name: 'Принять предложение компании' }).click();
  await page.getByRole('link', { name: 'Открыть дело практики', exact: false }).waitFor();
  const caseId = Object.keys((await stored()).changes.b2.practices)[0];
  assert((await stored()).changes.b2.practices[caseId].reservationActive, 'reserve');
  await go('/student/practices/' + caseId);
  await page.getByLabel('Примечание студента').fill('Учебная практика в согласованный период');
  await page.getByRole('button', { name: 'Сохранить условия практики' }).click();
  await page.getByRole('button', { name: 'Сформировать обязательные документы' }).click();
  await sendDocs();
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await approve('agreement', 'Сведения компании проверены');
  await role('coordinator_mgsu_demo');
  await go('/university/practices/' + caseId);
  await doc('direction').getByLabel('Комментарий проверки документа').fill('Уточните учебную цель в примечании');
  await doc('direction').getByRole('button', { name: 'Вернуть документ с замечанием' }).click();
  await role('persona_anna');
  await go('/student/practices/' + caseId);
  await page.getByLabel('Примечание студента').fill('Учебная цель: подготовить график производства работ');
  await page.getByRole('button', { name: 'Сохранить условия практики' }).click();
  await page.getByRole('button', { name: 'Сформировать обязательные документы' }).click();
  await sendDocs();
  assert(
    (await stored()).changes.b2.documents.some(d => d.type === 'direction' && d.version === 1 && d.status === 'changes_requested'),
    'document history retained'
  );
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await approve('agreement', 'Компания проверила новую версию');
  await role('coordinator_mgsu_demo');
  await go('/university/practices/' + caseId);
  for (const type of ['agreement', 'direction', 'assignment']) await approve(type, 'Обязательная учебная версия проверена');
  await page.getByRole('button', { name: 'Согласовать практику', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить начало практики' }).click();
  assert(
    await page.getByRole('alert').innerText().then(t => t.includes('дата')),
    'start blocked until demo date'
  );
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Демо: перейти к началу практики' }).click();
  await page.getByRole('button', { name: 'Подтвердить начало практики' }).click();
  await page.reload();
  assert((await stored()).demoClock === '2026-11-02', 'clock survives reload');
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await page.getByLabel('Новое задание').fill('Учебный график работ');
  await page.getByLabel('Срок задания').fill('2026-11-20');
  await page.getByRole('button', { name: 'Выдать задание' }).click();
  await role('persona_anna');
  await go('/student/practices/' + caseId);
  await page.getByLabel('Результат задания').fill('Построен график работ');
  await page.getByRole('button', { name: 'Сдать задание' }).click();
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await page.getByLabel('Комментарий задания').fill('Уточните легенду схемы');
  await page.getByRole('button', { name: 'Вернуть задание' }).click();
  await role('persona_anna');
  await go('/student/practices/' + caseId);
  await page.getByLabel('Результат задания').fill('График работ с уточнённой легендой');
  await page.getByRole('button', { name: 'Сдать задание' }).click();
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await page.getByLabel('Комментарий задания').fill('Учебная схема принята');
  await page.getByRole('button', { name: 'Принять задание' }).click();
  await role('persona_anna');
  await go('/student/practices/' + caseId);
  await page.getByLabel('Текст отчёта').fill('Отчёт: выполнен учебный график работ, подготовлены пояснения.');
  await page.getByRole('button', { name: 'Подготовить отчёт' }).click();
  await doc('report').getByRole('button', { name: 'Направить версию на проверку' }).click();
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await approve('report', 'Отзыв: учебная работа выполнена');
  await role('coordinator_mgsu_demo');
  await go('/university/practices/' + caseId);
  await doc('report').getByLabel('Комментарий проверки документа').fill('Добавьте вывод о результате');
  await doc('report').getByRole('button', { name: 'Вернуть документ с замечанием' }).click();
  await role('persona_anna');
  await go('/student/practices/' + caseId);
  await page.getByLabel('Текст отчёта').fill('Отчёт: выполнен график работ. Вывод: изучены учебные зависимости этапов строительства.');
  await page.getByRole('button', { name: 'Подготовить отчёт' }).click();
  await doc('report').getByRole('button', { name: 'Направить версию на проверку' }).click();
  await role('employer_sever_demo');
  await go('/employer/practice-cases/' + caseId);
  await approve('report', 'Повторный отзыв: результаты соответствуют');
  await role('coordinator_mgsu_demo');
  await go('/university/practices/' + caseId);
  await approve('report', 'Отчёт согласован, вывод добавлен');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Демо: перейти к окончанию практики' }).click();
  await page.getByLabel('Пояснение итога').fill('Учебные задачи выполнены и результат проверен');
  await page.getByRole('button', { name: 'Зафиксировать зачёт' }).click();
  await page.reload();
  assert((await stored()).changes.b2.practices[caseId].academicResult === 'credited', 'credited reload');
  await go('/university/analytics');
  assert(
    await page.locator('main').innerText().then(t => t.includes('Зачтённые практики (2 /')),
    'SC09 analytics observes SC02 without double count'
  );
  await role('persona_anna');
  await go('/student/practices/' + caseId);
  const downloaded = page.waitForEvent('download');
  await doc('report').getByRole('button', { name: 'Скачать образец HTML', exact: true }).click();
  const download = await downloaded;
  assert(download.suggestedFilename().endsWith('-v2.html'), 'correct HTML extension/version');
  await mkdir('test-results', { recursive: true });
  const file = resolve('test-results', download.suggestedFilename());
  await download.saveAs(file);
  const content = await readFile(file, 'utf8');
  assert(
    content.includes('Миронова Анна Сергеевна') && content.includes('Версия документа: 2')
    && !content.includes('{{'),
    'populated downloaded file'
  );
  const preview = await context.newPage();
  await preview.goto(pathToFileURL(file).href);
  assert(await preview.title() === 'Отчёт · версия 2', 'download opens as HTML');
  await preview.close();
  await page.getByLabel('Сообщение', { exact: true }).fill('Учебная практика завершена');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await mkdir('../docs/previews', { recursive: true });
  await page.screenshot({ path: '../docs/previews/b2-practice-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= 360), 'case 360px');
  await page.screenshot({ path: '../docs/previews/b2-practice-mobile.png', fullPage: true });
  console.log(
    'PASS SC02: offered → reserved → documents v2 → approved → start → task revision → report v2 → credited; download opens, no JS errors, bytes:',
    new TextEncoder().encode(JSON.stringify(await stored())).length
  );
  await context.close();
  const mod = await setup();
  await mod.go('/employer/company');
  await mod.role('employer_sever_demo');
  await mod.go('/employer/company');
  await mod.page.getByLabel('Описание компании').fill('Вымышленная строительная компания для проверки');
  await mod.page.getByRole('button', { name: 'Направить компанию на проверку' }).click();
  await mod.go('/employer/practices/new/edit');
  await mod.page.getByLabel('Название предложения').fill('Новая учебная практика SC05');
  await mod.page.getByLabel('Назначенный наставник').fill('Наставник — демо');
  await mod.page.getByLabel('Ожидаемые учебные задачи').fill('Учебный график и пояснения');
  await mod.page.getByRole('button', { name: 'Сохранить предложение', exact: true }).click();
  await mod.page.getByRole('button', { name: 'Направить на модерацию' }).click();
  const offerId = Object.keys((await mod.stored()).changes.b2.offers)[0];
  await mod.role('operator_demo');
  await mod.go('/operator/offers');
  let card = mod.page.getByRole('article').filter({ hasText: 'Новая учебная практика SC05' });
  await card.getByLabel('Комментарий модерации').fill('Проверено');
  await card.getByRole('button', { name: 'Допустить / опубликовать' }).click();
  assert(
    await mod.page.getByRole('alert').innerText().then(t => t.includes('Компания не допущена')),
    'unapproved company blocked'
  );
  await mod.go('/operator/organizations');
  card = mod.page.getByRole('article').filter({ hasText: 'Северный контур' });
  await card.getByLabel('Комментарий модерации').fill('Учебная карточка проверена');
  await card.getByRole('button', { name: 'Допустить / опубликовать' }).click();
  await mod.go('/operator/offers');
  card = mod.page.getByRole('article').filter({ hasText: 'Новая учебная практика SC05' });
  await card.getByLabel('Комментарий модерации').fill('Уточните состав работ');
  await card.getByRole('button', { name: 'Вернуть / отклонить' }).click();
  await mod.role('employer_sever_demo');
  await mod.go('/employer/practices/' + offerId + '/edit');
  await mod.page.getByLabel('Ожидаемые учебные задачи').fill('Учебный график, схема организации и пояснительная записка');
  await mod.page.getByRole('button', { name: 'Сохранить предложение', exact: true }).click();
  await mod.page.getByRole('button', { name: 'Направить на модерацию' }).click();
  await mod.role('operator_demo');
  await mod.go('/operator/offers');
  card = mod.page.getByRole('article').filter({ hasText: 'Новая учебная практика SC05' });
  await card.getByLabel('Комментарий модерации').fill('Уточнения приняты');
  await card.getByRole('button', { name: 'Допустить / опубликовать' }).click();
  await mod.role('persona_anna');
  await mod.go('/practices?q=SC05');
  await mod.page.getByRole('link', { name: 'Новая учебная практика SC05', exact: false }).waitFor();
  await mod.page.reload();
  assert((await mod.stored()).changes.b2.offers[offerId].status === 'published', 'published reload');
  console.log('PASS SC05: company gate, draft, moderation return, correction, public catalog');
  await mod.context.close();
  const inv = await setup();
  await inv.go('/student/applications');
  assert(
    await inv.page.getByRole('button', { name: 'Отправить сообщение' }).count() === 0,
    'no chat before invitation accepted'
  );
  await inv.page.getByRole('button', { name: 'Отклонить приглашение' }).click();
  assert(
    !(await inv.stored()).changes.b1?.applications?.some(a => a.studentId === 'student_anna_demo'),
    'decline no application'
  );
  await inv.role('employer_sever_demo');
  await inv.go('/employer/students/student_anna_demo?offer=offer_pto_demo');
  await inv.page.getByLabel('Текст приглашения').fill('Приглашаем на учебную практику ПТО');
  await inv.page.getByRole('button', { name: 'Отправить приглашение' }).click();
  await inv.page.getByRole('button', { name: 'Отправить приглашение' }).click();
  assert(
    await inv.page.getByRole('status').innerText().then(t => t.includes('уже существует')),
    'duplicate invitation denied'
  );
  await inv.role('persona_anna');
  await inv.go('/student/applications');
  const invitation = inv.page.getByRole('article').filter({ hasText: 'Приглашаем на учебную практику ПТО' });
  await invitation.getByRole('checkbox', { name: 'Согласен передать', exact: false }).check();
  await invitation.getByRole('button', { name: 'Принять приглашение' }).click();
  await invitation.getByRole('link', { name: 'Открыть связанный отклик', exact: false }).click();
  await inv.page.getByLabel('Сообщение', { exact: true }).fill('Готова обсудить учебные задачи');
  await inv.page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await inv.role('employer_sever_demo');
  const acceptedInvite = (await inv.stored()).changes.b2.invitations.find(i => i.status === 'accepted');
  await inv.go('/employer/applications/' + acceptedInvite.applicationId);
  assert(
    await inv.page.locator('main').innerText().then(t => t.includes('Готова обсудить')),
    'accepted invitation opens shared context'
  );
  await inv.page.setViewportSize({ width: 360, height: 800 });
  assert(await inv.page.evaluate(() => document.documentElement.scrollWidth <= 360), 'application 360px');
  await inv.role('persona_anna');
  await inv.go('/student/applications/' + acceptedInvite.applicationId);
  await inv.page.getByRole('button', { name: 'Отозвать отклик' }).click();
  assert(
    (await inv.stored()).changes.b1.applications.find(a => a.id === acceptedInvite.applicationId)
      .selectionStatus === 'withdrawn',
    'withdraw preserved'
  );
  console.log('PASS SC06: decline, invite, repeat blocked, consent, one application, authorized chat, withdrawal');
  await inv.context.close();
  assert(errors.length === 0, errors.join('\n'));
} finally {
  await browser.close();
}
