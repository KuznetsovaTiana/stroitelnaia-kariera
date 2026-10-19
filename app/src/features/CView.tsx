import { CompanyCard } from './CompanyCard';
import { officialName } from '../domain/personName';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Envelope } from '../domain/types';
import type { Requirement, Template, Ticket, Subrole } from '../domain/c-types';
import { cState } from '../domain/c-types';
import { dataFor, isPublic, saveProfile } from '../domain/b1';
import { activeActor, canEmployer } from '../domain/access';
import {



  currentRequests,



  currentRequirements,



  currentTemplates,



  dictionaries,



  aiExamples,



  requestPlaces,



  respondPlaces,



  saveRequirement,



  saveTemplate,



  saveUniversity,



  saveProgram,



  importExample,



  importBadExample,



  previewImport,



  applyImport,



  createTicket,



  ticketAccess,



  replyTicket,



  hideReportedOffer,



  configureTeam,



  configureUser,



  addDictionary,



  setDictionaryActive,



  saveContent,



  reviewAi,



  setNotificationSettings,



  checkIntegration



} from '../domain/c';
import { aggregate, analyticsCsv } from '../domain/analytics';
import type { AnalyticsFilter } from '../domain/analytics';
import { canReadCase, conversationAllowed } from '../domain/b2';
import { Page, Field } from './B1View';
import { Chat, DocumentCard } from './B2View';
import { docNames } from '../domain/b2-types';
import { downloadText } from '../adapters/downloadText';
const cPaths = [
  '/companies',
  '/universities',
  '/universities/mgsu',
  '/professions',
  '/for-employers',
  '/for-universities',
  '/help',
  '/how-it-works',
  '/statistics',
  '/student/settings',
  '/employer/team',
  '/employer/university-requests',
  '/employer/analytics',
  '/university/company-requests',
  '/university/profile',
  '/university/programs',
  '/university/requirements',
  '/university/templates',
  '/university/import',
  '/university/analytics',
  '/university/students',
  '/operator/appeals',
  '/operator/dictionaries',
  '/operator/content',
  '/operator/ai-quality',
  '/operator/users',
  '/operator/reports',
  '/operator/integrations',
  '/support',
  '/settings/notifications',
  '/messages'
];
export const handlesC = (route: string) => {
  const p = route.split('?')[0];
  return cPaths.includes(p) || /^\/(professions|support|messages)\/[^/]+$/.test(p)
    || /^\/documents\/[^/]+(\/review)?$/.test(p)
    || /^\/employer\/offers\/[^/]+\/applications$/.test(p);
};
type Props = {
  state: Envelope;
  route: string;
  commit: (state: Envelope) => boolean;
  choose: (id: string) => void;
};
type Run = (fn: () => Envelope, message?: string) => boolean;
type FormProps = Props & {
  run: Run;
  notice: ReactNode;
};
const statuses: Record<string, string> = {
  pending: 'Ожидает ответа',
  answered: 'Ответ получен',
  open: 'Открыто',
  in_progress: 'В работе',
  resolved: 'Решено',
  closed: 'Закрыто',
  ready: 'Предпросмотр готов',
  invalid: 'Нет допустимых строк',
  applied: 'Применено'
};
export function CView(props: Props) {
  const { state, route, commit } = props;
  const path = route.split('?')[0];
  const q = new URLSearchParams(route.split('?')[1] ?? '');
  const data = dataFor(state);
  const persona = activeActor(state);
  const changes = cState(state);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const run: Run = (fn, message = 'Изменения сохранены') => {
    try {
      const next = fn();
      setError('');
      const saved = commit(next);
      setMessage(saved ? message : 'Изменения остались в памяти; запись не подтверждена');
      return true;
    } catch (e) {
      setError((e as Error).message);
      setMessage('');
      return false;
    }
  };
  const notice = <>
    {error && <p className="notice error" role="alert">
      {error}
    </p>}
    {message && <p className="notice" role="status">
      {message}
    </p>}
  </>;
  const denied = <Page title="Страница не найдена" id="ДОСТУП">
    <p>Объект недоступен текущей роли или отсутствует.</p>
  </Page>;
  if (path.startsWith('/operator') && persona.role !== 'operator'
    || path.startsWith('/university/') && persona.role !== 'coordinator'
    || path.startsWith('/employer/') && persona.role !== 'employer'
    || path.startsWith('/student/') && persona.role !== 'student') return denied;
  if (path === '/companies') {
    const query = q.get('q') ?? '';
    const region = q.get('region') ?? '';
    const direction = q.get('direction') ?? '';
    const list = data.companies.filter(candidateCompany => candidateCompany.status === 'approved' && candidateCompany.name.toLowerCase().includes(query.toLowerCase())
      && (!region || data.offers.some(candidateOffer => candidateOffer.companyId === candidateCompany.id && candidateOffer.region === region))
      && (!direction || data.offers.some(candidateOffer => candidateOffer.companyId === candidateCompany.id && candidateOffer.programId === direction)));
    return <Page title="Компании" id="P06">
      <div className="company-filters">
        <Field label="Название компании">
          <input value={query} onChange={event => {
            q.set('q', event.target.value);
            location.hash = '/companies?' + q;
          }}



          />
        </Field>
        <Field label="Регион компании">
          <select value={region} onChange={event => {
            q.set('region', event.target.value);
            location.hash = '/companies?' + q;
          }}



          >
            <option value="">Все</option>
            <option>Москва</option>
            <option>Казань</option>
          </select>
        </Field>
        <Field label="Направление компании">
          <select
            value={direction}
            onChange={event => {
              q.set('direction', event.target.value);
              location.hash = '/companies?' + q;
            }}



          >
            <option value="">Все</option>
            {data.programs.map(pr => <option key={pr.id} value={pr.id}>
              {pr.name}
            </option>)}
          </select>
        </Field>
      </div>
      <p className="tiny company-results-count" role="status">Найдено компаний: {list.length}</p>
      <div className="company-list">
        {list.map(candidateCompany => <CompanyCard
          key={candidateCompany.id}
          company={candidateCompany}
          offers={data.offers.filter(candidateOffer => candidateOffer.companyId === candidateCompany.id && isPublic(candidateOffer, state))}



        />)}
      </div>
      {!list.length && <p>Ничего не найдено.</p>}
      <a href="#/companies">Сбросить фильтры →</a>
    </Page>;
  }
  if (path === '/universities' || path === '/universities/mgsu') return <Page title={path === '/universities' ? 'Вузы' : 'МГСУ — учебный пример'} id="P08 / P09">
    <div className="card">
      <p>
        {changes.universityDescription}
      </p>
      <p>Единственный вуз демонстрации; официального подключения и обмена нет.</p>
      <a href="#/universities/mgsu">Открыть МГСУ →</a>
      {data.programs.map(pr => <section key={pr.id}>
        <h3>
          {pr.name}
        </h3>
        <p>Учебные навыки: {pr.skillIds.join(', ')} · группа {pr.group}</p>
        <a href={'#/practices?program=' + encodeURIComponent(pr.id)}>Практики этой программы →</a>
      </section>)}
    </div>
  </Page>;
  if (path === '/professions' || path.startsWith('/professions/')) {
    const id = path.split('/')[2];
    const query = q.get('q') ?? '';
    const dict = dictionaries(state);
    const list = dict.filter(candidateEntry => candidateEntry.active && ['profession', 'skill'].includes(candidateEntry.category) && (!id || candidateEntry.id === id)
      && candidateEntry.name.toLowerCase().includes(query.toLowerCase()));
    if (id && !list.length) return denied;
    return <Page title={id ? list[0].name : 'Профессии и навыки'} id="P10 / P11">
      {!id
        && <Field label="Профессия или навык">
          <input
            value={query}
            onChange={event => {
              location.hash = '/professions?q=' + encodeURIComponent(event.target.value);
            }}



          />
        </Field>}
      {list.map(candidateEntry => <article className="card space" key={candidateEntry.id}>
        <h2>
          <a href={'#/professions/' + candidateEntry.id}>{candidateEntry.name} →</a>
        </h2>
        <p>
          {candidateEntry.tasks}
        </p>
        {candidateEntry.skillIds.map(s => <p key={s}>
          {dict.find(candidateEntry => candidateEntry.id === s)?.name ?? 'Исторический навык'}
        </p>)}
        <a
          href={candidateEntry.category === 'skill'
            ? '#/jobs?skill=' + encodeURIComponent(candidateEntry.name)
            : '#/practices?program=' + encodeURIComponent(candidateEntry.programId)}>Предложения по подготовке →</a>
      </article>)}
      {!list.length && <p>Ничего не найдено. <a href="#/professions">Сбросить поиск →</a></p>}
    </Page>;
  }
  if (['/help', '/for-employers', '/for-universities', '/how-it-works'].includes(path)) {
    const key = path.slice(1);
    const defaults: Record<string, string> = {
      help: 'Демонстрация хранит изменения в браузере. Кнопка «Сменить роль» находится рядом с текущей ролью в шапке; сохранённые данные при смене роли остаются. Сброс удаляет только её локальный сценарий. Для обсуждения ошибки создайте обращение.',
      'for-employers': 'Публикуйте учебные места, рассматривайте резюме и сопровождайте практику. Роли команды ограничивают действия.',
      'for-universities': 'Координатор проверяет образование, согласует практики, задаёт требования и отправляет запросы мест.',
      'how-it-works': 'Студент выбирает место и резюме → работодатель отвечает → студент принимает → вуз согласует документы → задания, отчёт и итог. Учебные факты отделены от самоописания.'
    };
    return <Page
      title={{
        help: 'Помощь и о проекте',
        'for-employers': 'Работодателям',
        'for-universities': 'Вузам',
        'how-it-works': 'Как это работает'
      }[key]!}
      id="P12 / P13 / P14 / P16"



    >
      <section className="card">
        <p className="prewrap">
          {changes.content[key] ?? defaults[key]}
        </p>
        <p>Демонстрация · вымышленные данные. Интеграция с вузом и подпись имитируются. ИИ-помощник использует GigaChat при подключённом сервере; доступность и режим показаны в диалоге.</p>
        <div className="actions">
          <a
            className="button"
            href={'#' + ({
              student: '/student',
              employer: '/employer',
              coordinator: '/university',
              operator: '/operator'
            }[persona.role])}



          >Вернуться в кабинет</a>
          <a href="#/support">Обратиться в поддержку →</a>
          <a href="#/demo/about">Ограничения демонстрации →</a>
        </div>
      </section>
    </Page>;
  }
  if (path === '/employer/analytics' && !canEmployer(state, 'analytics')) return <Page id="E15" title="Недоступно этой подроли">
    <p>Аналитика доступна администратору и рекрутеру компании.</p>
  </Page>;
  if (['/statistics', '/employer/analytics', '/university/analytics', '/operator/reports'].includes(path)) return <Analytics {...props} publicOnly={path === '/statistics'} />;
  if (path === '/employer/university-requests' || path === '/university/company-requests') return <Requests {...props} run={run} notice={notice} />;
  if (path === '/university/requirements' || path === '/university/templates') return <Versions {...props} run={run} notice={notice} />;
  if (path === '/university/import') return <ImportView {...props} run={run} notice={notice} />;
  if (path === '/university/profile' || path === '/university/programs') return <UniversitySettings {...props} run={run} notice={notice} />;
  if (path === '/support' || path.startsWith('/support/') || path === '/operator/appeals') return <Support {...props} run={run} notice={notice} />;
  if (path === '/employer/team' || path === '/operator/users') return <TeamUsers {...props} run={run} notice={notice} />;
  if (path === '/operator/dictionaries' || path === '/operator/content' || path === '/operator/ai-quality'
    || path === '/operator/integrations') return <OperatorTools {...props} run={run} notice={notice} />;
  if (path === '/settings/notifications') return <Page title="Настройки уведомлений" id="C08">
    {notice}
    <div className="card">
      <p>Обязательные события практики, решений и обращений всегда остаются в центре уведомлений.</p>
      <label className="check"><input
        type="checkbox"
        checked={changes.notificationSettings[persona.id]?.recommendations ?? true}
        onChange={event => run(() => setNotificationSettings(state, event.target.checked))}



      />Показывать необязательные рекомендации</label>
    </div>
  </Page>;
  if (path === '/student/settings') {
    const student = data.students.find(candidateStudent => candidateStudent.id === persona.studentId)!;
    return <Page title="Настройки и видимость" id="S16">
      {notice}
      <Field label="Видимость профиля">
        <select
          value={student.visibility}
          onChange={event => run(() => saveProfile(state, { ...student, visibility: event.target.value as 'visible' | 'hidden' }))}



        >
          <option value="visible">Виден в поиске</option>
          <option value="hidden">Скрыт из поиска</option>
        </select>
      </Field>
      <p>Отправленные резюме и существующие отклики сохраняются.</p>
      <a href="#/settings/notifications">Категории уведомлений →</a>
    </Page>;
  }
  if (path === '/university/students') {
    const program = q.get('program') ?? '';
    const placed = q.get('placed') ?? '';
    const list = data.students.filter(candidateStudent => (!program || candidateStudent.programId === program)
      && (!placed
        || String(data.practices.some(candidatePractice => candidatePractice.studentId === candidateStudent.id && candidatePractice.reservationActive
          && ['approved', 'in_progress', 'review', 'completed'].includes(candidatePractice.status))) === placed));
    return <Page title="Студенты и группы" id="U04">
      <Field label="Программа студентов">
        <select value={program} onChange={event => {
          q.set('program', event.target.value);
          location.hash = path + '?' + q;
        }}



        >
          <option value="">Все</option>
          {data.programs.map(pr => <option key={pr.id} value={pr.id}>
            {pr.name}
          </option>)}
        </select>
      </Field>
      <Field label="Обеспеченность практикой">
        <select value={placed} onChange={event => {
          q.set('placed', event.target.value);
          location.hash = path + '?' + q;
        }}



        >
          <option value="">Все</option>
          <option value="true">Есть согласованная практика</option>
          <option value="false">Нет согласованной практики</option>
        </select>
      </Field>
      {list.map(candidateStudent => <p className="card space" key={candidateStudent.id}>
        <a href={'#/university/students/' + candidateStudent.id}>{officialName(candidateStudent)} · {candidateStudent.group ?? 'Учебная группа'} · {candidateStudent.course} курс →</a>
      </p>)}
      {!list.length && <p>Нет результатов.</p>}
      <a href="#/university/students">Сбросить фильтры →</a>
    </Page>;
  }
  if (/^\/employer\/offers\/[^/]+\/applications$/.test(path)) {
    const offer = data.offers.find(candidateOffer => candidateOffer.id === path.split('/')[3] && candidateOffer.companyId === persona.organizationId && canEmployer(state, 'read', candidateOffer.id));
    if (!offer) return denied;
    return <Page title={'Воронка: ' + offer.title} id="E09">
      {data.applications.filter(candidateApplication => candidateApplication.offerId === offer.id).map(candidateApplication => <p className="card space" key={candidateApplication.id}>
        <a href={'#/employer/applications/' + candidateApplication.id}>{candidateApplication.resumeSnapshot.title} · {candidateApplication.selectionStatus} →</a>
      </p>)}
    </Page>;
  }
  if (path === '/messages' || path.startsWith('/messages/')) {
    const ref = path.split('/')[2];
    const contexts = [
      ...data.applications.filter(candidateApplication => conversationAllowed(state, 'application', candidateApplication.id)).map(candidateApplication => ({
        type: 'application' as const,
        id: candidateApplication.id,
        title: 'Отклик: ' + candidateApplication.resumeSnapshot.title
      })),
      ...data.practices.filter(candidatePractice => canReadCase(state, candidatePractice)).map(candidatePractice => ({
        type: 'practice' as const,
        id: candidatePractice.id,
        title: 'Практика: ' + candidatePractice.offerSnapshot.title
      }))
    ];
    if (ref) {
      const ctx = contexts.find(c => c.type + '_' + c.id === ref);
      if (!ctx) return denied;
      return <Page title="Сообщения" id="C01">
        {notice}
        <Chat state={state} type={ctx.type} id={ctx.id} run={run} />
      </Page>;
    }
    return <Page title="Сообщения" id="C01">
      {contexts.map(ctx => <p className="card space" key={ctx.type + ctx.id}>
        <a href={'#/messages/' + ctx.type + '_' + ctx.id}>{ctx.title} →</a>
      </p>)}
      {!contexts.length && <p>Разрешённых диалогов пока нет.</p>}
    </Page>;
  }
  if (path.startsWith('/documents/')) {
    const document = data.documents.find(candidateDocument => candidateDocument.id === path.split('/')[2]);
    const practice = document && data.practices.find(candidatePractice => candidatePractice.id === document.practiceId);
    if (!document || !practice || !canReadCase(state, practice)) return denied;
    return <Page title={'Учебная версия: ' + docNames[document.type]} id={path.endsWith('/review') ? 'C06' : 'C05'}



    >
      {notice}
      <DocumentCard state={state} item={document} run={run} />
    </Page>;
  }
  return denied;
}
function Requests(props: FormProps) {
  const { state, run, notice } = props;
  const data = dataFor(state);
  const persona = activeActor(state);
  const [values, setValues] = useState({
    companyId: 'company_sever_demo',
    programId: 'ПТО',
    start: '2026-11-02',
    end: '2026-11-27',
    requested: 2,
    message: ''
  });
  const list = currentRequests(state).filter(candidatePlaceRequest => persona.role === 'coordinator' || candidatePlaceRequest.companyId === persona.organizationId);
  return <Page title={persona.role === 'coordinator' ? 'Запросы компаниям' : 'Запросы вузов'} id="U08 / E13">
    {notice}
    {persona.role === 'coordinator'
      && <form
        className="card"
        onSubmit={e => {
          e.preventDefault();
          run(() => requestPlaces(state, values), 'Запрос создан; студентов автоматически не назначает');
        }}



      >
        <Field label="Компания для запроса">
          <select value={values.companyId} onChange={event => setValues({ ...values, companyId: event.target.value })}



          >
            {data.companies.filter(candidateCompany => candidateCompany.status === 'approved').map(candidateCompany => <option key={candidateCompany.id} value={candidateCompany.id}>
              {candidateCompany.name}
            </option>)}
          </select>
        </Field>
        <Field label="Программа запроса">
          <select value={values.programId} onChange={event => setValues({ ...values, programId: event.target.value })}



          >
            {data.programs.map(p => <option key={p.id} value={p.id}>
              {p.name}
            </option>)}
          </select>
        </Field>
        <Field label="Начало запроса">
          <input type="date" value={values.start} onChange={event => setValues({ ...values, start: event.target.value })}



          />
        </Field>
        <Field label="Конец запроса">
          <input type="date" value={values.end} onChange={event => setValues({ ...values, end: event.target.value })}



          />
        </Field>
        <Field label="Число запрошенных мест">
          <input
            type="number"
            min={1}
            value={values.requested}
            onChange={event => setValues({ ...values, requested: Number(event.target.value) })}



          />
        </Field>
        <Field label="Сообщение запроса">
          <textarea
            value={values.message}
            maxLength={600}
            onChange={event => setValues({ ...values, message: event.target.value })}



          />
        </Field>
        <button>Отправить запрос мест</button>
      </form>}
    {list.map(candidatePlaceRequest => <RequestCard key={candidatePlaceRequest.id} state={state} requestId={candidatePlaceRequest.id} run={run}



    />)}
    {!list.length && <p>Запросов пока нет.</p>}
  </Page>;
}
function RequestCard({ state, requestId, run }: {
  state: Envelope;
  requestId: string;
  run: Run;
}) {
  const placeRequest = currentRequests(state).find(candidatePlaceRequest => candidatePlaceRequest.id === requestId)!;
  const [number, setNumber] = useState(placeRequest.proposed);
  const [reply, setReply] = useState(placeRequest.response);
  return <article className="card space">
    <h3>{placeRequest.programId} · {placeRequest.requested} мест · {statuses[placeRequest.status]}</h3>
    <p>{placeRequest.start} — {placeRequest.end} · {placeRequest.message}</p>
    <p>Предложено: {placeRequest.proposed}. Ответ: {placeRequest.response || 'Ожидается'}</p>
    {activeActor(state).role === 'employer' && canEmployer(state, 'publish')
      && <form
        onSubmit={e => {
          e.preventDefault();
          run(() => respondPlaces(state, placeRequest.id, number, reply), 'Ответ сохранён; вуз видит предложенное число мест');
        }}>
        <Field label="Предложено мест">
          <input
            type="number"
            min={0}
            max={100}
            value={number}
            onChange={event => setNumber(Number(event.target.value))}



          />
        </Field>
        <Field label="Ответ компании">
          <textarea value={reply} maxLength={600} onChange={event => setReply(event.target.value)} />
        </Field>
        <button>Ответить на запрос</button>
      </form>}
  </article>;
}
function Versions(props: FormProps) {
  const { state, route, run, notice } = props;
  const isTemplate = route === '/university/templates';
  return <Page title={isTemplate ? 'Версии шаблонов' : 'Требования к практике'} id={isTemplate ? 'U10' : 'U09'}



  >
    {notice}
    <p>Новая версия применяется к новым делам. Созданные дела и документы сохраняют снимки.</p>
    {isTemplate
      ? currentTemplates(state).map(candidateTemplate => <TemplateForm key={candidateTemplate.id + ':' + candidateTemplate.version} state={state} value={candidateTemplate} run={run}



      />)
      : currentRequirements(state).map(candidateRequirement => <RequirementForm key={candidateRequirement.id + ':' + candidateRequirement.version} state={state} value={candidateRequirement} run={run}



      />)}
  </Page>;
}
function RequirementForm({ state, value, run }: {
  state: Envelope;
  value: Requirement;
  run: Run;
}) {
  const [v, setV] = useState(value);
  return <form
    className="card space"
    data-requirement={v.id}
    onSubmit={e => {
      e.preventDefault();
      run(() => saveRequirement(state, v), 'Новая версия требований сохранена');
    }}



  >
    <h3>{v.programId} · {v.practiceType} · версия {value.version}</h3>
    <Field label="Минимальный объём часов">
      <input
        type="number"
        min={1}
        value={v.minHours}
        onChange={event => setV({ ...v, minHours: Number(event.target.value) })}



      />
    </Field>
    <fieldset>
      <legend>Начальные обязательные документы</legend>
      {(['agreement', 'direction', 'assignment'] as const).map(t => <label className="check" key={t}>
        <input
          type="checkbox"
          checked={v.requiredDocuments.includes(t)}
          onChange={event => setV({
            ...v,
            requiredDocuments: event.target.checked ? [...v.requiredDocuments, t] : v.requiredDocuments.filter(x => x !== t)
          })}



        />
        {docNames[t]}
      </label>)}
    </fieldset>
    <Field label="Пояснение правил завершения">
      <textarea
        maxLength={600}
        value={v.completionRule}
        onChange={event => setV({ ...v, completionRule: event.target.value })}



      />
    </Field>
    <p className="tiny">Пояснение выводится человеку. Система проверяет согласованные документы, принятые задания, отчёт и итог координатора; свободный текст не исполняется как правило.</p>
    <button>Сохранить новую версию требований</button>
  </form>;
}
function TemplateForm({ state, value, run }: {
  state: Envelope;
  value: Template;
  run: Run;
}) {
  const [v, setV] = useState(value);
  const samples: Record<string, string> = {
    student: 'Студент — демо',
    company: 'Компания — демо',
    period: '02–27.11.2026',
    tasks: 'Учебная схема',
    report: 'Учебный отчёт'
  };
  return <form
    className="card space"
    data-template={v.type}
    onSubmit={e => {
      e.preventDefault();
      run(() => saveTemplate(state, v), 'Новая версия шаблона сохранена');
    }}



  >
    <h3>{docNames[v.type]} · версия {value.version}</h3>
    <Field label="Текст шаблона">
      <textarea rows={5} maxLength={3000} value={v.body} onChange={event => setV({ ...v, body: event.target.value })}



      />
    </Field>
    <fieldset>
      <legend>Поля для печати</legend>
      {[
        'student',
        'university',
        'company',
        'period',
        'hours',
        'tasks',
        'companySupervisor',
        'universitySupervisor',
        'notes',
        'generatedAt',
        ...(v.type === 'report' ? ['report'] : [])
      ].map(f => <label className="check" key={f}>
        <input
          type="checkbox"
          checked={v.fields.includes(f)}
          onChange={event => setV({ ...v, fields: event.target.checked ? [...v.fields, f] : v.fields.filter(x => x !== f) })}



        />
        {({
          student: 'Студент',
          university: 'Вуз',
          company: 'Компания',
          period: 'Период',
          hours: 'Часы',
          tasks: 'Задачи',
          companySupervisor: 'Наставник компании',
          universitySupervisor: 'Руководитель вуза',
          notes: 'Примечания',
          generatedAt: 'Дата формирования',
          report: 'Отчёт'
        } as Record<string, string>)[f]}
      </label>)}
    </fieldset>
    <p className="prewrap">Учебный предпросмотр: {v.body.replace(
      /\{\{([^{}]+)\}\}/g,
      (_, key) => samples[key] ?? (v.fields.includes(key) ? 'Учебное значение' : '[Неизвестное поле: ' + key + ']')
    )}</p>
    <button>Сохранить новую версию шаблона</button>
  </form>;
}
function ImportView(props: FormProps) {
  const { state, run, notice } = props;
  const [raw, setRaw] = useState(importExample);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const batch = cState(state).batches.at(-1);
  return <Page title="Тестовый импорт" id="U11">
    {notice}
    <p className="notice">Имитация обмена с МГСУ. Только учебный JSON с вымышленными данными; сетевого соединения нет.</p>
    <div className="actions">
      <button onClick={() => setRaw(importExample)}>Корректный образец</button>
      <button onClick={() => setRaw(importBadExample)}>Образец с ошибками</button>
    </div>
    <form
      className="card space"
      onSubmit={e => {
        e.preventDefault();
        run(() => previewImport(state, raw), 'Предпросмотр выполнен; данные ещё не применены');
      }}



    >
      <Field label="Учебный JSON">
        <textarea rows={12} value={raw} onChange={event => setRaw(event.target.value)} />
      </Field>
      <Field label="Учебный файл JSON">
        <input
          type="file"
          accept=".json,application/json"
          disabled={loading}
          onChange={async event => {
            const f = event.target.files?.[0];
            if (!f) return;
            if (f.size > 100 * 1024) {
              run(() => {
                throw new Error('Файл больше 100 KiB');
              });
              return;
            }
            setLoading(true);
            try {
              setRaw(await f.text());
            } finally {
              setLoading(false);
            }
          }}



        />
      </Field>
      <button disabled={loading}>
        {loading ? 'Чтение файла…' : 'Проверить импорт'}
      </button>
    </form>
    {batch
      && <section className="card space">
        <h2>Предпросмотр: {statuses[batch.status]}</h2>
        {batch.rows.map(r => <p key={r.index}>Строка {r.index + 1}: {r.row?.name ?? 'Ошибка'} · {r.errors.join('; ') || 'Допустима'}</p>)}
        <p>Применено ID: {batch.appliedIds.join(', ') || 'Нет'}</p>
        <label className="check"><input type="checkbox" checked={confirm} onChange={event => setConfirm(event.target.checked)} />Подтверждаю применение только допустимых строк</label>
        <button
          onClick={() => run(() => applyImport(state, batch.id, confirm), 'Учебные данные применены без дублирования ID')}>Применить допустимые строки</button>
      </section>}
  </Page>;
}
function UniversitySettings(props: FormProps) {
  const { state, route, run, notice } = props;
  const [description, setDescription] = useState(cState(state).universityDescription);
  return <Page title={route === '/university/profile' ? 'Профиль вуза' : 'Учебные программы'} id="U02 / U03">
    {notice}
    {route === '/university/profile'
      ? <form
        className="card"
        onSubmit={e => {
          e.preventDefault();
          run(() => saveUniversity(state, description));
        }}



      >
        <Field label="Демонстрационное описание МГСУ">
          <textarea value={description} maxLength={1200} onChange={event => setDescription(event.target.value)}



          />
        </Field>
        <button>Сохранить описание вуза</button>
        <p>
          <a href="#/universities/mgsu">Публичная карточка →</a>
        </p>
      </form>
      : dataFor(state).programs.map(pr => <ProgramForm key={pr.id} {...props} programId={pr.id} />)}
  </Page>;
}
function ProgramForm(props: FormProps & {
  programId: string;
}) {
  const { state, programId, run } = props;
  const p = dataFor(state).programs.find(p => p.id === programId)!;
  const [name, setName] = useState(p.name);
  const [group, setGroup] = useState(p.group);
  const [skills, setSkills] = useState(p.skillIds.join(', '));
  return <form
    className="card space"
    onSubmit={e => {
      e.preventDefault();
      run(() => saveProgram(state, p.id, name, skills.split(',').map(x => x.trim()).filter(Boolean), group));
    }}



  >
    <Field label="Название программы">
      <input value={name} maxLength={160} onChange={event => setName(event.target.value)} />
    </Field>
    <Field label="Учебная группа">
      <input value={group} maxLength={80} onChange={event => setGroup(event.target.value)} />
    </Field>
    <Field label="Навыки программы">
      <input value={skills} onChange={event => setSkills(event.target.value)} />
    </Field>
    <button>Сохранить учебную программу</button>
  </form>;
}
function Support(props: FormProps) {
  const { state, route, run, notice } = props;
  const changes = cState(state);
  const persona = activeActor(state);
  const ticketId = route.startsWith('/support/') ? route.split('/')[2] : undefined;
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Поддержка');
  const [objectType, setObjectType] = useState<Ticket['objectType']>('none');
  const [objectId, setObjectId] = useState('');
  if (ticketId) {
    let t;
    try {
      t = ticketAccess(state, ticketId);
    } catch {
      return <Page title="Страница не найдена" id="C04">
        <p>Обращение недоступно.</p>
      </Page>;
    }
    return <TicketView {...props} ticket={t} />;
  }
  ;
  const list = changes.tickets.filter(candidateTicket => candidateTicket.authorId === persona.id || persona.role === 'operator');
  return <Page title={route === '/operator/appeals' ? 'Жалобы и обращения' : 'Поддержка'} id="C03 / O04">
    {notice}
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        run(
          () => createTicket(state, category, body, objectType, objectId),
          'Обращение создано; оператор уведомлён'
        );
      }}



    >
      <Field label="Категория обращения">
        <select value={category} onChange={event => setCategory(event.target.value)}>
          {['Поддержка', 'Данные', 'Практика', 'Нарушение'].map(c => <option key={c}>
            {c}
          </option>)}
        </select>
      </Field>
      <Field label="Тип связанного объекта">
        <select
          value={objectType}
          onChange={event => {
            setObjectType(event.target.value as Ticket['objectType']);
            setObjectId('');
          }}



        >
          {['none', 'offer', 'company', 'education'].map(v => <option key={v} value={v}>
            {({
              none: 'Без связи',
              offer: 'Предложение',
              company: 'Компания',
              education: 'Учебные сведения'
            } as Record<string, string>)[v]}
          </option>)}
        </select>
      </Field>
      <Field label="Связанный объект">
        <select value={objectId} disabled={objectType === 'none'} onChange={event => setObjectId(event.target.value)}



        >
          <option value="">Не выбран</option>
          {(objectType === 'offer'
            ? dataFor(state).offers.filter(candidateOffer => isPublic(candidateOffer, state) || candidateOffer.companyId === persona.organizationId || persona.role === 'operator')
              .map(candidateOffer => ({ id: candidateOffer.id, name: candidateOffer.title }))
            : objectType === 'company'
              ? dataFor(state).companies.filter(candidateCompany => candidateCompany.status === 'approved' || candidateCompany.id === persona.organizationId || persona.role === 'operator')
                .map(candidateCompany => ({ id: candidateCompany.id, name: candidateCompany.name }))
              : objectType === 'education'
                ? dataFor(state).education.filter(candidateEducation => persona.role === 'coordinator' || candidateEducation.studentId === persona.studentId).map(candidateEducation => ({ id: candidateEducation.id, name: 'Учебные сведения ' + dataFor(state).students.find(candidateStudent => candidateStudent.id === candidateEducation.studentId)?.name }))
                : []).map(o => <option key={o.id} value={o.id}>
                  {o.name}
                </option>)}
        </select>
      </Field>
      <Field label="Текст обращения">
        <textarea maxLength={2000} value={body} onChange={event => setBody(event.target.value)} />
      </Field>
      <button>Создать обращение</button>
    </form>
    {list.map(candidateTicket => <p className="card space" key={candidateTicket.id}>
      <a href={'#/support/' + candidateTicket.id}>{candidateTicket.id.slice(-8)} · {candidateTicket.category} · {statuses[candidateTicket.status]} →</a>
    </p>)}
    {!list.length && <p>Обращений пока нет.</p>}
  </Page>;
}
function TicketView(props: FormProps & {
  ticket: Ticket;
}) {
  const { state, ticket: t, run, notice } = props;
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState(t.status);
  return <Page title={'Обращение ' + t.id.slice(-8)} id="C04">
    {notice}
    <section className="card">
      <p>{t.category} · {statuses[t.status]} · {t.objectType} {t.objectId}</p>
      {t.comments.map((c, i) => <p key={i}>{c.at.slice(0, 10)} · {dataFor(state).personas.find(p => p.id === c.actorId)?.name}: {c.text}</p>)}
      <form
        onSubmit={e => {
          e.preventDefault();
          run(() => replyTicket(state, t.id, reply, status), 'Ответ и статус сохранены');
        }}>
        <Field label="Ответ в обращении">
          <textarea value={reply} maxLength={2000} onChange={event => setReply(event.target.value)} />
        </Field>
        <Field label="Статус обращения">
          <select value={status} onChange={event => setStatus(event.target.value as Ticket['status'])}>
            {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>
              {statuses[s]}
            </option>)}
          </select>
        </Field>
        <button>Сохранить ответ</button>
      </form>
      {activeActor(state).role === 'operator' && t.objectType === 'offer'
        && <button
          onClick={() => run(() => hideReportedOffer(state, t.id, reply), 'Предложение скрыто, автор видит причину')}>Скрыть связанное предложение</button>}
    </section>
  </Page>;
}
function TeamUsers(props: FormProps) {
  const { state, route, run, notice } = props;
  const data = dataFor(state);
  const users = route === '/operator/users';
  return <Page title={users ? 'Тестовые пользователи' : 'Команда и полномочия'} id={users ? 'O08' : 'E14'}>
    {notice}
    {users
      ? data.personas.map(p => <article className="card space" key={p.id}>
        <h3>
          {officialName(p)}
        </h3>
        <p>Одна основная роль: {({
          student: 'Студент',
          employer: 'Компания',
          coordinator: 'Координатор',
          operator: 'Оператор'
        })[p.role]} · {p.active ? 'Активен' : 'Отключён'}</p>
        <button
          disabled={p.id === 'operator_demo'}
          onClick={() => run(() => configureUser(state, p.id, !p.active))}



        >
          {p.active ? 'Отключить пользователя' : 'Включить пользователя'}
        </button>
      </article>)
      : canEmployer(state, 'team')
        ? data.personas.filter(p => p.role === 'employer' && p.id !== 'employer_sever_demo'
          && p.organizationId === activeActor(state).organizationId)
          .map(p => <TeamForm key={p.id} {...props} personaId={p.id} />)
        : <p className="notice">Управление командой доступно администратору. Основной администратор и сброс остаются доступны в выборе роли.</p>}
  </Page>;
}
function TeamForm(props: FormProps & {
  personaId: string;
}) {
  const { state, personaId, run } = props;
  const p = dataFor(state).personas.find(p => p.id === personaId)!;
  const initial = cState(state).team[personaId] ?? { subrole: p.subrole ?? 'recruiter', offerIds: ['offer_pto_demo', 'offer_7_demo', 'offer_13_demo'] };
  const [values, setValues] = useState(initial);
  return <form
    className="card space"
    onSubmit={e => {
      e.preventDefault();
      run(() => configureTeam(state, personaId, values.subrole, values.offerIds));
    }}



  >
    <h3>
      {officialName(p)}
    </h3>
    <Field label="Подроль сотрудника">
      <select
        value={values.subrole}
        onChange={event => setValues({ ...values, subrole: event.target.value as Subrole })}



      >
        {['owner', 'recruiter', 'manager', 'documents'].map(r => <option key={r} value={r}>
          {({
            owner: 'Администратор',
            recruiter: 'Рекрутер',
            manager: 'Руководитель отдела',
            documents: 'Специалист по документам'
          })[r]}
        </option>)}
      </select>
    </Field>
    <fieldset>
      <legend>Назначенные предложения</legend>
      {dataFor(state).offers.filter(candidateOffer => candidateOffer.companyId === p.organizationId).map(candidateOffer => <label className="check" key={candidateOffer.id}>
        <input
          type="checkbox"
          checked={values.offerIds.includes(candidateOffer.id)}
          onChange={event => setValues({
            ...values,
            offerIds: event.target.checked ? [...values.offerIds, candidateOffer.id] : values.offerIds.filter(id => id !== candidateOffer.id)
          })}



        />
        {candidateOffer.title}
      </label>)}
    </fieldset>
    <button>Сохранить полномочия сотрудника</button>
  </form>;
}
function OperatorTools(props: FormProps) {
  const { state, route, run, notice } = props;
  const changes = cState(state);
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState('');
  const [category, setCategory] = useState<'direction' | 'skill' | 'profession'>('direction');
  const [key, setKey] = useState('help');
  const [article, setArticle] = useState(changes.content.help ?? 'Учебная справка о демонстрации');
  const [simulateError, setSimulateError] = useState(false);
  if (route === '/operator/dictionaries') return <Page title="Строительные справочники" id="O05">
    {notice}
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        run(
          () => addDictionary(state, {
            category,
            name,
            tasks,
            programId: 'ПТО',
            skillIds: []
          }),
          'Элемент добавлен; доступен в новых формах'
        );
      }}



    >
      <Field label="Категория справочника">
        <select value={category} onChange={event => setCategory(event.target.value as typeof category)}>
          <option value="direction">Направление</option>
          <option value="skill">Навык</option>
          <option value="profession">Профессия</option>
        </select>
      </Field>
      <Field label="Название элемента">
        <input maxLength={100} value={name} onChange={event => setName(event.target.value)} />
      </Field>
      <Field label="Задачи и описание">
        <textarea maxLength={600} value={tasks} onChange={event => setTasks(event.target.value)} />
      </Field>
      <button>Добавить элемент справочника</button>
    </form>
    {dictionaries(state).map(candidateEntry => <article className="card space" key={candidateEntry.id}>
      <h3>{candidateEntry.name} · {({
        direction: 'Направление',
        skill: 'Навык',
        profession: 'Профессия'
      })[candidateEntry.category]}</h3>
      <p>{candidateEntry.tasks} · {candidateEntry.active ? 'Активен' : 'Исторический, деактивирован'}</p>
      <button onClick={() => run(() => setDictionaryActive(state, candidateEntry.id, !candidateEntry.active))}>
        {candidateEntry.active ? 'Деактивировать' : 'Активировать'}
      </button>
    </article>)}
  </Page>;
  if (route === '/operator/content') return <Page title="Справочный контент" id="O06">
    {notice}
    <form className="card" onSubmit={e => {
      e.preventDefault();
      run(() => saveContent(state, key, article));
    }}



    >
      <Field label="Статья">
        <select
          value={key}
          onChange={event => {
            setKey(event.target.value);
            setArticle(changes.content[event.target.value] ?? 'Учебная справочная статья');
          }}



        >
          {['help', 'for-employers', 'for-universities', 'how-it-works'].map(k => <option key={k}>
            {k}
          </option>)}
        </select>
      </Field>
      <Field label="Текст статьи">
        <textarea rows={10} maxLength={3000} value={article} onChange={event => setArticle(event.target.value)}



        />
      </Field>
      <button>Сохранить статью</button>
      <p>
        <a href={'#/' + key}>Открыть публичный текст →</a>
      </p>
    </form>
  </Page>;
  if (route === '/operator/ai-quality') return <Page title="Архив сценарных примеров" id="O07">
    {notice}
    <p>Архив прежних демонстрационных примеров. Эти оценки не относятся к ответам GigaChat; диалоги нового помощника здесь не сохраняются.</p>
    {aiExamples(state).map(e => <AiReview key={e.id} state={state} exampleId={e.id} run={run} />)}
  </Page>;
  return <Page title="Интеграции и журнал" id="O10">
    {notice}
    <p className="notice">Имитация обмена. Ни одна кнопка не выполняет внешние запросы или реальное соединение с МГСУ.</p>
    <label className="check"><input type="checkbox" checked={simulateError} onChange={event => setSimulateError(event.target.checked)}



    />Контрольная ошибка соединения</label>
    <button
      onClick={() => run(() => checkIntegration(state, !simulateError), 'Результат имитации записан в журнал')}>Запустить тестовую проверку</button>
    {changes.integrationChecks.map(check => <p className={'card space ' + (!check.success ? 'error' : '')} key={check.id}>{check.at} · {check.message}</p>)}
    {!changes.integrationChecks.length && <p>Журнал проверок пуст.</p>}
  </Page>;
}
function AiReview({ state, exampleId, run }: {
  state: Envelope;
  exampleId: string;
  run: Run;
}) {
  const e = aiExamples(state).find(e => e.id === exampleId)!;
  const [comment, setComment] = useState('');
  return <article className="card space">
    <h3>{e.branch} · {e.verdict}</h3>
    <p className="prewrap">
      {e.text}
    </p>
    <p>Использованные ответы: {e.facts.join('; ')}</p>
    <p>
      {e.comment}
    </p>
    <Field label="Обоснование оценки примера">
      <textarea maxLength={600} value={comment} onChange={event => setComment(event.target.value)} />
    </Field>
    <div className="actions">
      <button onClick={() => run(() => reviewAi(state, e.id, 'approved', comment))}>Пример проверен</button>
      <button onClick={() => run(() => reviewAi(state, e.id, 'needs_revision', comment))}>Отметить ошибку примера</button>
    </div>
  </article>;
}
function Analytics(props: Props & {
  publicOnly: boolean;
}) {
  const { state, publicOnly, route } = props;
  const q = new URLSearchParams(route.split('?')[1] ?? '');
  const [f, setF] = useState<AnalyticsFilter>({
    region: q.get('region') ?? '',
    offerId: q.get('offer') ?? '',
    programId: q.get('program') ?? '',
    start: q.get('start') ?? '2026-01-01',
    end: q.get('end') ?? '2026-12-31',
    origin: q.get('origin') === 'visitor' ? 'visitor' : 'all'
  });
  const [open, setOpen] = useState(false);
  const a = aggregate(state, f, publicOnly);
  function change(next: AnalyticsFilter) {
    setF(next);
    const query = new URLSearchParams({
      region: next.region,
      offer: next.offerId ?? '',
      program: next.programId,
      start: next.start,
      end: next.end,
      origin: next.origin
    });
    history.replaceState(null, '', '#' + route.split('?')[0] + '?' + query);
  }
  return <Page
    title={publicOnly ? 'Открытая статистика' : 'Демонстрационная аналитика'}
    id="P15 / E15 / U12 / O09"



  >
    <p className="notice">Демонстрационные данные · {a.scope}. Выборка: {a.offerCount} предложений, {a.practiceCount} дел, {a.applicationCount} откликов. Это не показатели реального рынка.</p>
    <section className="card">
      <div className="columns">
        <Field label="Регион аналитики">
          <select value={f.region} onChange={event => change({ ...f, region: event.target.value })}>
            <option value="">Все</option>
            <option>Москва</option>
            <option>Казань</option>
          </select>
        </Field>
        <Field label="Программа аналитики">
          <select value={f.programId} onChange={event => change({ ...f, programId: event.target.value })}>
            <option value="">Все</option>
            {dataFor(state).programs.map(p => <option key={p.id} value={p.id}>
              {p.name}
            </option>)}
          </select>
        </Field>
        {!publicOnly
          && <Field label="Предложение аналитики">
            <select value={f.offerId ?? ''} onChange={event => change({ ...f, offerId: event.target.value })}>
              <option value="">Все</option>
              {dataFor(state).offers.filter(candidateOffer => activeActor(state).role !== 'employer'
                || candidateOffer.companyId === activeActor(state).organizationId && canEmployer(state, 'analytics', candidateOffer.id))
                .map(candidateOffer => <option key={candidateOffer.id} value={candidateOffer.id}>
                  {candidateOffer.title}
                </option>)}
            </select>
          </Field>}
        <Field label="Период аналитики с">
          <input type="date" value={f.start} onChange={event => change({ ...f, start: event.target.value })}



          />
        </Field>
        <Field label="Период аналитики до">
          <input type="date" value={f.end} onChange={event => change({ ...f, end: event.target.value })} />
        </Field>
        <Field label="Источник событий">
          <select value={f.origin} onChange={event => change({ ...f, origin: event.target.value as 'all' | 'visitor' })}



          >
            <option value="all">Весь демо-набор</option>
            <option value="visitor">Действия в этой демонстрации</option>
          </select>
        </Field>
      </div>
      <button onClick={() => setOpen(true)}>Экспорт текущей выборки CSV</button>
    </section>
    <div className="card space list">
      {a.rows.map(r => <div key={r.metric}>
        <span>{r.metric} {r.denominator !== null ? `(${r.count} / ${r.denominator})` : ''}</span>
        <strong>
          {r.value}
        </strong>
      </div>)}
    </div>
    <p className="tiny">Воронка считает уникальные отклики, достигшие этапа; старые сохранения без истории этапов дают только известные текущие этапы. Медиана использует дела с двумя зарегистрированными датами. Принятие предложения не доказывает трудоустройство.</p>
    {open
      && <div className="overlay">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Экспорт текущей выборки"
          className="card dialog"



        >
          <h2>Экспорт текущей выборки</h2>
          <p>{f.region || 'Все регионы'} · {f.programId || 'Все программы'} · {f.start} — {f.end} · {a.scope}</p>
          <p>CSV содержит только показанные агрегаты, без контактов, оценок и содержимого документов.</p>
          <div className="actions">
            <button autoFocus onClick={() => setOpen(false)}>Отмена экспорта</button>
            <button
              onClick={() => {
                downloadText('demo-analytics.csv', analyticsCsv(state, f, publicOnly), 'text/csv;charset=utf-8');
                setOpen(false);
              }}>Скачать CSV</button>
          </div>
        </section>
      </div>}
  </Page>;
}
