import type { Envelope } from '../domain/types';
import type { Case } from '../domain/b2-types';
import { practiceGuidance } from '../domain/guidance';
import { who } from '../domain/b2';
export function ProcessSummary({ state, item }: {
  state: Envelope;
  item: Case;
}) {
  const g = practiceGuidance(state, item, who(state).role);
  return <section className="card process-summary" aria-label="Следующее действие практики">
    <ol className="process-steps" aria-label="Этапы практики">
      {[
        'Место',
        'Документы',
        'Согласование',
        'Практика',
        'Отчёт',
        'Результат'
      ].map((label, i) => <li
        key={label}
        aria-current={(item.status === 'completed'
          ? 5
          : item.status === 'review' ? 4 : item.status === 'in_progress' ? 3 : item.status === 'approved' ? 2 : 1) === i
          ? 'step'
          : undefined}



      >
        {label}
      </li>)}
    </ol>
    <h2>
      {g.status}
    </h2>
    <p>
      {g.now}
    </p>
    <p>
      <strong>Сейчас отвечает: {g.owner}</strong>
    </p>
    <p>
      {g.action}
    </p>
    <p className="tiny">Следующий этап: {g.next}</p>
  </section>;
}
