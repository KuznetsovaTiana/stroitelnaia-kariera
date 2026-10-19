import { AIEntryLabel } from './AIAvailability';
import { CandidateEducation } from './CandidateEducation';
import { StudentProfile } from './StudentProfile';
import { officialName } from '../domain/personName';
const educationFieldLabel = (path: string) => path.endsWith('.name')
  ? 'Дисциплина'
  : path.endsWith('.result') ? 'Результат дисциплины' : 'Учебные сведения';
import { favoriteIds } from '../domain/b1';
import { canEmployer } from '../domain/access';
import type { PracticeOffer } from '../domain/b2-types';
import { InviteComposer } from './B2View';
import { useState, cloneElement, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import type { Envelope } from '../domain/types';
import type { Education, Project, Resume, MatchResult } from '../domain/b1-types';
import { seed, programs } from '../data/seed';
import {



  b1,



  dataFor,



  isPublic,



  saveProject,



  newProject,



  createResume,



  saveResume,



  primaryResume,



  requestCorrection,



  resolveCorrection,



  correctionFields,



  fieldValue,



  toggleFavorite,



  submitApplication,



  withdrawApplication,



  saveSearch,



  deleteSearch,



  rememberSearch,



  markNotification



} from '../domain/b1';
import { compare, ranked, available, offerSchedule, offerPaid } from '../domain/matching';
import { ResumeAssistantPage } from './AIResumeAssistant';
type Props = {
  state: Envelope;
  route: string;
  commit: (state: Envelope) => boolean;
  choose: (id: string) => void;
};
const paths = [
  '/',
  '/how-it-works',
  '/practices',
  '/jobs',
  '/student/profile',
  '/student/education',
  '/student/education/history',
  '/student/resumes',
  '/student/saved',
  '/student/applications',
  '/university',
  '/university/students',
  '/employer',
  '/employer/students',
  '/notifications'
];
export const handlesB1 = (route: string) => {
  const path = route.split('?')[0];
  return paths.includes(path) || /^\/(practices|jobs|companies)\/[^/]+$/.test(path)
    || /^\/student\/(projects|resumes|applications)\/[^/]+(\/(edit|assistant))?$/.test(path)
    || /^\/university\/students\/[^/]+$/.test(path)
    || /^\/employer\/(students|applications)\/[^/]+$/.test(path);
};
const kindName = (kind: string) => kind === 'practice' ? 'Практика' : kind === 'internship' ? 'Стажировка' : 'Вакансия';
const statusName: Record<string, string> = {
  submitted: 'Отправлен',
  viewed: 'Просмотрен',
  offered: 'Предложено место',
  rejected: 'Отказ работодателя',
  withdrawn: 'Отозван',
  pending: 'Ожидает решения',
  approved: 'Принято',
  ready: 'Готово',
  draft: 'Черновик'
};
const correctionStatus: Record<string, string> = {
  pending: 'Ожидает решения',
  approved: 'Исправление принято',
  rejected: 'Запрос отклонён'
};
const csv = (value: string) => value.split(',').map(t => t.trim()).filter(Boolean);
export function Field({ label, children }: {
  label: string;
  children: ReactNode;
}) {
  return <label className="field">
    <span>
      {label}
    </span>
    {isValidElement(children)
      ? cloneElement(children as ReactElement<{
        'aria-label'?: string;
      }>, { 'aria-label': label })
      : children}
  </label>;
}
export function Page({ title, id, children }: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return <section className="b1page" data-screen={id}>
    <h1>
      {title}
    </h1>
    {children}
  </section>;
}
export function Matching({ result }: {
  result: MatchResult;
}) {
  const labels = {
    match: 'Совпало',
    partial: 'Частично совпало',
    mismatch: 'Есть ограничение',
    unknown: 'Нужно уточнить'
  };
  return <section className="matching">
    <h3>
      {result.score === null
        ? 'Недостаточно данных'
        : `${result.score >= 75 ? 'Высокое' : result.score >= 50 ? 'Частичное' : 'Низкое'} соответствие указанным критериям`}
    </h3>
    <p className="tiny">Полнота известных факторов: {Math.round(result.coverage * 100)}%. Подбор на правилах; решение принимает работодатель.</p>
    {result.constraints.map(c => <p className="notice" key={c.text}>{c.status === 'unknown' ? 'Нужно уточнить' : 'Есть ограничение'}: {c.text}</p>)}
    <details>
      <summary>Факторы и источники</summary>
      {result.factors.map(candidateFactor => <div className="factor" key={candidateFactor.name}>
        <strong>{labels[candidateFactor.status]} · {candidateFactor.name} ({candidateFactor.weight})</strong>
        <p>
          {candidateFactor.description}
        </p>
        <small>Источник: {candidateFactor.name === 'Программа' || candidateFactor.name === 'Учебные навыки'
          ? 'Учебные сведения вуза'
          : candidateFactor.name === 'Проекты' ? 'Учебные проекты' : 'Указано студентом и в объявлении'}. Данные демонстрационные.</small>
      </div>)}
    </details>
    <ul className="evidence">
      {result.factors.slice(0, 4).map(candidateFactor => <li key={candidateFactor.name}>{labels[candidateFactor.status]}: {candidateFactor.description}</li>)}
    </ul>
  </section>;
}
export function B1View(props: Props) {
  const { state, route, commit } = props;
  const path = route.split('?')[0];
  const params = new URLSearchParams(route.split('?')[1] ?? '');
  const data = dataFor(state);
  const persona = data.personas.find(p => p.id === state.activePersonaId)!;
  const student = data.students.find(candidateStudent => candidateStudent.id === persona.studentId);
  const changes = b1(state);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  function run(action: () => Envelope, success = 'Изменения сохранены') {
    try {
      const next = action();
      if (commit(next)) {
        setError('');
        setMessage(success);
      } else setMessage('Действие выполнено в памяти; сохранение не подтверждено');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось выполнить действие');
      setMessage('');
    }
  }
  const notice = <>
    {error && <p className="notice error" role="alert">
      {error}
    </p>}
    {message && <p className="notice" role="status">
      {message}
    </p>}
  </>;
  const notFound = <Page title="Страница не найдена" id="404">
    <p>Объект не существует или недоступен текущей роли.</p>
    <a href="#/">На главную →</a>
  </Page>;
  if (path.startsWith('/student/') && !student) return <Page title="Выберите тестового студента" id="D01">
    <p>Данные студента доступны в его тестовой роли.</p>
    <button onClick={() => props.choose('persona_anna')}>Продолжить как Анна</button>
  </Page>;
  if (path.startsWith('/university') && persona.role !== 'coordinator'
    || path.startsWith('/employer') && persona.role !== 'employer') return <Page title="Недоступно текущей роли" id="ДОСТУП">
      <p>Выберите соответствующую роль в верхней строке.</p>
    </Page>;
  if (path === '/') return <Page title="От учебного проекта — к строительной карьере" id="P01">
    <section className="hero">
      <div className="herotext">
        <h2>Первый профессиональный шаг</h2>
        <p>Практики, стажировки и стартовые вакансии для студентов МГСУ. Компании и образовательные сведения вымышлены.</p>
        <div className="actions">
          <a className="button primary" href="#/practices">Найти практику →</a>
          <a className="button" href="#/jobs">Работа и стажировки</a>
        </div>
      </div>
    </section>
    <div className="columns space">
      <article className="card">
        <h2>Образовательная основа</h2>
        <p>Программа, дисциплины, учебные результаты и происхождение фактов. Исправления рассматривает координатор.</p>
        <a href="#/student/education">Посмотреть учебный пример →</a>
      </article>
      <article className="card">
        <h2>Ваше самоописание</h2>
        <p>Интересы, вклад в проекты и цели. Сценарный помощник помогает собрать текст по вашим ответам.</p>
        <a href="#/student/resumes">Мои резюме →</a>
      </article>
    </div>
    <p><a href="#/how-it-works">Как устроен маршрут →</a> · <a href="#/demo">Выбрать тестовую роль →</a></p>
  </Page>;
  if (path === '/how-it-works') return <Page title="Как это работает" id="P12">
    <div className="card">
      <p>Студент выбирает предложение и резюме → направляет отклик → работодатель принимает решение → студент принимает место → вуз согласует документы → практика и итог.</p>
      <p>Демонстрация включает отбор, принятие предложения, документы, задания, отчёт и результат практики. Все изменения локальны.</p>
      <p>Образовательные факты отмечены источником «Учебный набор вуза». Самоописание — заявление студента. ИИ-помощник помогает сформулировать сведения студента через GigaChat, если он подключён. Образовательные факты и подбор по правилам не генерируются моделью.</p>
      <a href="#/demo">Выбрать роль →</a>
    </div>
  </Page>;
  if (path === '/practices' || path === '/jobs') return <Search {...props} run={run} notice={notice} />;
  if (/^\/(practices|jobs)\/[^/]+$/.test(path)) {
    const offer = data.offers.find(candidateOffer => candidateOffer.id === path.split('/')[2] && isPublic(candidateOffer, state));
    if (!offer || (path.startsWith('/practices/') ? offer.kind !== 'practice' : offer.kind === 'practice')) return notFound;
    return <OfferDetail {...props} offer={offer} run={run} notice={notice} />;
  }
  if (path.startsWith('/companies/')) {
    const company = data.companies.find(candidateCompany => candidateCompany.id === path.split('/')[2] && candidateCompany.status === 'approved');
    if (!company) return notFound;
    return <Page title={company.name} id="P07">
      <div className="card">
        <p>Вымышленная строительная компания. Демонстрационная карточка без реальных реквизитов.</p>
        <p>
          {company.description}
        </p>
        <h2>Опубликованные предложения</h2>
        {data.offers.filter(candidateOffer => candidateOffer.companyId === company.id && isPublic(candidateOffer, state)).map(candidateOffer => <p key={candidateOffer.id}>
          <a href={`#/${candidateOffer.kind === 'practice' ? 'practices' : 'jobs'}/${candidateOffer.id}`}>{candidateOffer.title} →</a>
        </p>)}
      </div>
    </Page>;
  }
  if (path === '/student/profile' && student) return <StudentProfile state={state} commit={commit} />;
  if ((path === '/student/education' || path === '/student/education/history') && student) return <EducationPanel
    {...props}
    education={data.education.find(candidateEducation => candidateEducation.studentId === student.id)!}
    run={run}
    notice={notice}



  />;
  if (path.startsWith('/student/projects/') && student) {
    const project = path.endsWith('/new')
      ? newProject(state)
      : data.projects.find(candidateProject => candidateProject.id === path.split('/')[3] && candidateProject.studentId === student.id);
    if (!project) return notFound;
    return <ProjectForm {...props} project={project} run={run} notice={notice} />;
  }
  if (path === '/student/resumes' && student) return <Page title="Мои резюме" id="S06">
    {notice}
    <div className="actions">
      <button
        className="primary"
        onClick={() => {
          try {
            const r = createResume(state);
            commit(r.state);
            location.hash = '/student/resumes/' + r.id + '/edit';
          } catch (error) {
            setError((error as Error).message);
          }
        }}



      >Создать резюме</button>
      <a href="#/student/projects/new">Добавить учебный проект →</a>
    </div>
    <div className="offergrid">
      {data.resumes.filter(candidateResume => candidateResume.studentId === student.id).map(candidateResume => <article className="card" key={candidateResume.id}>
        <span className="status">{statusName[candidateResume.status]} · версия {candidateResume.version}{candidateResume.primary ? ' · Основное' : ''}</span>
        <h2>
          {candidateResume.title}
        </h2>
        <p>
          {candidateResume.summary || 'Самоописание ещё не заполнено'}
        </p>
        <div className="actions">
          <a href={'#/student/resumes/' + candidateResume.id}>Предпросмотр →</a>
          <a href={'#/student/resumes/' + candidateResume.id + '/edit'}>Редактировать →</a>
        </div>
        <p>
          <button onClick={() => run(() => primaryResume(state, candidateResume.id))} disabled={candidateResume.primary}



          >Выбрать основным</button>
        </p>
      </article>)}
    </div>
  </Page>;
  if (path.startsWith('/student/resumes/') && student) {
    const resume = data.resumes.find(candidateResume => candidateResume.id === path.split('/')[3] && candidateResume.studentId === student.id);
    if (!resume) return notFound;
    if (path.endsWith('/assistant')) return <ResumeAssistantPage state={state} resume={resume} commit={commit} />;
    if (path.endsWith('/edit')) return <ResumeForm {...props} resume={resume} run={run} notice={notice} />;
    return <Page title={resume.title} id="S09">
      <div className="actions">
        <a href={'#/student/resumes/' + resume.id + '/edit'}>Редактировать →</a>
        <a href="#/practices">Выбрать практику →</a>
      </div>
      <ResumePreview
        resume={resume}
        education={data.education.find(candidateEducation => candidateEducation.studentId === student.id)!}
        projects={data.projects.filter(candidateProject => resume.projectIds.includes(candidateProject.id))}



      />
    </Page>;
  }
  if (path === '/student/saved' && student) return <Page title="Избранное и сохранённые поиски" id="S12">
    {notice}
    <h2>Предложения</h2>
    {state.changes.favorites.length > 0
      && <p className="notice">Старое общее избранное не перенесено: его владелец неизвестен. Сохраните нужные предложения заново для своего персонажа.</p>}
    {favoriteIds(state).length
      ? favoriteIds(state).map(id => {
        const offer = data.offers.find(candidateOffer => candidateOffer.id === id);
        return <div className="card space" key={id}>
          {offer && isPublic(offer, state)
            ? <a href={`#/${offer.kind === 'practice' ? 'practices' : 'jobs'}/${id}`}>{offer.title} →</a>
            : <p>Предложение больше недоступно</p>}
          <button onClick={() => run(() => toggleFavorite(state, id))}>Убрать из избранного</button>
        </div>;
      })
      : <p className="card">Пока нет избранных предложений.</p>}
    <h2>Сохранённые поиски</h2>
    {changes.searches.filter(s => s.userId === persona.id).map(s => <div className="card space" key={s.id}>
      <a href={'#' + s.url}>{s.title} →</a>
      <button onClick={() => run(() => deleteSearch(state, s.id))}>Удалить поиск</button>
    </div>)}
  </Page>;
  if (path === '/student/applications' && student) return <Page title="Отклики и приглашения" id="S10">
    {notice}
    <Field label="Статус отклика">
      <select
        value={params.get('status') ?? ''}
        onChange={event => {
          location.hash = '/student/applications' + (event.target.value ? '?status=' + event.target.value : '');
        }}



      >
        <option value="">Все</option>
        {['submitted', 'viewed', 'offered', 'rejected', 'withdrawn'].map(s => <option key={s} value={s}>
          {statusName[s]}
        </option>)}
      </select>
    </Field>
    {data.applications.filter(candidateApplication => candidateApplication.studentId === student.id && (!params.get('status') || candidateApplication.selectionStatus === params.get('status')))
      .map(candidateApplication => <article className="card space" key={candidateApplication.id}>
        <span className="status">
          {statusName[candidateApplication.selectionStatus]}
        </span>
        <h2>
          {data.offers.find(candidateOffer => candidateOffer.id === candidateApplication.offerId)?.title}
        </h2>
        <p>Резюме: {candidateApplication.resumeSnapshot.title} · версия {candidateApplication.resumeSnapshot.version}</p>
        <a href={'#/student/applications/' + candidateApplication.id}>Открыть отклик →</a>
      </article>)}
    {!data.applications.some(candidateApplication => candidateApplication.studentId === student.id)
      && <p className="card">Откликов пока нет. <a href="#/practices">Выбрать практику →</a></p>}
    <p className="tiny">Решения компании появляются в отклике.</p>
  </Page>;
  if (path.startsWith('/student/applications/') || path.startsWith('/employer/applications/')) {
    const application = data.applications.find(candidateApplication => candidateApplication.id === path.split('/')[3]);
    const offer = data.offers.find(candidateOffer => candidateOffer.id === application?.offerId);
    if (!application || !offer || persona.role === 'student' && application.studentId !== student?.id
      || persona.role === 'employer' && offer.companyId !== persona.organizationId) return notFound;
    return <Page title="Отклик" id={persona.role === 'student' ? 'S11' : 'E10'}>
      {notice}
      <div className="card">
        <h2>
          {offer.title}
        </h2>
        <span className="status">
          {statusName[application.selectionStatus]}
        </span>
        <h3>Отправленное резюме · версия {application.resumeSnapshot.version}</h3>
        <p>
          {application.resumeSnapshot.title}
        </p>
        <p className="prewrap">
          {application.resumeSnapshot.summary}
        </p>
        {application.resumeSnapshot.target && <p>Цель: {application.resumeSnapshot.target} · заявление студента</p>}
        {application.resumeSnapshot.skillClaims?.length
          ? <p>Заявленные навыки: {application.resumeSnapshot.skillClaims.join(', ')}</p>
          : null}
        {application.projectSnapshot?.map(candidateProject => <section key={candidateProject.id}>
          <h3>
            {candidateProject.title}
          </h3>
          <p>
            {candidateProject.contribution}
          </p>
          <p className="tiny">Источник: {candidateProject.source === 'student' ? 'Заявление студента' : 'Учебный набор вуза'} · Учебный опыт</p>
        </section>)}
        {application.history?.map((h, i) => <p className="tiny" key={i}>{h.at.slice(0, 10)} · {h.text}</p>)}
        {persona.role === 'student' && application.educationSnapshot
          && <details>
            <summary>Снимок образовательных сведений при отправке · версия {application.educationSnapshot.version}</summary>
            {application.educationSnapshot.disciplines.map((d, i) => <p key={i}>{d.name}: {d.result}</p>)}
          </details>}
        {persona.role === 'student' && !['withdrawn', 'rejected'].includes(application.selectionStatus)
          && !seed.practices.some(p => p.applicationId === application.id)
          && application.offerResponse !== 'accepted'
          && <button onClick={() => run(() => withdrawApplication(state, application.id), 'Отклик отозван')}>Отозвать отклик</button>}
        <p>Отклик сохранён в общей воронке. Решение работодателя и переписка будут реализованы на этапе B2.</p>
      </div>
    </Page>;
  }
  if (path === '/university' || path === '/university/students') {
    const requests = changes.corrections.filter(candidateCorrectionRequest => candidateCorrectionRequest.status === 'pending');
    return <Page title="Кабинет координатора" id="U01 / U04">
      <div className="card">
        <h2>Исправления образовательных сведений: {requests.length}</h2>
        <p>В этом этапе доступна очередь исправлений. Практики и документы доступны в рабочей очереди.</p>
        {data.students.map(candidateStudent => <p key={candidateStudent.id}>
          <a href={'#/university/students/' + candidateStudent.id}>{officialName(candidateStudent)} · {candidateStudent.programId}, {candidateStudent.course} курс · запросов: {requests.filter(candidateCorrectionRequest => candidateCorrectionRequest.studentId === candidateStudent.id).length} →</a>
        </p>)}
      </div>
    </Page>;
  }
  if (path.startsWith('/university/students/')) {
    const student = data.students.find(candidateStudent => candidateStudent.id === path.split('/')[3]);
    if (!student) return notFound;
    return <Coordinator {...props} studentId={student.id} run={run} notice={notice} />;
  }
  if (path === '/employer/students' || path.startsWith('/employer/students/')) {
    if (!canEmployer(state, 'search')) return <Page title="Недоступно подроли" id="E07 / E08">
      <p>Общий поиск студентов доступен администратору или рекрутеру.</p>
    </Page>;
    const own = data.offers.filter(candidateOffer => candidateOffer.companyId === persona.organizationId && isPublic(candidateOffer, state) && canEmployer(state, 'search', candidateOffer.id));
    const offer = own.find(candidateOffer => candidateOffer.id === params.get('offer')) ?? own[0];
    const candidate = path.split('/')[3];
    if (!offer) return <Page title="Поиск студентов" id="E07">
      <p className="card">Для сравнения нужен опубликованный набор с требованиями к студентам.</p>
      <a className="button primary" href="#/employer/practices">Открыть предложения</a>
    </Page>;
    const students = data.students.filter(candidateStudent => candidateStudent.visibility === 'visible'
      && (!params.get('q')
        || (candidateStudent.programId + ' ' + data.education.find(candidateEducation => candidateEducation.studentId === candidateStudent.id)?.skills.join(' ')).toLowerCase()
          .includes(params.get('q')!.toLowerCase()))
      && (!candidate || candidateStudent.id === candidate)
      && (!params.get('course') || String(candidateStudent.course) === params.get('course'))
      && (!params.get('region') || candidateStudent.region === params.get('region'))
      && (!params.get('skill')
        || data.education.find(candidateEducation => candidateEducation.studentId === candidateStudent.id)?.skills.includes(params.get('skill')!)));
    if (candidate && !students.length) return notFound;
    return <Page title={candidate ? 'Профиль кандидата' : 'Поиск студентов'} id="E07 / E08">
      <Field label="Предложение для сравнения">
        <select value={offer.id} onChange={event => {
          location.hash = path + '?offer=' + event.target.value;
        }}



        >
          {own.map(candidateOffer => <option key={candidateOffer.id} value={candidateOffer.id}>
            {candidateOffer.title}
          </option>)}
        </select>
      </Field>
      {!candidate
        && <>
          <div className="catalog-search">
            <Field label="Направление или навык">
              <input
                value={params.get('q') ?? ''}
                maxLength={120}
                onChange={event => {
                  params.set('q', event.target.value);
                  location.hash = path + '?' + params;
                }}



              />
            </Field>
          </div>
          <details className="card candidate-filters" open={window.innerWidth > 768}>
            <summary>Фильтры кандидатов</summary>
            <div className="columns">
              <Field label="Курс кандидата">
                <select
                  value={params.get('course') ?? ''}
                  onChange={event => {
                    params.set('course', event.target.value);
                    location.hash = path + '?' + params;
                  }}



                >
                  <option value="">Все</option>
                  {[1, 2, 3, 4].map(v => <option key={v}>
                    {v}
                  </option>)}
                </select>
              </Field>
              <Field label="Регион кандидата">
                <select
                  value={params.get('region') ?? ''}
                  onChange={event => {
                    params.set('region', event.target.value);
                    location.hash = path + '?' + params;
                  }}



                >
                  <option value="">Все</option>
                  <option>Москва</option>
                  <option>Казань</option>
                </select>
              </Field>
              <Field label="Учебный навык кандидата">
                <input
                  value={params.get('skill') ?? ''}
                  onChange={event => {
                    params.set('skill', event.target.value);
                    location.hash = path + '?' + params;
                  }}



                />
              </Field>
            </div>
          </details>
          <p>Найдено: {students.length}</p>
        </>}
      <p>До взаимодействия показаны обезличенные сведения, без контактов и оценок.</p>
      {!students.length && <p className="card">Кандидаты не найдены. Измените условия поиска.</p>}
      {candidate && <a href={'#/employer/students?' + params}>← К результатам поиска</a>}
      {students.map(candidateStudent => <article className="card space candidate-result" key={candidateStudent.id}>
        <h2>Кандидат {data.students.findIndex(indexedStudent => indexedStudent.id === candidateStudent.id) + 1}</h2>
        <p>{candidateStudent.programId} · {candidateStudent.course} курс · {candidateStudent.region || 'Регион неизвестен'}</p>
        <p>Учебные навыки · источник «учебный набор вуза»: {data.education.find(candidateEducation => candidateEducation.studentId === candidateStudent.id)!.skills.join(', ')}</p>
        {candidate
          ? <>
            <CandidateEducation state={state} student={candidateStudent} />
            <Matching result={compare(state, candidateStudent.id, offer.id)} />
            <InviteComposer state={state} offerId={offer.id} studentId={candidateStudent.id} commit={commit} />
          </>
          : <>
            <p>Соответствие требованиям: {compare(state, candidateStudent.id, offer.id).score ?? 'недостаточно данных'}</p>
            <a className="button" href={'#/employer/students/' + candidateStudent.id + '?' + params}>Посмотреть кандидата →</a>
          </>}
      </article>)}
    </Page>;
  }
  if (path === '/notifications') {
    const list = state.changes.notifications.filter(candidateNotification => candidateNotification.recipientId === persona.id);
    return <Page title="Уведомления" id="C02">
      {notice}
      {list.length
        ? list.map(candidateNotification => <article className="card space" key={candidateNotification.id}>
          <p>
            {candidateNotification.text}
          </p>
          <a href={'#' + candidateNotification.target} onClick={() => run(() => markNotification(state, candidateNotification.id), 'Уведомление прочитано')}



          >Перейти →</a>
          <small>
            {candidateNotification.read ? ' · Прочитано' : ' · Новое'}
          </small>
        </article>)
        : <p className="card">Новых уведомлений пока нет.</p>}
    </Page>;
  }
  return notFound;
}
type ActionProps = Props & {
  run: (action: () => Envelope, success?: string) => void;
  notice: ReactNode;
};
function Search(props: ActionProps) {
  const { state, route, run, notice } = props;
  const path = route.split('?')[0];
  const params = new URLSearchParams(route.split('?')[1] ?? '');
  const data = dataFor(state);
  const student = data.students.find(candidateStudent => candidateStudent.id === data.personas.find(p => p.id === state.activePersonaId)?.studentId);
  const offers = data.offers.filter(candidateOffer => isPublic(candidateOffer, state) && (path === '/practices' ? candidateOffer.kind === 'practice' : candidateOffer.kind !== 'practice'))
    .filter(candidateOffer => params.get('archive') === 'true' || candidateOffer.endDate >= state.demoClock)
    .filter(candidateOffer => (!params.get('q')
      || (candidateOffer.title + ' ' + data.companies.find(candidateCompany => candidateCompany.id === candidateOffer.companyId)!.name).toLowerCase().includes(params.get('q')!.toLowerCase()))
      && (!params.get('program') || candidateOffer.programId === params.get('program'))
      && (!params.get('region') || candidateOffer.region === params.get('region'))
      && (!params.get('kind') || candidateOffer.kind === params.get('kind'))
      && (!params.get('skill') || candidateOffer.skills.includes(params.get('skill')!))
      && (!params.get('schedule') || offerSchedule(candidateOffer) === params.get('schedule'))
      && (!params.get('paid') || String(offerPaid(candidateOffer)) === params.get('paid'))
      && (!params.get('course')
        || Number(params.get('course')) >= (candidateOffer.minCourse ?? 3) && Number(params.get('course')) <= (candidateOffer.maxCourse ?? 4))
      && (!params.get('start') || candidateOffer.startDate >= params.get('start')!)
      && (!params.get('end') || candidateOffer.endDate <= params.get('end')!));
  const sorted = params.get('sort') === 'matching' && student
    ? ranked(state, student.id, offers).map(r => r.offer)
    : [...offers].sort((leftOffer, rightOffer) => params.get('sort') === 'date'
      ? leftOffer.startDate.localeCompare(rightOffer.startDate) || leftOffer.id.localeCompare(rightOffer.id)
      : leftOffer.title.localeCompare(rightOffer.title));
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    const url = path + (next.size ? '?' + next.toString() : '');
    run(() => rememberSearch(state, path, url), 'Фильтры обновлены');
    location.hash = url;
  }
  const select = (
    label: string,
    key: string,
    options: string[],
    names?: Record<string, string>
  ) => <Field label={label}>
      <select value={params.get(key) ?? ''} onChange={event => filter(key, event.target.value)}>
        <option value="">Все</option>
        {options.map(v => <option key={v} value={v}>
          {names?.[v] ?? v}
        </option>)}
      </select>
    </Field>;
  return <Page
    title={path === '/practices' ? 'Поиск практики' : 'Работа и стажировки'}
    id={path === '/practices' ? 'P02' : 'P04'}



  >
    {notice}
    <div className="catalog-search">
      <Field label="Название или компания">
        <input value={params.get('q') ?? ''} maxLength={120} onChange={event => filter('q', event.target.value)}



        />
      </Field>
      <span className="catalog-search-hint">Поиск по названию предложения и компании</span>
    </div>
    <div className="searchlayout">
      <details className="card filters" open={window.innerWidth > 768}>
        <summary>Фильтры поиска</summary>
        {select('Период набора', 'archive', ['false', 'true'], { false: 'Актуальные', true: 'Включая завершённые' })}
        {select('Учебная траектория', 'program', programs)}
        {select('Регион', 'region', ['Москва', 'Казань'])}
        {select('Курс', 'course', ['1', '2', '3', '4'])}
        {select('Оплата', 'paid', ['true', 'false'], { true: 'С оплатой', false: 'Без оплаты' })}
        <Field label="Доступен с">
          <input type="date" value={params.get('start') ?? ''} onChange={event => filter('start', event.target.value)}



          />
        </Field>
        <Field label="Доступен до">
          <input type="date" value={params.get('end') ?? ''} onChange={event => filter('end', event.target.value)}



          />
        </Field>
        {path === '/jobs'
          && select('Тип предложения', 'kind', ['job', 'internship'], { job: 'Вакансия', internship: 'Стажировка' })}
        {select('График', 'schedule', ['Полный день', 'Гибкий график'])}
        {select('Навык', 'skill', ['Таблицы', 'График работ', 'Моделирование'])}
        <button
          onClick={() => {
            run(() => rememberSearch(state, path, path), 'Фильтры сброшены');
            location.hash = path;
          }}>Сбросить фильтры</button>
        {student
          && <button
            onClick={() => run(
              () => saveSearch(
                state,
                route,
                `Поиск: ${params.get('program') || 'все траектории'} · ${params.get('region') || 'все регионы'}`
              ),
              'Поиск сохранён'
            )}>Сохранить поиск</button>}
      </details>
      <div>
        <div className="sectionhead">
          <h2>Найдено: {sorted.length}</h2>
          {select(
            'Сортировка',
            'sort',
            ['title', 'date', ...(student ? ['matching'] : [])],
            {
              title: 'По названию',
              date: 'По дате',
              matching: 'По совпадению'
            }
          )}
        </div>
        {!sorted.length
          && <div className="card">
            <h2>Ничего не найдено</h2>
            <p>Измените условия или сбросьте фильтры.</p>
            <button onClick={() => {
              run(() => rememberSearch(state, path, path));
              location.hash = path;
            }}>Показать все</button>
          </div>}
        {sorted.map(candidateOffer => <article className="card space search-result" key={candidateOffer.id}>
          <div className="sectionhead">
            <span className="status">
              {kindName(candidateOffer.kind)}
            </span>
            {student
              && <button onClick={() => run(() => toggleFavorite(state, candidateOffer.id))}>
                {favoriteIds(state).includes(candidateOffer.id) ? 'Убрать из избранного' : 'В избранное'}
              </button>}
          </div>
          <h2>
            <a href={'#' + path + '/' + candidateOffer.id + '?back=' + encodeURIComponent(route)}>{candidateOffer.title} →</a>
          </h2>
          <p>{data.companies.find(candidateCompany => candidateCompany.id === candidateOffer.companyId)!.name} · {candidateOffer.region}</p>
          <p>{candidateOffer.startDate} — {candidateOffer.endDate} · {offerSchedule(candidateOffer)} · {offerPaid(candidateOffer) ? 'Учебный пример с оплатой' : 'Без оплаты'}{candidateOffer.kind === 'practice' ? ` · ${available(state, candidateOffer)} свободных мест` : ''}</p>
          <a className="career-result-link" href={'#' + path + '/' + candidateOffer.id + '?back=' + encodeURIComponent(route)}



          >Посмотреть условия <span aria-hidden="true">→</span></a>
          {student && params.get('sort') === 'matching'
            && <p className="tiny">Совпадение по указанным данным: {compare(state, student.id, candidateOffer.id).score ?? 'недостаточно данных'} · подробности в карточке</p>}
        </article>)}
      </div>
    </div>
  </Page>;
}
function OfferDetail(props: ActionProps & {
  offer: PracticeOffer;
}) {
  const { state, route, offer, run, notice } = props;
  const data = dataFor(state);
  const student = data.students.find(candidateStudent => candidateStudent.id === data.personas.find(p => p.id === state.activePersonaId)?.studentId);
  const resumes = data.resumes.filter(candidateResume => candidateResume.studentId === student?.id && candidateResume.status === 'ready');
  const [resumeId, setResumeId] = useState(resumes.find(candidateResume => candidateResume.primary)?.id ?? resumes[0]?.id ?? '');
  const [consent, setConsent] = useState(false);
  const path = offer.kind === 'practice' ? '/practices' : '/jobs';
  const params = new URLSearchParams(route.split('?')[1] ?? '');
  const rawBack = params.get('back');
  const back = rawBack?.startsWith(path + '?') || rawBack === path ? rawBack : b1(state).lastSearch[path] ?? path;
  const existing = data.applications.find(candidateApplication => candidateApplication.studentId === student?.id && candidateApplication.offerId === offer.id
    && !['withdrawn', 'rejected'].includes(candidateApplication.selectionStatus));
  return <Page title={offer.title} id={offer.kind === 'practice' ? 'P03' : 'P05'}>
    {notice}
    <a href={'#' + back}>← Вернуться к выдаче</a>
    <div className="columns space">
      <section className="card">
        <span className="status">
          {kindName(offer.kind)}
        </span>
        <h2>
          {data.companies.find(candidateCompany => candidateCompany.id === offer.companyId)!.name}
        </h2>
        <a href={'#/companies/' + offer.companyId}>Карточка компании →</a>
        <p>Регион: {offer.region}. {offer.kind === 'practice' ? 'Период практики' : 'Период набора'}: {offer.startDate} — {offer.endDate}.</p>
        <p>График: {offerSchedule(offer)}. {offerPaid(offer) ? 'Оплата: учебный пример, условия уточняются при отборе' : 'Без оплаты'}. Курс: {offer.minCourse ?? 3}–{offer.maxCourse ?? 4}.</p>
        <p>Траектория: {offer.programId}. Требуемые навыки: {offer.skills.join(', ')}.</p>
        {offer.kind === 'practice'
          ? <>
            <p>{offer.practiceType} практика · {offer.durationHours} часов. Наставник: {offer.supervisor}. Свободно: {available(state, offer)} из {offer.capacity} мест.</p>
            <p>Учебные задачи: {offer.expectedTasks}. Соответствие учебным требованиям проверяет координатор вуза.</p>
          </>
          : <p>Это {kindName(offer.kind).toLowerCase()}, учебное дело практики автоматически не создаётся.</p>}
      </section>
      <section className="card">
        {student
          ? <>
            {offer.endDate < state.demoClock && <p className="notice">Набор завершён. Новый отклик недоступен.</p>}
            <Matching result={compare(state, student.id, offer.id)} />
            <button onClick={() => run(() => toggleFavorite(state, offer.id))}>
              {favoriteIds(state).includes(offer.id) ? 'Убрать из избранного' : 'В избранное'}
            </button>
            {existing
              ? <p>
                <a href={'#/student/applications/' + existing.id}>Отклик уже отправлен →</a>
              </p>
              : <form
                onSubmit={e => {
                  e.preventDefault();
                  run(
                    () => submitApplication(state, offer.id, resumeId, consent).state,
                    'Отклик отправлен; работодатель может ответить в своём кабинете.'
                  );
                }}>
                <Field label="Резюме для отклика">
                  <select value={resumeId} onChange={event => setResumeId(event.target.value)}>
                    <option value="">Выберите готовое резюме</option>
                    {resumes.map(candidateResume => <option key={candidateResume.id} value={candidateResume.id}>{candidateResume.title} · версия {candidateResume.version}</option>)}
                  </select>
                </Field>
                {resumeId && <p>
                  <a href={'#/student/resumes/' + resumeId}>Проверить выбранное резюме →</a>
                </p>}
                <label className="check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Подтверждаю передачу выбранного демонстрационного резюме компании</label>
                <button
                  className="primary"
                  type="submit"
                  disabled={offer.endDate < state.demoClock || offer.kind === 'practice' && available(state, offer) <= 0}



                >Отправить отклик</button>
                <p className="tiny">Отклик не резервирует место. Несовпадения показаны для оценки, автоматического отказа нет.</p>
              </form>}
          </>
          : <>
            <p>Для отклика выберите тестового студента. Вы вернётесь к этому предложению.</p>
            <button onClick={() => {
              props.choose('persona_anna');
              location.hash = route;
            }}>Продолжить как Анна и вернуться</button>
          </>}
      </section>
    </div>
  </Page>;
}
function EducationPanel(props: ActionProps & {
  education: Education;
}) {
  const { education: e, state, run, notice } = props;
  const [path, setPath] = useState(correctionFields(e)[0].path);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const requests = b1(state).corrections.filter(candidateCorrectionRequest => candidateCorrectionRequest.studentId === e.studentId);
  return <Page
    title={props.route.endsWith('/history') ? 'История и исправления' : 'Образовательные сведения'}
    id="S03 / S04"



  >
    {notice}
    <div className="card">
      <h2>Учебная траектория · {dataFor(state).students.find(candidateStudent => candidateStudent.id === e.studentId)!.programId}</h2>
      <p>{dataFor(state).students.find(candidateStudent => candidateStudent.id === e.studentId)!.course} курс · МГСУ · учебные сведения вуза · {e.sourceDate} · версия {e.version}. Демонстрационный пример; прямой правки студентом нет.</p>
      <div className="list">
        {e.disciplines.map((d, i) => <div key={i}>
          <span>
            {d.name}
          </span>
          <strong>
            {d.result}
          </strong>
        </div>)}
      </div>
      <p>Учебные навыки: {e.skills.join(', ')}. Изучение дисциплины не означает профессиональный стаж.</p>
      <a href="#/student/education/history">История и запросы →</a>
    </div>
    <form
      className="card space"
      onSubmit={event => {
        event.preventDefault();
        run(() => requestCorrection(state, path, value, reason), 'Запрос направлен координатору');
      }}



    >
      <h2>Запросить исправление</h2>
      <Field label="Поле учебной записи">
        <select value={path} onChange={event => setPath(event.target.value)}>
          {correctionFields(e).map(f => <option key={f.path} value={f.path}>
            {f.label}
          </option>)}
        </select>
      </Field>
      <p>Текущее значение: {fieldValue(e, path)}</p>
      <Field label="Предложенное значение">
        <input maxLength={160} value={value} onChange={event => setValue(event.target.value)} />
      </Field>
      <Field label="Причина исправления">
        <textarea maxLength={600} value={reason} onChange={event => setReason(event.target.value)} />
      </Field>
      <button>Отправить запрос</button>
    </form>
    <p>
      <a href="#/support">Обратиться в поддержку по учебным данным →</a>
    </p>
    <h2>История запросов</h2>
    {requests.length
      ? requests.map(candidateCorrectionRequest => <article className="card space" key={candidateCorrectionRequest.id}>
        <span className="status">
          {correctionStatus[candidateCorrectionRequest.status]}
        </span>
        <p>{educationFieldLabel(candidateCorrectionRequest.fieldPath)}: {candidateCorrectionRequest.oldValue} → {candidateCorrectionRequest.proposedValue}</p>
        <p>Причина: {candidateCorrectionRequest.reason}</p>
        <p>
          {candidateCorrectionRequest.resolution ? 'Решение координатора: ' + candidateCorrectionRequest.resolution : 'Ожидает решения координатора'}
        </p>
      </article>)
      : <p className="card">Запросов ещё нет.</p>}
    <h2>Изменения учебной записи</h2>
    {e.history.length
      ? e.history.map(h => <p className="card space" key={h.requestId}>{h.at.slice(0, 10)} · {h.oldValue} → {h.newValue} · {h.resolution}</p>)
      : <p className="card">Учебная запись пока не изменялась.</p>}
  </Page>;
}
function Coordinator(props: ActionProps & {
  studentId: string;
}) {
  const { state, studentId, run, notice } = props;
  const data = dataFor(state);
  const student = data.students.find(candidateStudent => candidateStudent.id === studentId)!;
  const education = data.education.find(candidateEducation => candidateEducation.studentId === studentId)!;
  const requests = b1(state).corrections.filter(candidateCorrectionRequest => candidateCorrectionRequest.studentId === studentId);
  return <Page title={officialName(student) + ' · исправления'} id="U05">
    {notice}
    <a href="#/university/students">← Все студенты</a>
    <div className="card space">
      <p>{student.programId}, {student.course} курс · учебный набор МГСУ · версия {education.version}</p>
      {education.disciplines.map((d, i) => <p key={i}>{d.name}: {d.result}</p>)}
    </div>
    {requests.length
      ? requests.map(candidateCorrectionRequest => <CorrectionDecision key={candidateCorrectionRequest.id} request={candidateCorrectionRequest} state={state} run={run}



      />)
      : <p>Запросов нет.</p>}
  </Page>;
}
function CorrectionDecision({ request: r, state, run }: {
  request: import('../domain/b1-types').Correction;
  state: Envelope;
  run: ActionProps['run'];
}) {
  const [reason, setReason] = useState('');
  return <article className="card space">
    <h2>
      {educationFieldLabel(r.fieldPath)}
    </h2>
    <p>{r.oldValue} → {r.proposedValue}</p>
    <p>Причина студента: {r.reason}</p>
    <span className="status">
      {correctionStatus[r.status]}
    </span>
    {r.status === 'pending'
      ? <>
        <Field label="Пояснение решения">
          <textarea maxLength={600} value={reason} onChange={event => setReason(event.target.value)} />
        </Field>
        <div className="actions">
          <button onClick={() => run(() => resolveCorrection(state, r.id, true, reason), 'Исправление принято')}>Принять исправление</button>
          <button onClick={() => run(() => resolveCorrection(state, r.id, false, reason), 'Запрос отклонён')}>Отклонить запрос</button>
        </div>
      </>
      : <p>
        {r.resolution}
      </p>}
  </article>;
}
function ProjectForm(props: ActionProps & {
  project: Project;
}) {
  const { state, project, run, notice } = props;
  const [values, setValues] = useState(project);
  const [tools, setTools] = useState(project.tools.join(', '));
  if (project.source === 'university_demo') return <Page title={project.title} id="S05">
    <div className="card">
      <p>Источник: учебный набор вуза. Сведения доступны только для чтения.</p>
      <p>
        {project.task}
      </p>
      <p>Личный вклад: {project.contribution}</p>
      <p>Инструменты: {project.tools.join(', ')}</p>
      <p>Результат: {project.outcome}</p>
      <a href="#/student/projects/new">Создать собственное описание →</a>
    </div>
  </Page>;
  return <Page title="Описание учебного проекта" id="S05">
    {notice}
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        run(
          () => {
            const next = saveProject(state, { ...values, tools: csv(tools) });
            location.hash = '/student/projects/' + values.id;
            return next;
          },
          'Проект сохранён'
        );
      }}



    >
      <p>Заявление студента · учебный опыт, не трудовой стаж.</p>
      {(['title', 'task', 'contribution', 'outcome'] as const).map((key, i) => <Field
        key={key}
        label={['Название проекта', 'Учебная задача', 'Личный вклад', 'Учебный результат'][i]}



      >
        <textarea
          maxLength={key === 'title' ? 160 : 1200}
          value={values[key]}
          onChange={event => setValues({ ...values, [key]: event.target.value })}



        />
      </Field>)}
      <Field label="Инструменты через запятую">
        <input maxLength={600} value={tools} onChange={event => setTools(event.target.value)} />
      </Field>
      <Field label="Траектория проекта">
        <select value={values.programId} onChange={event => setValues({ ...values, programId: event.target.value })}



        >
          {programs.map(p => <option key={p}>
            {p}
          </option>)}
        </select>
      </Field>
      <button className="primary">Сохранить проект</button>
      <p>
        <a href="#/student/profile">Вернуться к проектам →</a>
      </p>
    </form>
  </Page>;
}
function ResumeForm(props: ActionProps & {
  resume: Resume;
}) {
  const { state, resume, run, notice } = props;
  const [values, setValues] = useState(resume);
  const [skills, setSkills] = useState(resume.skillClaims.join(', '));
  const projects = dataFor(state).projects.filter(candidateProject => candidateProject.studentId === resume.studentId);
  return <Page title="Редактор резюме" id="S07">
    {notice}
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        run(() => saveResume(state, { ...values, skillClaims: csv(skills) }), 'Резюме сохранено');
      }}



    >
      <p>Версия {resume.version}. Изменения формы сохраняются по кнопке. Отправленные отклики используют прежний снимок.</p>
      <Field label="Название резюме">
        <input
          maxLength={160}
          value={values.title}
          onChange={event => setValues({ ...values, title: event.target.value })}



        />
      </Field>
      <Field label="Целевая траектория">
        <select value={values.target} onChange={event => setValues({ ...values, target: event.target.value })}



        >
          {programs.map(p => <option key={p}>
            {p}
          </option>)}
        </select>
      </Field>
      <Field label="Самоописание">
        <textarea
          rows={7}
          maxLength={3000}
          value={values.summary}
          onChange={event => setValues({
            ...values,
            summary: event.target.value,
            origin: 'student'
          })}



        />
      </Field>
      <Field label="Учебный и практический опыт">
        <textarea
          rows={5}
          maxLength={3000}
          value={values.experienceSummary ?? ''}
          onChange={event => setValues({
            ...values,
            experienceSummary: event.target.value,
            origin: 'student'
          })}



        />
      </Field>
      <Field label="Заявленные навыки через запятую">
        <input value={skills} maxLength={600} onChange={event => setSkills(event.target.value)} />
      </Field>
      <fieldset>
        <legend>Учебные проекты для этого резюме</legend>
        {projects.map(candidateProject => <label className="check" key={candidateProject.id}><input
          type="checkbox"
          checked={values.projectIds.includes(candidateProject.id)}
          onChange={event => setValues({
            ...values,
            projectIds: event.target.checked ? [...values.projectIds, candidateProject.id] : values.projectIds.filter(id => id !== candidateProject.id)
          })}



        />{candidateProject.title} · {candidateProject.source === 'student' ? 'Заявление студента' : 'Учебный набор вуза'}</label>)}
      </fieldset>
      <Field label="Готовность резюме">
        <select
          value={values.status}
          onChange={event => setValues({ ...values, status: event.target.value as 'draft' | 'ready' })}



        >
          <option value="draft">Черновик</option>
          <option value="ready">Готово для отклика</option>
        </select>
      </Field>
      <button className="primary">Сохранить резюме</button>
      <div className="actions space">
        <a className="button ai-entry" href={'#/student/resumes/' + resume.id + '/assistant'}>
          <AIEntryLabel>Помочь улучшить резюме</AIEntryLabel>
        </a>
        <a href={'#/student/resumes/' + resume.id}>Предпросмотр сохранённой версии →</a>
        <a href="#/student/resumes">Все резюме →</a>
      </div>
    </form>
  </Page>;
}
function ResumePreview({ resume: r, education: e, projects }: {
  resume: Resume;
  education: Education;
  projects: Project[];
}) {
  return <div className="columns space">
    <article className="card">
      <h2>Образовательная часть</h2>
      <p>Учебный набор вуза · {e.sourceDate}, версия {e.version}. МГСУ — демонстрационный контекст.</p>
      {e.disciplines.map((d, i) => <p key={i}>{d.name}: {d.result}</p>)}
      <p>Учебные навыки: {e.skills.join(', ')}</p>
    </article>
    <article className="card">
      <h2>Самоописание</h2>
      <span className="status">{r.origin === 'ai_assisted'
        ? 'Текст с ИИ, принят студентом'
        : r.origin === 'mock_assisted' || r.origin === 'scripted_assistant'
          ? 'Демонстрационный помощник, принят студентом'
          : 'Заявление студента'} · версия {r.version} · {statusName[r.status]}</span>
      <p>Цель: {r.target}</p>
      <p className="prewrap">
        {r.summary || 'Самоописание не заполнено'}
      </p>
      <h3>Учебный и практический опыт</h3>
      <p className="prewrap">
        {r.experienceSummary || "Не заполнено"}
      </p>
      <p>Заявленные навыки: {r.skillClaims.join(', ') || 'Не указаны'}</p>
      {projects.map(candidateProject => <section key={candidateProject.id}>
        <h3>
          {candidateProject.title}
        </h3>
        <p>
          {candidateProject.contribution}
        </p>
        <p className="tiny">Источник: {candidateProject.source === 'student' ? 'заявление студента' : 'учебный набор вуза'}. Учебный опыт, не стаж.</p>
      </section>)}
    </article>
  </div>;
}
