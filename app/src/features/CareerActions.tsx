import { AIEntryLabel } from './AIAvailability';

export function CareerActions({ showAI = true }: { showAI?: boolean }) {
  return <section className="career-actions" aria-label="Работа и карьерные возможности">
    <div className="career-actions-heading"><strong>Ваши карьерные возможности</strong><span>Работа, подбор и подготовка профиля</span></div>
    <div className="career-action-links">
      <a className="button primary career-cta" href="#/jobs">Найти работу <span aria-hidden="true">↗</span></a>
      <a className="button career-cta career-match" href="#/practices?sort=matching">Подобрать возможности <span aria-hidden="true">→</span></a>
      {showAI && <a className="button ai-entry" href="#/student/profile"><AIEntryLabel>ИИ для профиля и резюме</AIEntryLabel></a>}
    </div>
  </section>;
}
