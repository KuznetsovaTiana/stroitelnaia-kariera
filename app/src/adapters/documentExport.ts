
import type { Envelope } from '../domain/types';
import { dataFor } from '../domain/b1';
import { canReadCase, getCase } from '../domain/b2';
import { docNames } from '../domain/b2-types';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]!));
const labels: Record<string, string> = {
  student: 'Студент',
  university: 'Вуз',
  company: 'Компания',
  practiceType: 'Вид практики',
  period: 'Период',
  hours: 'Объём, часов',
  tasks: 'Учебные задачи',
  companySupervisor: 'Руководитель от компании',
  universitySupervisor: 'Руководитель от вуза',
  generatedAt: 'Учебная дата формирования',
  notes: 'Примечание студента',
  report: 'Отчёт'
};
export function documentHtml(state: Envelope, docId: string) {
  const document = dataFor(state).documents.find(candidateDocument => candidateDocument.id === docId);
  if (!document) throw new Error('Документ не найден');
  const practice = getCase(state, document.practiceId);
  if (!canReadCase(state, practice)) throw new Error('Документ недоступен');
  const keys = (document.selectedFields ?? Object.keys(labels)).filter(k => k !== 'report' || document.type === 'report');
  if (keys.some(k => !document.fields[k] || /\{\{.*?\}\}/s.test(document.fields[k]))) throw new Error('Документ содержит незаполненные поля');
  return {
    filename: `${document.type}-${practice.studentId}-v${document.version}.html`,
    html: `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escape(docNames[document.type])} · версия ${document.version}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#292824}p{white-space:pre-wrap;line-height:1.6}dt{font-weight:bold;margin-top:20px}dd{margin:8px 0;white-space:pre-wrap}.demo{padding:16px;border:1px solid #777}@media print{body{margin:0}}</style></head><body><h1>${escape(docNames[document.type])}</h1><p class="demo">Демонстрационный учебный образец. Не предназначен для реального оформления. Не утверждённая форма МГСУ.</p><p>Версия документа: ${document.version}. Версия шаблона: ${document.templateVersion}. Состояние: ${escape(document.status)}.</p><p>${escape(document.templateBody ?? '')}</p><dl>${keys.map(k => `<dt>${labels[k]}</dt><dd>${escape(document.fields[k])}</dd>`).join('')}</dl><h2>История проверки этой версии</h2>${document.reviewSteps.map(r => `<p>${escape(r.role === 'employer' ? 'Компания' : 'Координатор')}: ${escape(r.decision)} · ${escape(r.comment)}</p>`)
      .join('')}<p>Для печати или сохранения в PDF откройте файл в браузере и нажмите Ctrl+P.</p></body></html>`
  };
}
export function downloadDocument(state: Envelope, id: string) {
  const { filename, html } = documentHtml(state, id);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function printDocument(state: Envelope, id: string) {
  const { html } = documentHtml(state, id);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  document.body.append(frame);
  frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true });
}
