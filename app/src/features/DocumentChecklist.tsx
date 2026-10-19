
import type { Envelope } from '../domain/types';
import type { Case } from '../domain/b2-types';
import { latestDocuments } from '../domain/b2';
import { docNames } from '../domain/b2-types';
export function DocumentChecklist({ state, item: c }: {
  state: Envelope;
  item: Case;
}) {
  const docs = latestDocuments(state, c.id);
  return <section aria-label="Чек-лист подготовки">
    <h3>Готовность комплекта</h3>
    <ul className="checklist">
      <li>{c.conditions.notes.trim() ? 'Готово' : 'Заполнить'} · Студент: примечание</li>
      <li>{c.conditions.companySupervisor.trim() ? 'Готово' : 'Заполнить'} · Компания: наставник</li>
      <li>{c.conditions.universitySupervisor.trim() ? 'Готово' : 'Заполнить'} · Вуз: руководитель</li>
      {c.requirementSnapshot.requiredDocuments.map(type => {
        const document = docs.find(candidateDocument => candidateDocument.type === type);
        return <li key={type}>{document
          ? document.conditionsVersion !== c.conditionsVersion
            ? 'Нужна актуальная версия'
            : document.status === 'approved'
              ? 'Согласовано'
              : document.status === 'in_review'
                ? 'На проверке'
                : document.status === 'changes_requested' ? 'Нужны исправления' : 'Готово к отправке'
          : 'Не сформировано'} · {docNames[type]}{document ? ' · версия ' + document.version : ''}</li>;
      })}
    </ul>
    <p className="tiny">Каждая сторона заполняет только свои поля. Отправка комплекта направляет актуальные черновики на проверку; согласование выполняется отдельно.</p>
  </section>;
}
