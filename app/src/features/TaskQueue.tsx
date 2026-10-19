import { cState } from '../domain/c-types';
import type { Envelope } from '../domain/types';
import { dataFor } from '../domain/b1';
import { canReadCase, latestDocuments, who } from '../domain/b2';
import { canEmployer } from '../domain/access';
export function TaskQueue({ state }: {
  state: Envelope;
}) {
  const data = dataFor(state);
  const persona = who(state);
  const tasks: {
    id: string;
    title: string;
    detail: string;
    url: string;
    action: string;
  }[] = [];
  if (persona.role === 'student') for (const application of data.applications.filter(candidateApplication => candidateApplication.studentId === persona.studentId && candidateApplication.selectionStatus === 'offered' && candidateApplication.offerResponse === 'pending')) tasks.push({
    id: application.id,
    title: 'Компания предложила место',
    detail: data.offers.find(candidateOffer => candidateOffer.id === application.offerId)?.title ?? 'Рассмотрите условия.',
    url: '/student/applications/' + application.id,
    action: 'Рассмотреть предложение'
  });
  if (persona.role === 'employer' && canEmployer(state, 'selection')) for (const application of data.applications.filter(candidateApplication => data.offers.some(candidateOffer => candidateOffer.id === candidateApplication.offerId && candidateOffer.companyId === persona.organizationId)
    && canEmployer(state, 'selection', candidateApplication.offerId)
    && ['submitted', 'info_requested', 'interview'].includes(candidateApplication.selectionStatus))) tasks.push({
      id: application.id,
      title: application.selectionStatus === 'submitted' ? 'Новый отклик' : 'Отбор в работе',
      detail: (data.students.find(candidateStudent => candidateStudent.id === application.studentId)?.name ?? 'Студент') + ' · ' + (data.offers.find(candidateOffer => candidateOffer.id === application.offerId)?.title ?? application.resumeSnapshot.title),
      url: '/employer/applications/' + application.id,
      action: 'Рассмотреть отклик'
    });
  for (const practice of data.practices.filter(candidatePractice => canReadCase(state, candidatePractice) && !['cancelled', 'completed'].includes(candidatePractice.status))) {
    const docs = latestDocuments(state, practice.id);
    let title = '';
    let action = '';
    if (persona.role === 'student') {
      if (docs.some(candidateDocument => candidateDocument.status === 'changes_requested')) {
        title = 'Исправьте возвращённый документ';
        action = 'Исправить документы';
      } else if (practice.status === 'awaiting_university' && !practice.submittedToUniversityAt) {
        title = 'Подготовьте документы для вуза';
        action = 'Подготовить документы';
      } else if (practice.status === 'in_progress') {
        title = 'Практика идёт: выполните задания';
        action = 'Посмотреть задания';
      }
    } else if (persona.role === 'coordinator') {
      if (practice.status === 'awaiting_university' && practice.submittedToUniversityAt) {
        title = 'Практика ожидает согласования';
        action = 'Проверить документы';
      } else if (practice.status === 'review') {
        title = 'Отчёт ожидает проверки';
        action = 'Проверить отчёт';
      } else if (practice.status === 'approved' && state.demoClock >= practice.offerSnapshot.startDate) {
        title = 'Можно подтвердить начало практики';
        action = 'Проверить начало';
      }
    } else if (persona.role === 'employer') {
      if (docs.some(candidateDocument => candidateDocument.status === 'in_review' && candidateDocument.type === 'agreement') && canEmployer(state, 'documents', practice.offerId)) {
        title = 'Договор ожидает компании';
        action = 'Проверить договор';
      } else if (practice.status === 'in_progress' && canEmployer(state, 'practice', practice.offerId)) {
        title = 'Сопровождение практиканта';
        action = 'Посмотреть задания';
      } else if (practice.status === 'review' && canEmployer(state, 'practice', practice.offerId)) {
        title = 'Подготовьте отзыв о практике';
        action = 'Проверить отчёт';
      }
    }
    if (title) tasks.push({
      id: practice.id,
      title,
      detail: practice.offerSnapshot.title,
      url: persona.role === 'student'
        ? '/student/practices/' + practice.id
        : persona.role === 'employer' ? '/employer/practice-cases/' + practice.id : '/university/practices/' + practice.id,
      action
    });
  }
  if (persona.role === 'coordinator') for (const correctionRequest of state.changes.b1?.corrections.filter(candidateCorrectionRequest => candidateCorrectionRequest.status === 'pending') ?? []) tasks.push({
    id: correctionRequest.id,
    title: 'Запрос исправления образования',
    detail: data.students.find(candidateStudent => candidateStudent.id === correctionRequest.studentId)?.name ?? 'Учебные сведения',
    url: '/university/students/' + correctionRequest.studentId,
    action: 'Рассмотреть исправление'
  });
  if (persona.role === 'operator') {
    const appeals = cState(state).tickets.filter(candidateTicket => ['open', 'in_progress'].includes(candidateTicket.status)).length;
    if (appeals) tasks.push({
      id: 'appeals',
      title: 'Обращения требуют ответа: ' + appeals,
      detail: 'Поддержка участников демонстрации.',
      url: '/operator/appeals',
      action: 'Ответить на обращение'
    });
    const companies = data.companies.filter(candidateCompany => candidateCompany.status === 'pending').length;
    const offers = data.offers.filter(candidateOffer => candidateOffer.status === 'pending_moderation').length;
    if (companies) tasks.push({
      id: 'companies',
      title: 'Компании на проверке: ' + companies,
      detail: 'Проверка учебных карточек.',
      url: '/operator/organizations',
      action: 'Проверить компании'
    });
    if (offers) tasks.push({
      id: 'offers',
      title: 'Объявления на модерации: ' + offers,
      detail: 'Проверка условий перед публикацией.',
      url: '/operator/offers',
      action: 'Рассмотреть объявления'
    });
  }
  return <section className="task-queue" aria-label="Текущие задачи">
    <h2>Что требует внимания · {tasks.length}</h2>
    {tasks.length
      ? tasks.map(t => <article className="task-row" key={t.id}>
        <div>
          <h3>
            {t.title}
          </h3>
          <p>
            {t.detail}
          </p>
        </div>
        <a className="button" href={'#' + t.url}>
          {t.action}
        </a>
      </article>)
      : <p>Сейчас нет задач, требующих вашего действия. Новые события появятся в уведомлениях.</p>}
  </section>;
}
