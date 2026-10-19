import { Avatar } from './Avatar';
import { officialName } from '../domain/personName';
import { DocumentChecklist } from './DocumentChecklist';
import { submitDocumentBundle } from '../domain/documentBundle';
import { offerPaid, offerSchedule } from '../domain/matching';
import { ProcessSummary } from './ProcessSummary';
import { canEmployer } from '../domain/access';
import { dictionaries } from '../domain/c';
import { useState } from 'react';
import type { Envelope } from '../domain/types';
import type { Case, DocumentVersion, Task, Invite, PracticeOffer } from '../domain/b2-types';
import { docNames } from '../domain/b2-types';
import { dataFor, withdrawApplication } from '../domain/b1';
import { Page, Field } from './B1View';

import {



  who,



  canReadCase,



  applicationAccess,



  freePlaces,



  changeSelection,



  respondOffer,



  cancelPractice,



  saveCaseConditions,



  latestDocuments,



  createDocument,



  submitDocument,



  submitCase,



  reviewDocument,



  approvePractice,



  returnPractice,



  advanceDemoClock,



  startPractice,



  assignTask,



  submitTask,



  reviewTask,



  submitReport,



  completePractice,



  inviteStudent,



  respondInvitation,



  conversationAllowed,



  sendMessage,



  newOffer,



  saveOffer,



  submitOffer,



  moderateOffer,



  archiveOffer,



  submitCompany,



  verifyCompany



} from '../domain/b2';
import { downloadDocument, printDocument } from '../adapters/documentExport';
type Props = {
  state: Envelope;
  route: string;
  commit: (state: Envelope) => boolean;
  choose: (id: string) => void;
};
type Run = (fn: () => Envelope, success?: string) => boolean;
const names: Record<string, string> = {
  submitted: 'Отправлен',
  viewed: 'Просмотрен',
  info_requested: 'Запрошено уточнение',
  interview: 'Собеседование',
  offered: 'Предложено место',
  rejected: 'Отказ работодателя',
  withdrawn: 'Отозван',
  awaiting_university: 'Ожидает согласования',
  changes_requested: 'Есть замечания',
  approved: 'Согласовано',
  in_progress: 'Идёт практика',
  review: 'Проверка отчёта',
  completed: 'Завершено',
  cancelled: 'Отменено',
  not_assessed: 'Не оценено',
  needs_revision: 'Нужна доработка',
  credited: 'Зачтено',
  not_credited: 'Не зачтено',
  pending: 'Ожидает ответа',
  accepted: 'Принято',
  declined: 'Отказ студента',
  draft: 'Черновик',
  in_review: 'На проверке',
  assigned: 'Выдано',
  submitted_task: 'Сдано',
  revision: 'На доработке',
  published: 'Опубликовано',
  pending_moderation: 'На модерации',
  archived: 'В архиве'
};
export function handlesB2(route: string) {
  const p = route.split('?')[0];
  return [
    '/student/applications',
    '/student/practices',
    '/employer',
    '/employer/applications',
    '/employer/interns',
    '/employer/practices',
    '/employer/jobs',
    '/employer/company',
    '/university',
    '/university/approvals',
    '/operator',
    '/operator/offers',
    '/operator/organizations'
  ].includes(p)
    || /^\/(student|employer)\/applications\/[^/]+$/.test(p)
    || /^\/student\/practices\/[^/]+(\/documents)?$/.test(p)
    || /^\/employer\/practice-cases\/[^/]+$/.test(p)
    || /^\/university\/practices\/[^/]+$/.test(p)
    || /^\/employer\/(practices|jobs)\/[^/]+\/edit$/.test(p);
}
export function B2View(props: Props) {
  const { state, route, commit } = props;
  const persona = who(state);
  const data = dataFor(state);
  const path = route.split('?')[0];
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const run: Run = (fn, success = 'Действие сохранено') => {
    try {
      const next = fn();
      setError('');
      if (commit(next)) {
        setMessage(success);
        return true;
      }
      setMessage('Действие осталось в памяти; сохранение не подтверждено');
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
    <p>Объект не существует или недоступен текущей роли.</p>
  </Page>;
  if (path.startsWith('/student') && persona.role !== 'student' || path.startsWith('/employer') && persona.role !== 'employer'
    || path.startsWith('/university') && persona.role !== 'coordinator'
    || path.startsWith('/operator') && persona.role !== 'operator') return denied;
  if (/^\/(student|employer)\/applications\/[^/]+$/.test(path)) {
    try {
      const { a } = applicationAccess(state, path.split('/')[3]);
      return <ApplicationDetail {...props} id={a.id} run={run} notice={notice} />;
    } catch {
      return denied;
    }
  }
  if (path === '/student/applications') {
    const params = new URLSearchParams(route.split('?')[1] ?? '');
    const apps = data.applications.filter(candidateApplication => candidateApplication.studentId === persona.studentId && (!params.get('status') || candidateApplication.selectionStatus === params.get('status')));
    return <Page title="Отклики и приглашения" id="S10">
      {notice}
      <Field label="Статус отклика">
        <select
          value={params.get('status') ?? ''}
          onChange={event => {
            location.hash = '/student/applications' + (event.target.value ? '?status=' + event.target.value : '');
          }}



        >
          <option value="">Все</option>
          {[
            'submitted',
            'viewed',
            'info_requested',
            'interview',
            'offered',
            'rejected',
            'withdrawn'
          ].map(s => <option key={s} value={s}>
            {names[s]}
          </option>)}
        </select>
      </Field>
      <h2>Приглашения</h2>
      {data.invitations.filter(candidateInvitation => candidateInvitation.studentId === persona.studentId).map(candidateInvitation => <InvitationCard key={candidateInvitation.id} {...props} invitation={candidateInvitation} run={run}



      />)}
      <h2>Отклики</h2>
      {apps.length
        ? apps.map(candidateApplication => <article className="card space" key={candidateApplication.id}>
          <h3>
            {data.offers.find(candidateOffer => candidateOffer.id === candidateApplication.offerId)?.title}
          </h3>
          <p>{names[candidateApplication.selectionStatus]} · {names[candidateApplication.offerResponse ?? 'none'] ?? 'Нет предложения'} · {candidateApplication.resumeSnapshot.title}</p>
          <a href={'#/student/applications/' + candidateApplication.id}>Открыть отклик →</a>
        </article>)
        : <p className="card">Откликов пока нет. <a href="#/practices">Найти практику →</a></p>}
    </Page>;
  }
  if (['/student/practices', '/employer/interns', '/university/approvals'].includes(path)) {
    const phase = new URLSearchParams(route.split('?')[1] ?? '').get('phase') ?? '';
    const list = data.practices.filter(candidatePractice => canReadCase(state, candidatePractice) && (!phase || candidatePractice.status === phase)
      && !(path === '/university/approvals'
        && (!candidatePractice.submittedToUniversityAt || ['cancelled', 'completed'].includes(candidatePractice.status))));
    return <Page
      title={persona.role === 'student' ? 'Мои практики' : persona.role === 'employer' ? 'Практиканты' : 'Очередь практик'}
      id="S13 / E11 / U06"



    >
      {notice}
      <Field label="Этап практики">
        <select value={phase} onChange={event => {
          location.hash = path + '?phase=' + event.target.value;
        }}



        >
          <option value="">Все</option>
          {[
            'awaiting_university',
            'changes_requested',
            'approved',
            'in_progress',
            'review',
            'completed',
            'cancelled'
          ].map(v => <option key={v} value={v}>
            {names[v]}
          </option>)}
        </select>
      </Field>
      {list.length
        ? list.map(candidatePractice => <CaseCard key={candidatePractice.id} state={state} item={candidatePractice} />)
        : <p className="card">Дел пока нет. Для появления в очереди вузу нужна явная отправка студентом.</p>}
    </Page>;
  }
  if (/^\/student\/practices\/[^/]+(\/documents)?$/.test(path)
    || /^\/(employer\/practice-cases|university\/practices)\/[^/]+$/.test(path)) {
    const practice = data.practices.find(candidatePractice => candidatePractice.id === path.split('/')[3]);
    if (!practice || !canReadCase(state, practice)) return denied;
    return <CaseDetail {...props} item={practice} run={run} notice={notice} />;
  }
  if (path === '/employer/applications') {
    const q = new URLSearchParams(route.split('?')[1] ?? '');
    const list = data.applications.filter(candidateApplication => data.offers.some(candidateOffer => candidateOffer.id === candidateApplication.offerId && candidateOffer.companyId === persona.organizationId)
      && canEmployer(state, 'selection', candidateApplication.offerId)
      && (!q.get('status') || candidateApplication.selectionStatus === q.get('status')));
    return <Page title="Отклики работодателя" id="E09">
      {notice}
      <Field label="Этап отбора">
        <select
          value={q.get('status') ?? ''}
          onChange={event => {
            location.hash = '/employer/applications?status=' + event.target.value;
          }}



        >
          <option value="">Все этапы</option>
          {[
            'submitted',
            'viewed',
            'info_requested',
            'interview',
            'offered',
            'rejected',
            'withdrawn'
          ].map(status => <option key={status} value={status}>
            {names[status]}
          </option>)}
        </select>
      </Field>
      <p>Найдено: {list.length}</p>
      {list.map(candidateApplication => <article className="task-row" key={candidateApplication.id}>
        <div>
          <h3>{officialName(data.students.find(candidateStudent => candidateStudent.id === candidateApplication.studentId))} · {names[candidateApplication.selectionStatus]}</h3>
          <p>{data.offers.find(candidateOffer => candidateOffer.id === candidateApplication.offerId)?.title} · {candidateApplication.resumeSnapshot.title} · версия {candidateApplication.resumeSnapshot.version}</p>
        </div>
        <a className="button" href={'#/employer/applications/' + candidateApplication.id}>Рассмотреть отклик</a>
      </article>)}
      {!list.length && <p>Откликов на этом этапе нет. Выберите другой этап.</p>}
    </Page>;
  }
  if (path === '/employer/practices' || path === '/employer/jobs') {
    const list = data.offers.filter(candidateOffer => candidateOffer.companyId === persona.organizationId && (path.endsWith('jobs') ? candidateOffer.kind !== 'practice' : candidateOffer.kind === 'practice'));
    return <Page title={path.endsWith('jobs') ? 'Вакансии и стажировки' : 'Места практики'} id="E03 / E05">
      {notice}
      <a className="button primary" href={'#' + path + '/new/edit'}>Создать предложение</a>
      {list.map(candidateOffer => <article className="card space" key={candidateOffer.id}>
        <h2>
          {candidateOffer.title}
        </h2>
        <p>{names[candidateOffer.status]} · {candidateOffer.startDate} — {candidateOffer.endDate} · {freePlaces(state, candidateOffer.id)} свободно из {candidateOffer.capacity}</p>
        <a href={'#' + path + '/' + candidateOffer.id + '/edit'}>Редактировать / модерация →</a>
        <p>
          <a href={'#/employer/offers/' + candidateOffer.id + '/applications'}>Отклики: {data.applications.filter(candidateApplication => candidateApplication.offerId === candidateOffer.id).length} →</a>
        </p>
        <button onClick={() => run(() => archiveOffer(state, candidateOffer.id), 'Предложение архивировано')}>Архивировать</button>
      </article>)}
    </Page>;
  }
  if (/^\/employer\/(practices|jobs)\/[^/]+\/edit$/.test(path)) {
    const id = path.split('/')[3];
    const offer = id === 'new' ? newOffer(state) : data.offers.find(candidateOffer => candidateOffer.id === id && candidateOffer.companyId === persona.organizationId);
    if (!offer) return denied;
    return <OfferEditor {...props} offer={offer} run={run} notice={notice} />;
  }
  if (path === '/operator/offers' || path === '/operator/organizations') return <Moderation {...props} run={run} notice={notice} />;
  if (path === '/employer/company') return <CompanyForm {...props} run={run} notice={notice} />;
  return denied;
}
type ActionProps = Props & {
  run: Run;
  notice: React.ReactNode;
};
const caseRoute = (role: string, id: string) => role === 'student'
  ? '/student/practices/' + id
  : role === 'employer' ? '/employer/practice-cases/' + id : '/university/practices/' + id;
function CaseCard({ state, item: c }: {
  state: Envelope;
  item: Case;
}) {
  const data = dataFor(state);
  return <article className="card space">
    <h2>
      {c.offerSnapshot.title}
    </h2>
    <p>{officialName(data.students.find(candidateStudent => candidateStudent.id === c.studentId))} · {names[c.status]} · {names[c.academicResult]}</p>
    <p>{c.offerSnapshot.startDate} — {c.offerSnapshot.endDate} · {c.reservationActive ? 'Место зарезервировано' : 'Резерв снят'}</p>
    <a href={'#' + caseRoute(who(state).role, c.id)}>Открыть дело →</a>
  </article>;
}
export function Chat({ state, type, id, run }: {
  state: Envelope;
  type: 'application' | 'practice';
  id: string;
  run: Run;
}) {
  const [text, setText] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  if (!conversationAllowed(state, type, id)) return <p>Свободный диалог ещё недоступен.</p>;
  return <section className="card space">
    <h2>Локальная переписка</h2>
    <p className="tiny">Только участники этого {type === 'application' ? 'отклика' : 'дела'}. Доставки наружу нет.</p>
    {dataFor(state).messages.filter(candidateMessage => candidateMessage.contextType === type && candidateMessage.contextId === id).map(candidateMessage => <p key={candidateMessage.id}><strong>
      {dataFor(state).personas.find(p => p.id === candidateMessage.authorId)?.name}
    </strong>: {candidateMessage.text}</p>)}
    <form
      onSubmit={e => {
        e.preventDefault();
        if (run(() => sendMessage(state, type, id, text, requestId), 'Сообщение сохранено')) {
          setText('');
          setRequestId(crypto.randomUUID());
        }
      }}>
      <Field label="Сообщение">
        <textarea maxLength={2000} value={text} onChange={event => setText(event.target.value)} />
      </Field>
      <button>Отправить сообщение</button>
    </form>
  </section>;
}
function ApplicationDetail(props: ActionProps & {
  id: string;
}) {
  const { state, id, run, notice } = props;
  const { a, o } = applicationAccess(state, id);
  const persona = who(state);
  const [reason, setReason] = useState('');
  const practice = dataFor(state).practices.find(candidatePractice => candidatePractice.applicationId === id);
  return <Page title="Отклик" id={persona.role === 'student' ? 'S11' : 'E10'}>
    {notice}
    <section className="card">
      <h2>
        {o.title}
      </h2>
      <span className="status">{names[a.selectionStatus]} · {names[a.offerResponse ?? 'none'] ?? 'Ответ не требуется'}</span>
      <h3>Отправленное резюме · версия {a.resumeSnapshot.version}</h3>
      <p>
        {a.resumeSnapshot.title}
      </p>
      <p className="prewrap">
        {a.resumeSnapshot.summary}
      </p>
      {a.resumeSnapshot.experienceSummary
        && <>
          <h3>Учебный и практический опыт · указано студентом</h3>
          <p className="prewrap">
            {a.resumeSnapshot.experienceSummary}
          </p>
        </>}
      {a.projectSnapshot?.map(project => <p key={project.id}>Учебный проект: {project.title} · {project.contribution}</p>)}
      {persona.role === 'student' && a.educationSnapshot
        && <details>
          <summary>Учебные сведения при отправке · версия {a.educationSnapshot.version}</summary>
          {a.educationSnapshot.disciplines.map((d, i) => <p key={i}>{d.name}: {d.result}</p>)}
        </details>}
      {a.history?.map((h, i) => <p className="tiny" key={i}>{h.at.slice(0, 10)} · {h.text}</p>)}
      {persona.role === 'employer' && canEmployer(state, 'selection', o.id)
        && !['offered', 'rejected', 'withdrawn'].includes(a.selectionStatus)
        && <>
          <Field label="Комментарий решения">
            <textarea maxLength={600} value={reason} onChange={event => setReason(event.target.value)} />
          </Field>
          <div className="actions">
            {(a.selectionStatus === 'submitted'
              ? ['viewed', 'offered', 'rejected']
              : ['viewed', 'info_requested', 'interview', 'offered', 'rejected']).filter(s => s !== a.selectionStatus)
              .map(status => <button
                key={status}
                onClick={() => run(() => changeSelection(state, id, status as typeof a.selectionStatus, reason), 'Этап отклика изменён')}



              >
                {status === 'offered'
                  ? 'Предложить место'
                  : status === 'rejected'
                    ? 'Отказать'
                    : status === 'viewed'
                      ? 'Отметить просмотр'
                      : status === 'info_requested' ? 'Запросить уточнение' : 'Пригласить на собеседование'}
              </button>)}
          </div>
        </>}
      {persona.role === 'student' && a.selectionStatus === 'offered' && a.offerResponse === 'pending'
        && <div className="actions space">
          <button
            className="primary"
            onClick={() => run(() => respondOffer(state, id, true), 'Предложение принято')}



          >Принять предложение компании</button>
          <button onClick={() => run(() => respondOffer(state, id, false), 'Зафиксирован отказ студента')}>Отказаться от предложения</button>
        </div>}
      {persona.role === 'student' && !practice && !['rejected', 'withdrawn'].includes(a.selectionStatus)
        && a.offerResponse !== 'accepted'
        && <p>
          <button onClick={() => run(() => withdrawApplication(state, id), 'Отклик отозван')}>Отозвать отклик</button>
        </p>}
      {practice && <p>
        <a href={'#' + caseRoute(persona.role, practice.id)}>Открыть дело практики →</a>
      </p>}
    </section>
    <Chat state={state} type="application" id={id} run={run} />
  </Page>;
}
function InvitationCard(props: Props & {
  invitation: Invite;
  run: Run;
}) {
  const { state, invitation: i, run } = props;
  const [resume, setResume] = useState(dataFor(state).resumes.find(candidateResume => candidateResume.studentId === i.studentId && candidateResume.primary)?.id ?? '');
  const [consent, setConsent] = useState(false);
  return <article className="card space">
    <h3>
      {dataFor(state).offers.find(candidateOffer => candidateOffer.id === i.offerId)?.title}
    </h3>
    <p>
      {i.message}
    </p>
    <span className="status">
      {names[i.status]}
    </span>
    {i.status === 'pending'
      ? <>
        <p className="tiny">Свободный чат и контакты появятся после принятия с передачей резюме.</p>
        <Field label="Резюме для приглашения">
          <select value={resume} onChange={event => setResume(event.target.value)}>
            {dataFor(state).resumes.filter(candidateResume => candidateResume.studentId === i.studentId && candidateResume.status === 'ready').map(candidateResume => <option key={candidateResume.id} value={candidateResume.id}>
              {candidateResume.title}
            </option>)}
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Согласен передать выбранное демонстрационное резюме</label>
        <div className="actions">
          <button
            onClick={() => run(
              () => respondInvitation(state, i.id, true, resume, consent),
              'Приглашение принято; создан связанный отклик'
            )}>Принять приглашение</button>
          <button onClick={() => run(() => respondInvitation(state, i.id, false, '', false), 'Приглашение отклонено')}>Отклонить приглашение</button>
        </div>
      </>
      : i.applicationId
      && <p>
        <a href={'#/student/applications/' + i.applicationId}>Открыть связанный отклик →</a>
      </p>}
  </article>;
}
export function InviteComposer({ state, offerId, studentId, commit }: {
  state: Envelope;
  offerId: string;
  studentId: string;
  commit: Props['commit'];
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  return <form
    className="space"
    onSubmit={e => {
      e.preventDefault();
      try {
        commit(inviteStudent(state, offerId, studentId, text));
        setError('Приглашение сохранено');
      } catch (error) {
        setError((error as Error).message);
      }
    }}



  >
    <Field label="Текст приглашения">
      <textarea value={text} maxLength={600} onChange={event => setText(event.target.value)} />
    </Field>
    <button>Отправить приглашение</button>
    {error && <p role="status">
      {error}
    </p>}
  </form>;
}
function CaseDetail(props: ActionProps & {
  item: Case;
}) {
  const { state, item: c, run, notice } = props;
  const persona = who(state);
  const [conditions, setConditions] = useState(c.conditions);
  const [reason, setReason] = useState('');
  const [report, setReport] = useState(c.reportText);
  const [taskTitle, setTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState(c.offerSnapshot.endDate);
  const data = dataFor(state);
  const caseStudent = data.students.find(candidateStudent => candidateStudent.id === c.studentId);
  const docs = latestDocuments(state, c.id);
  const editable = ['awaiting_university', 'changes_requested'].includes(c.status);
  return <Page title="Дело практики" id="S14 / S15 / E12 / U07">
    {notice}
    {caseStudent
      && <section className="card profile-identity practice-student" aria-label="Студент практики">
        <Avatar key={caseStudent.id} name={caseStudent.name} photoUrl={caseStudent.photoUrl} size="large" />
        <div>
          <span className="identity-caption">Студент практики</span>
          <h2>
            {officialName(caseStudent)}
          </h2>
          <p className="tiny">{caseStudent.programId} · {caseStudent.course} курс</p>
        </div>
      </section>}
    <ProcessSummary state={state} item={c} />
    <nav className="context-nav" aria-label="Разделы практики">
      {[
        ['overview', 'Обзор'],
        ['documents', 'Документы'],
        ['tasks', 'Задания и отчёт'],
        ['messages', 'Переписка']
      ].map(([tab, label]) => <a href={'#' + props.route.split('?')[0] + '?tab=' + tab} key={tab}>
        {label}
      </a>)}
    </nav>
    <details
      className="case-section"
      open={window.innerWidth > 768 || new URLSearchParams(props.route.split('?')[1]).get('tab') === 'overview'}



    >
      <summary>Обзор и условия</summary>
      <section className="card">
        <h2>
          {c.offerSnapshot.title}
        </h2>
        <p>{officialName(data.students.find(candidateStudent => candidateStudent.id === c.studentId))} · {data.companies.find(candidateCompany => candidateCompany.id === c.companyId)?.name}</p>
        <span className="status">{names[c.status]} · {names[c.academicResult]}</span>
        <p>Период: {c.offerSnapshot.startDate} — {c.offerSnapshot.endDate}. Учебная дата: {state.demoClock}. {c.reservationActive ? 'Место зарезервировано' : 'Резерв снят'}.</p>
        <p>Требования учебной версии {c.requirementSnapshot.version}: до начала — {c.requirementSnapshot.requiredDocuments.map(type => docNames[type]).join(', ') || 'Документы не выбраны'}. Минимальный объём: {c.requirementSnapshot.minHours ?? 144} часов. Отчёт требуется в конце. {c.requirementSnapshot.completionRule}</p>
        {editable
          && <form
            onSubmit={e => {
              e.preventDefault();
              run(
                () => saveCaseConditions(state, c.id, conditions),
                'Условия сохранены; нужны актуальные версии документов'
              );
            }}>
            {persona.role === 'student'
              ? <Field label="Примечание студента">
                <textarea
                  value={conditions.notes}
                  maxLength={600}
                  onChange={event => setConditions({ ...conditions, notes: event.target.value })}



                />
              </Field>
              : persona.role === 'employer'
                ? <>
                  <Field label="Задачи практики">
                    <textarea
                      value={conditions.tasks}
                      maxLength={1200}
                      onChange={event => setConditions({ ...conditions, tasks: event.target.value })}



                    />
                  </Field>
                  <Field label="Наставник компании">
                    <input
                      value={conditions.companySupervisor}
                      onChange={event => setConditions({ ...conditions, companySupervisor: event.target.value })}



                    />
                  </Field>
                  <Field label="Объём часов">
                    <input
                      type="number"
                      value={conditions.hours}
                      onChange={event => setConditions({ ...conditions, hours: Number(event.target.value) })}



                    />
                  </Field>
                </>
                : <Field label="Руководитель от вуза">
                  <input
                    value={conditions.universitySupervisor}
                    onChange={event => setConditions({ ...conditions, universitySupervisor: event.target.value })}



                  />
                </Field>}
            <button>Сохранить условия практики</button>
          </form>}
        <p>Задачи: {c.conditions.tasks}. Наставник компании: {c.conditions.companySupervisor}. Руководитель вуза: {c.conditions.universitySupervisor}. Примечание: {c.conditions.notes || 'Не заполнено'}.</p>
        {persona.role === 'student' && editable
          && <div className="actions">
            <button
              onClick={() => run(
                () => c.requirementSnapshot.requiredDocuments.reduce((next, type) => createDocument(next, c.id, type), state),
                'Учебные версии сформированы'
              )}>Сформировать обязательные документы</button>
            <button onClick={() => run(() => submitCase(state, c.id), 'Дело направлено в вуз')}>Отправить дело на согласование</button>
          </div>}
        {persona.role === 'coordinator' && c.status === 'awaiting_university'
          && <button onClick={() => run(() => approvePractice(state, c.id), 'Практика согласована')}>Согласовать практику</button>}
        {persona.role === 'coordinator' && c.status === 'approved'
          && <div className="actions space">
            <button
              onClick={() => {
                if (window.confirm('Изменить только учебную дату к началу практики?')) run(() => advanceDemoClock(state, c.id, 'start', true), 'Учебная дата изменена');
              }}>Демо: перейти к началу практики</button>
            <button onClick={() => run(() => startPractice(state, c.id), 'Начало практики подтверждено')}>Подтвердить начало практики</button>
          </div>}
        {persona.role === 'coordinator' && ['in_progress', 'review'].includes(c.status)
          && <button
            onClick={() => {
              if (window.confirm('Изменить только учебную дату к окончанию практики?')) run(() => advanceDemoClock(state, c.id, 'end', true), 'Учебная дата изменена');
            }}>Демо: перейти к окончанию практики</button>}
      </section>
    </details>
    <details
      className="case-section"
      open={window.innerWidth > 768 || ['awaiting_university', 'changes_requested'].includes(c.status)
        || new URLSearchParams(props.route.split('?')[1]).get('tab') === 'documents'
        || props.route.endsWith('/documents')}



    >
      <summary>Документы</summary>
      <DocumentChecklist state={state} item={c} />
      {persona.role === 'student'
        && <button
          className="primary"
          onClick={() => run(() => submitDocumentBundle(state, c.id), 'Актуальные черновики комплекта направлены на проверку')}



        >Отправить комплект</button>}
      <h2>Версии учебных документов</h2>
      <p className="tiny">Демонстрационный учебный образец. Не предназначен для реального оформления.</p>
      {docs.length
        ? docs.map(candidateDocument => <DocumentCard key={candidateDocument.id} state={state} item={candidateDocument} run={run} />)
        : <p className="card">Документов пока нет. Студент заполняет примечание и запускает формирование.</p>}
    </details>
    <details
      className="case-section"
      open={window.innerWidth > 768 || ['in_progress', 'review'].includes(c.status)
        || new URLSearchParams(props.route.split('?')[1]).get('tab') === 'tasks'}



    >
      <summary>Задания и отчёт</summary>
      <h2>Задания и отчёт</h2>
      {persona.role === 'employer' && canEmployer(state, 'practice', c.offerId) && c.status === 'in_progress'
        && <form
          className="card"
          onSubmit={e => {
            e.preventDefault();
            run(() => assignTask(state, c.id, taskTitle, dueDate), 'Задание выдано');
          }}



        >
          <Field label="Новое задание">
            <input value={taskTitle} maxLength={160} onChange={event => setTaskTitle(event.target.value)} />
          </Field>
          <Field label="Срок задания">
            <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
          </Field>
          <button>Выдать задание</button>
        </form>}
      {data.tasks.filter(candidateTask => candidateTask.practiceId === c.id).map(candidateTask => <TaskCard key={candidateTask.id} state={state} item={candidateTask} run={run} />)}
      {persona.role === 'student' && c.status === 'in_progress'
        && <form
          className="card space"
          onSubmit={e => {
            e.preventDefault();
            run(() => submitReport(state, c.id, report), 'Отчёт сохранён; направьте его учебную версию на проверку');
          }}



        >
          <Field label="Текст отчёта">
            <textarea value={report} maxLength={5000} rows={6} onChange={event => setReport(event.target.value)}



            />
          </Field>
          <button>Подготовить отчёт</button>
        </form>}
      {c.employerFeedback && <p className="card space">Отзыв работодателя: {c.employerFeedback}</p>}
      {c.coordinatorFeedback
        && <p className="card space">Комментарий координатора: {c.coordinatorFeedback}</p>}
      {persona.role === 'coordinator' && c.status === 'review'
        && <section className="card space">
          <Field label="Пояснение итога">
            <textarea value={reason} maxLength={600} onChange={event => setReason(event.target.value)} />
          </Field>
          <div className="actions">
            <button
              onClick={() => run(() => completePractice(state, c.id, true, reason), 'Практика завершена и зачтена')}>Зафиксировать зачёт</button>
            <button
              onClick={() => run(() => completePractice(state, c.id, false, reason), 'Практика завершена без зачёта')}>Завершить без зачёта</button>
            <button onClick={() => run(() => returnPractice(state, c.id, reason), 'Отчёт возвращён')}>Вернуть на доработку</button>
          </div>
        </section>}
      {c.status !== 'cancelled'
        && ((persona.role === 'student' && editable || persona.role === 'student' && c.status === 'approved') || persona.role === 'coordinator')
        && <section className="card space">
          <Field label="Причина отмены / замечание">
            <textarea value={reason} maxLength={600} onChange={event => setReason(event.target.value)} />
          </Field>
          <button
            onClick={() => run(() => cancelPractice(state, c.id, reason), 'Практика отменена; резерв освобождён')}>Отменить практику</button>
          {persona.role === 'coordinator' && c.status === 'awaiting_university'
            && <button onClick={() => run(() => returnPractice(state, c.id, reason), 'Дело возвращено')}>Вернуть дело с замечаниями</button>}
        </section>}
    </details>
    <details className="card space">
      <summary>История дела</summary>
      {c.history.map((h, i) => <p key={i}>{h.at.slice(0, 10)} · {h.text}</p>)}
    </details>
    <details
      className="case-section"
      open={window.innerWidth > 768 || new URLSearchParams(props.route.split('?')[1]).get('tab') === 'messages'}



    >
      <summary>Переписка</summary>
      <Chat state={state} type="practice" id={c.id} run={run} />
    </details>
  </Page>;
}
export function DocumentCard({ state, item: d, run }: {
  state: Envelope;
  item: DocumentVersion;
  run: Run;
}) {
  const persona = who(state);
  const practice = dataFor(state).practices.find(candidatePractice => candidatePractice.id === d.practiceId)!;
  const [comment, setComment] = useState('');
  const companyDone = d.reviewSteps.some(r => r.role === 'employer' && r.decision === 'approved');
  const reviewer = (d.type === 'agreement' || d.type === 'report') && !companyDone ? 'employer' : 'coordinator';
  const versions = dataFor(state).documents.filter(candidateDocument => candidateDocument.practiceId === practice.id && candidateDocument.type === d.type).sort((leftDocument, rightDocument) => rightDocument.version - leftDocument.version);
  function exportAction(id: string, print = false) {
    try {
      if (print) printDocument(state, id); else downloadDocument(state, id);
    } catch (error) {
      window.alert((error as Error).message);
    }
  }
  return <article className="card space document-card" data-document={d.type}>
    <h3>{docNames[d.type]} · версия {d.version}</h3>
    <span className="status">{names[d.status]} · условия версии {d.conditionsVersion}</span>
    <p>Сейчас отвечает: {d.status === 'draft' || d.status === 'changes_requested'
      ? 'Студент'
      : d.status === 'approved' ? 'Проверка завершена' : reviewer === 'employer' ? 'Компания' : 'Координатор МГСУ'}.</p>
    <p className="tiny">Источники: студент/вуз/компания — общий учебный набор; период — зафиксированное предложение; задачи/наставники/примечание — условия этого дела. Шаблон версии {d.templateVersion}.</p>
    <details>
      <summary>Просмотреть заполненные поля</summary>
      {Object.entries(d.fields).filter(([key]) => key !== 'report' || d.type === 'report').map(([key, value]) => <p key={key}><strong>
        {({
          student: 'Студент',
          university: 'Вуз',
          company: 'Компания',
          period: 'Период',
          hours: 'Объём',
          tasks: 'Задачи',
          notes: 'Примечание',
          report: 'Отчёт',
          practiceType: 'Вид практики',
          companySupervisor: 'Руководитель компании',
          universitySupervisor: 'Руководитель вуза',
          generatedAt: 'Учебная дата формирования'
        } as Record<string, string>)[key] ?? key}
      </strong>: {value || 'Не требуется'}</p>)}
    </details>
    <div className="actions space">
      <button onClick={() => exportAction(d.id)}>Скачать образец HTML</button>
      <button onClick={() => exportAction(d.id, true)}>Печать / сохранить PDF</button>
      {persona.role === 'student' && d.status === 'draft'
        && <button onClick={() => run(() => submitDocument(state, d.id), 'Версия направлена на проверку')}>Направить версию на проверку</button>}
      {persona.role === 'student' && d.status === 'changes_requested'
        && <button onClick={() => run(() => createDocument(state, practice.id, d.type), 'Создана новая версия')}>Сформировать новую версию</button>}
    </div>
    {persona.role === reviewer && (persona.role !== 'employer' || canEmployer(state, 'documents', practice.offerId))
      && d.status === 'in_review'
      && <>
        <Field label="Комментарий проверки документа">
          <textarea maxLength={600} value={comment} onChange={event => setComment(event.target.value)} />
        </Field>
        <div className="actions">
          <button onClick={() => run(() => reviewDocument(state, d.id, true, comment), 'Проверка версии сохранена')}>Согласовать учебную версию</button>
          <button
            onClick={() => run(() => reviewDocument(state, d.id, false, comment), 'Версия возвращена с замечанием')}>Вернуть документ с замечанием</button>
        </div>
      </>}
    {d.reviewSteps.map((r, i) => <p className="tiny" key={i}>{r.role === 'employer' ? 'Компания' : 'Координатор'} · {names[r.decision]} · {r.comment}</p>)}
    {versions.length > 1
      && <details>
        <summary>Предыдущие версии: {versions.length - 1}</summary>
        {versions.filter(candidateDocument => candidateDocument.id !== d.id).map(candidateDocument => <div key={candidateDocument.id}>
          <p>Версия {candidateDocument.version} · {names[candidateDocument.status]} · {candidateDocument.reviewSteps.map(r => r.comment).join('; ')}</p>
          <button onClick={() => exportAction(candidateDocument.id)}>Скачать версию {candidateDocument.version} HTML</button>
        </div>)}
      </details>}
  </article>;
}
function TaskCard({ state, item: t, run }: {
  state: Envelope;
  item: Task;
  run: Run;
}) {
  const [text, setText] = useState(t.studentText);
  const [comment, setComment] = useState('');
  const persona = who(state);
  return <article className="card space">
    <h3>
      {t.title}
    </h3>
    <p>Срок: {t.dueDate} · {t.status === 'submitted' ? 'Сдано' : names[t.status]}</p>
    {t.studentText && <p className="prewrap">
      {t.studentText}
    </p>}
    {persona.role === 'student' && ['assigned', 'revision'].includes(t.status)
      && <form
        onSubmit={e => {
          e.preventDefault();
          run(() => submitTask(state, t.id, text), 'Результат задания сдан');
        }}>
        <Field label="Результат задания">
          <textarea value={text} maxLength={2000} onChange={event => setText(event.target.value)} />
        </Field>
        <button>Сдать задание</button>
      </form>}
    {persona.role === 'employer' && t.status === 'submitted'
      && <>
        <Field label="Комментарий задания">
          <textarea value={comment} maxLength={600} onChange={event => setComment(event.target.value)} />
        </Field>
        <div className="actions">
          <button onClick={() => run(() => reviewTask(state, t.id, true, comment), 'Задание принято')}>Принять задание</button>
          <button onClick={() => run(() => reviewTask(state, t.id, false, comment), 'Задание возвращено')}>Вернуть задание</button>
        </div>
      </>}
    {t.comments.map((c, i) => <p className="tiny" key={i}>
      {c.text}
    </p>)}
  </article>;
}
function OfferEditor(props: ActionProps & {
  offer: PracticeOffer;
}) {
  const { state, offer, run, notice } = props;
  const [values, setValues] = useState(offer);
  const [skills, setSkills] = useState(offer.skills.join(', '));
  return <Page title="Редактор предложения" id="E04 / E06">
    {notice}
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        if (run(
          () => saveOffer(state, { ...values, skills: skills.split(',').map(t => t.trim()).filter(Boolean) }),
          'Предложение сохранено'
        )) location.hash = '/employer/practices/' + values.id + '/edit';
      }}



    >
      <p>{names[offer.status]} · {offer.moderationReason
        || 'Условия будут проверены оператором. Существенная правка опубликованного предложения требует новой модерации.'}</p>
      <Field label="Название предложения">
        <input
          value={values.title}
          maxLength={160}
          onChange={event => setValues({ ...values, title: event.target.value })}



        />
      </Field>
      <Field label="Тип предложения">
        <select
          value={values.kind}
          onChange={event => setValues({ ...values, kind: event.target.value as PracticeOffer['kind'] })}



        >
          <option value="practice">Практика</option>
          <option value="job">Вакансия</option>
          <option value="internship">Стажировка</option>
        </select>
      </Field>
      <Field label="Траектория предложения">
        <select value={values.programId} onChange={event => setValues({ ...values, programId: event.target.value })}



        >
          {['ПТО', 'BIM/ТИМ', 'Проектирование', 'Сметное дело'].map(v => <option key={v}>
            {v}
          </option>)}
        </select>
      </Field>
      <Field label="Строительное направление">
        <select
          value={values.constructionDirectionId ?? 'direction_0'}
          onChange={event => setValues({ ...values, constructionDirectionId: event.target.value })}



        >
          {dictionaries(state).filter(candidateEntry => candidateEntry.category === 'direction' && (candidateEntry.active || candidateEntry.id === values.constructionDirectionId))
            .map(candidateEntry => <option key={candidateEntry.id} value={candidateEntry.id} disabled={!candidateEntry.active}>
              {candidateEntry.name}
              {candidateEntry.active ? '' : ' (историческое)'}
            </option>)}
        </select>
      </Field>
      <Field label="Вид практики">
        <select
          value={values.practiceType}
          onChange={event => setValues({ ...values, practiceType: event.target.value })}



        >
          <option>Производственная</option>
          <option>Учебная</option>
        </select>
      </Field>
      <Field label="Требуемые навыки через запятую">
        <input maxLength={600} value={skills} onChange={event => setSkills(event.target.value)} />
      </Field>
      <Field label="Оплата предложения">
        <select
          value={String(values.paid ?? offerPaid(values))}
          onChange={event => setValues({ ...values, paid: event.target.value === 'true' })}



        >
          <option value="true">С оплатой — учебный пример</option>
          <option value="false">Без оплаты</option>
        </select>
      </Field>
      <Field label="График предложения">
        <select
          value={values.schedule ?? offerSchedule(values)}
          onChange={event => setValues({ ...values, schedule: event.target.value as PracticeOffer['schedule'] })}



        >
          <option>Полный день</option>
          <option>Гибкий график</option>
        </select>
      </Field>
      <Field label="Минимальный курс">
        <input
          type="number"
          min={1}
          max={6}
          value={values.minCourse ?? 3}
          onChange={event => setValues({ ...values, minCourse: Number(event.target.value) })}



        />
      </Field>
      <Field label="Максимальный курс">
        <input
          type="number"
          min={1}
          max={6}
          value={values.maxCourse ?? 4}
          onChange={event => setValues({ ...values, maxCourse: Number(event.target.value) })}



        />
      </Field>
      <Field label="Регион предложения">
        <input
          value={values.region}
          maxLength={100}
          onChange={event => setValues({ ...values, region: event.target.value })}



        />
      </Field>
      <Field label="Начало периода">
        <input
          type="date"
          value={values.startDate}
          onChange={event => setValues({ ...values, startDate: event.target.value })}



        />
      </Field>
      <Field label="Конец периода">
        <input
          type="date"
          value={values.endDate}
          onChange={event => setValues({ ...values, endDate: event.target.value })}



        />
      </Field>
      <Field label="Количество мест">
        <input
          type="number"
          min={1}
          max={100}
          value={values.capacity}
          onChange={event => setValues({ ...values, capacity: Number(event.target.value) })}



        />
      </Field>
      <Field label="Учебный объём часов">
        <input
          type="number"
          min={1}
          value={values.durationHours}
          onChange={event => setValues({ ...values, durationHours: Number(event.target.value) })}



        />
      </Field>
      <Field label="Назначенный наставник">
        <input
          maxLength={120}
          value={values.supervisor}
          onChange={event => setValues({ ...values, supervisor: event.target.value })}



        />
      </Field>
      <Field label="Ожидаемые учебные задачи">
        <textarea
          maxLength={1200}
          value={values.expectedTasks}
          onChange={event => setValues({ ...values, expectedTasks: event.target.value })}



        />
      </Field>
      <button>Сохранить предложение</button>
    </form>
    <p>
      <button
        disabled={offer.status === 'pending_moderation'}
        onClick={() => {
          if (run(
            () => submitOffer(
              saveOffer(state, { ...values, skills: skills.split(',').map(t => t.trim()).filter(Boolean) }),
              values.id
            ),
            'Предложение направлено оператору'
          )) location.hash = '/employer/practices/' + values.id + '/edit';
        }}



      >Направить на модерацию</button>
    </p>
    <a href="#/employer/practices">Все предложения →</a>
  </Page>;
}
function Moderation(props: ActionProps) {
  const { state, route, run, notice } = props;
  const data = dataFor(state);
  const offers = route === '/operator/offers';
  return <Page title={offers ? 'Модерация предложений' : 'Проверка компаний'} id={offers ? 'O03' : 'O02'}>
    {notice}
    <p>Проверка по учебному набору. Реальных государственных запросов нет.</p>
    {offers
      ? data.offers.filter(candidateOffer => candidateOffer.status === 'pending_moderation').map(candidateOffer => <ModerationCard
        key={candidateOffer.id}
        id={candidateOffer.id}
        title={candidateOffer.title}
        details={`${candidateOffer.startDate} — ${candidateOffer.endDate}, ${candidateOffer.capacity} мест, ${candidateOffer.supervisor}. ${candidateOffer.expectedTasks}`}
        run={run}
        approve={reason => moderateOffer(state, candidateOffer.id, true, reason)}
        reject={reason => moderateOffer(state, candidateOffer.id, false, reason)}



      />)
      : data.companies.filter(candidateCompany => candidateCompany.status === 'pending').map(candidateCompany => <ModerationCard
        key={candidateCompany.id}
        id={candidateCompany.id}
        title={candidateCompany.name}
        details={candidateCompany.description}
        run={run}
        approve={reason => verifyCompany(state, candidateCompany.id, true, reason)}
        reject={reason => verifyCompany(state, candidateCompany.id, false, reason)}



      />)}
    {!(offers
      ? data.offers.some(candidateOffer => candidateOffer.status === 'pending_moderation')
      : data.companies.some(candidateCompany => candidateCompany.status === 'pending'))
      && <p className="card">Очередь пуста.</p>}
  </Page>;
}
function ModerationCard({ title, details, run, approve, reject }: {
  id: string;
  title: string;
  details: string;
  run: Run;
  approve: (r: string) => Envelope;
  reject: (r: string) => Envelope;
}) {
  const [reason, setReason] = useState('');
  return <article className="card space">
    <h2>
      {title}
    </h2>
    <p>
      {details}
    </p>
    <Field label="Комментарий модерации">
      <textarea value={reason} maxLength={600} onChange={event => setReason(event.target.value)} />
    </Field>
    <div className="actions">
      <button onClick={() => run(() => approve(reason), 'Карточка допущена')}>Допустить / опубликовать</button>
      <button onClick={() => run(() => reject(reason), 'Карточка возвращена / отклонена')}>Вернуть / отклонить</button>
    </div>
  </article>;
}
function CompanyForm(props: ActionProps) {
  const { state, run, notice } = props;
  const company = dataFor(state).companies.find(candidateCompany => candidateCompany.id === who(state).organizationId)!;
  const [description, setDescription] = useState(company.description);
  return <Page title="Компания и проверка" id="E02">
    {notice}
    <form
      className="card"
      onSubmit={e => {
        e.preventDefault();
        run(() => submitCompany(state, description), 'Компания направлена оператору');
      }}



    >
      <h2>
        {company.name}
      </h2>
      <p>{names[company.status] ?? company.status} · {company.verificationReason}</p>
      <Field label="Описание компании">
        <textarea maxLength={1200} value={description} onChange={event => setDescription(event.target.value)}



        />
      </Field>
      <button>Направить компанию на проверку</button>
      <p className="tiny">На время проверки предложения скрыты из публичной выдачи. Проверка имитируется оператором.</p>
    </form>
  </Page>;
}
