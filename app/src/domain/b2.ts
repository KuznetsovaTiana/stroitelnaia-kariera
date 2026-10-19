import { officialName } from './personName';
import { activeActor, assertEmployer, canEmployer } from './access';
import { currentRequirements, currentTemplates, dictionaries } from './c';
import { templateSeed } from '../data/c-seed';
import { seed } from '../data/seed';
import { dataFor, isPublic, submitApplication } from './b1';
import { emptyB1 } from './b1-types';
import type { SentApplication } from './b1-types';
import { emptyB2 } from './b2-types';
import type { Case, DocType, DocumentVersion, PracticeOffer, Invite, B2Changes } from './b2-types';
import { documentFields } from '../data/b2-seed';
import type { Envelope, Entity, Application } from './types';
export const now = (state: Envelope) => state.demoClock + 'T12:00:00.000Z';
const uid = (prefix: string) => prefix + '_' + crypto.randomUUID();
const entity = (state: Envelope, prefix: string): Entity => ({
  id: uid(prefix),
  version: 1,
  createdAt: now(state),
  updatedAt: now(state)
});
export const who = activeActor;
function requireRole(state: Envelope, role: string) {
  if (who(state).role !== role) throw new Error('Действие недоступно текущей роли')
}
function requireCompany(state: Envelope, id: string, ability: import('./access').Ability = 'publish', offerId?: string) {
  assertEmployer(state, ability, offerId);
  requireRole(state, 'employer');
  if (who(state).organizationId !== id) throw new Error('Чужая компания')
}
const requireStudent = (state: Envelope, id: string) => {
  requireRole(state, 'student');
  if (who(state).studentId !== id) throw new Error('Чужой студент')
};
export function limited(text: string, label = 'Текст', max = 2000) {
  if (typeof text !== 'string' || !text.trim() || text.length > max) throw new Error(`${label}: заполните поле (не более ${max} символов)`);
  if (/\{\{.*?\}\}/s.test(text)) throw new Error('Не оставляйте незаполненные переменные');
  return text.trim()
}
const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d))
  && new Date(d).toISOString().slice(0, 10) === d;
function txn(state: Envelope, type: string, objectRef: string, fn: (next: Envelope, changes: B2Changes, eventId: string) => void) {
  const next = structuredClone(state);
  next.changes.b1 = structuredClone(state.changes.b1 ?? emptyB1());
  next.changes.b2 = structuredClone(state.changes.b2 ?? emptyB2());
  next.revision++;
  const eventId = uid('event');
  fn(next, next.changes.b2, eventId);
  next.changes.b1.events.push({
    id: eventId,
    actorId: state.activePersonaId,
    type,
    objectRef,
    at: now(next),
    origin: 'visitor'
  });
  return next
}
function notification(state: Envelope, recipientId: string, eventId: string, text: string, target: string) {
  if (state.changes.notifications.some(candidateNotification => candidateNotification.recipientId === recipientId && candidateNotification.eventId === eventId)) return;
  state.changes.notifications.push({
    ...entity(state, 'notification'),
    recipientId,
    eventId,
    text,
    target,
    read: false
  })
}
function alertStudent(state: Envelope, id: string, event: string, text: string, target: string) {
  seed.personas.filter(candidatePersona => candidatePersona.role === 'student' && candidatePersona.studentId === id).forEach(candidatePersona => notification(state, candidatePersona.id, event, text, target))
}
function alertCompany(state: Envelope, id: string, event: string, text: string, target: string) {
  const data = dataFor(state), parts = target.split('/'), offerId = parts[2] === 'applications'
    ? data.applications.find(candidateApplication => candidateApplication.id === parts[3])?.offerId
    : parts[2] === 'practice-cases'
      ? data.practices.find(candidatePractice => candidatePractice.id === parts[3])?.offerId
      : parts[2] === 'practices' || parts[2] === 'jobs' ? parts[3] : undefined;
  data.personas.filter(p => p.active && p.role === 'employer' && p.organizationId === id).forEach(p => {
    const actorState = { ...state, activePersonaId: p.id };
    if (offerId && !canEmployer(actorState, 'read', offerId)
      || !offerId && !canEmployer(actorState, parts[2] === 'students' ? 'search' : 'team')) return;
    notification(state, p.id, event, text, target)
  })
}
function recordApp(state: Envelope, application: SentApplication, text: string) {
  state.changes.b1!.applications = state.changes.b1!.applications.filter(candidateApplication => candidateApplication.id !== application.id);
  state.changes.b1!.applications.push({
    ...application,
    version: application.version + 1,
    updatedAt: now(state),
    history: [...(application.history ?? []), {
      at: now(state),
      text,
      selectionStatus: application.selectionStatus
    }]
  })
}
function recordCase(state: Envelope, practice: Case, text: string) {
  practice.version++;
  practice.updatedAt = now(state);
  practice.history.push({
    at: now(state),
    actorId: state.activePersonaId,
    text
  });
  state.changes.b2!.practices[practice.id] = practice
}
export function getCase(state: Envelope, id: string) {
  const practice = dataFor(state).practices.find(candidatePractice => candidatePractice.id === id);
  if (!practice) throw new Error('Дело практики не найдено');
  return practice
}
export function canReadCase(state: Envelope, practice: Case) {
  const persona = who(state);
  return persona.role === 'student' && persona.studentId === practice.studentId
    || persona.role === 'employer' && persona.organizationId === practice.companyId
    && canEmployer(state, 'read', practice.offerId)
    || persona.role === 'coordinator'
    && persona.organizationId === dataFor(state).students.find(candidateStudent => candidateStudent.id === practice.studentId)?.universityId
}
function caseAccess(state: Envelope, id: string) {
  const practice = getCase(state, id);
  if (!canReadCase(state, practice)) throw new Error('Дело недоступно');
  return structuredClone(practice)
}
export const freePlaces = (state: Envelope, id: string) => {
  const data = dataFor(state), offer = data.offers.find(candidateOffer => candidateOffer.id === id);
  return offer
    ? offer.capacity - data.practices.filter(candidatePractice => candidatePractice.offerId === id && candidatePractice.reservationActive).length
    : 0
};
export function applicationAccess(state: Envelope, id: string) {
  const data = dataFor(state), application = data.applications.find(candidateApplication => candidateApplication.id === id);
  if (!application) throw new Error('Отклик не найден');
  const offer = data.offers.find(candidateOffer => candidateOffer.id === application.offerId)!;
  const persona = who(state);
  if (!(persona.role === 'student' && persona.studentId === application.studentId
    || persona.role === 'employer' && persona.organizationId === offer.companyId
    && canEmployer(state, 'read', offer.id))) throw new Error('Отклик недоступен');
  return { a: application, o: offer }
}
export function changeSelection(state: Envelope, id: string, status: Application['selectionStatus'], reason: string) {
  const { a, o } = applicationAccess(state, id);
  requireCompany(state, o.companyId, 'selection', o.id);
  if (a.selectionStatus === status) return state;
  if (['rejected', 'withdrawn', 'offered'].includes(a.selectionStatus)) throw new Error('Этап отбора уже завершён');
  const allowed: Record<string, string[]> = {
    submitted: ['viewed', 'offered', 'rejected'],
    viewed: ['info_requested', 'interview', 'offered', 'rejected'],
    info_requested: ['viewed', 'offered', 'rejected'],
    interview: ['viewed', 'offered', 'rejected']
  };
  if (!allowed[a.selectionStatus]?.includes(status)) throw new Error('Недопустимый переход отбора');
  const comment = limited(reason, 'Комментарий решения', 600);
  return txn(
    state,
    'application.selection',
    id,
    (next, _, event) => {
      recordApp(next, {
        ...a,
        selectionStatus: status,
        offerResponse: status === 'offered' ? 'pending' : a.offerResponse
      }, comment);
      alertStudent(next, a.studentId, event, 'Изменился этап отклика: ' + status, '/student/applications/' + id)
    }
  )
}
export function respondOffer(state: Envelope, id: string, accept: boolean) {
  const { a, o } = applicationAccess(state, id);
  requireStudent(state, a.studentId);
  if (a.selectionStatus !== 'offered') throw new Error('Компания ещё не предложила место');
  if (a.offerResponse === (accept ? 'accepted' : 'declined')) return state;
  if (a.offerResponse === 'accepted' || a.offerResponse === 'declined') throw new Error('Ответ уже зафиксирован');
  if (accept && !isPublic(o, state)) throw new Error('Предложение недоступно');
  if (accept && o.kind === 'practice') {
    const student = dataFor(state).students.find(candidateStudent => candidateStudent.id === a.studentId)!;
    if (o.startDate < student.availability[0] || o.endDate > student.availability[1]) throw new Error('Период не входит в доступность студента');

    if (freePlaces(state, o.id) <= 0) throw new Error('Свободных мест нет');

    const overlapping = dataFor(state).practices.some(candidatePractice => candidatePractice.studentId === a.studentId
      && !['completed', 'cancelled'].includes(candidatePractice.status)
      && candidatePractice.offerSnapshot.startDate <= o.endDate
      && candidatePractice.offerSnapshot.endDate >= o.startDate);
    if (overlapping) throw new Error('В этот период уже есть активная практика');

  }

  return txn(
    state,
    'application.response',
    id,
    (next, changes, event) => {
      recordApp(
        next,
        { ...a, offerResponse: accept ? 'accepted' : 'declined' },
        accept ? 'Студент принял предложение' : 'Студент отказался от предложения'
      );
      if (accept && o.kind === 'practice') {
        const item: Case = {
          ...entity(next, 'practice'),
          studentId: a.studentId,
          applicationId: a.id,
          offerId: o.id,
          companyId: o.companyId,
          offerSnapshot: structuredClone(o),
          status: 'awaiting_university',
          academicResult: 'not_assessed',
          reservationActive: true,
          conditions: {
            hours: o.durationHours,
            tasks: o.expectedTasks,
            companySupervisor: o.supervisor,
            universitySupervisor: 'Координатор МГСУ — демо',
            notes: ''
          },
          conditionsVersion: 1,
          requirementSnapshot: {
            version: currentRequirements(next).find(candidateRequirement => candidateRequirement.programId === o.programId && candidateRequirement.practiceType === o.practiceType)?.version ?? 1,
            minHours: currentRequirements(next).find(candidateRequirement => candidateRequirement.programId === o.programId && candidateRequirement.practiceType === o.practiceType)?.minHours ?? 144,
            requiredDocuments: currentRequirements(next).find(candidateRequirement => candidateRequirement.programId === o.programId && candidateRequirement.practiceType === o.practiceType)?.requiredDocuments ?? ['agreement', 'direction', 'assignment'],
            completionRule: currentRequirements(next).find(candidateRequirement => candidateRequirement.programId === o.programId && candidateRequirement.practiceType === o.practiceType)?.completionRule,
            templates: structuredClone(currentTemplates(next))
          },
          reportText: '',
          reportVersion: 0,
          employerFeedback: '',
          coordinatorFeedback: '',
          history: [{
            at: now(next),
            actorId: state.activePersonaId,
            text: 'Студент принял место; создано дело и резерв'
          }]
        };
        changes.practices[item.id] = item;
        alertStudent(next, a.studentId, event, 'Создано дело практики', '/student/practices/' + item.id)
      }
      alertCompany(next, o.companyId, event, accept ? 'Предложение принято' : 'Студент отказался', '/employer/applications/' + id)
    }
  )
}
export function cancelPractice(state: Envelope, id: string, reason: string) {
  const practice = caseAccess(state, id), persona = who(state);
  if (practice.status === 'cancelled') return state;
  if (persona.role === 'student') {
    requireStudent(state, practice.studentId);
    if (!['awaiting_university', 'changes_requested', 'approved'].includes(practice.status)) throw new Error('После начала отмена доступна только координатору')
  } else requireRole(state, 'coordinator');
  const comment = limited(reason, 'Причина отмены', 600);
  return txn(
    state,
    'practice.cancelled',
    id,
    (next, _, event) => {
      practice.status = 'cancelled';
      practice.reservationActive = false;
      recordCase(next, practice, comment);
      alertCompany(next, practice.companyId, event, 'Практика отменена; место освобождено', '/employer/practice-cases/' + id);
      alertStudent(next, practice.studentId, event, 'Практика отменена', '/student/practices/' + id)
    }
  )
}
export function saveCaseConditions(state: Envelope, id: string, values: Case['conditions']) {
  const practice = caseAccess(state, id), persona = who(state);
  if (!['awaiting_university', 'changes_requested'].includes(practice.status)
    || practice.submittedToUniversityAt && practice.status !== 'changes_requested') throw new Error('Условия можно уточнить до направления или после возврата');
  const fresh = { ...practice.conditions };
  if (persona.role === 'student') fresh.notes = limited(values.notes, 'Примечание студента', 600); else if (persona.role === 'employer') {
    assertEmployer(state, 'practice', practice.offerId);
    fresh.tasks = limited(values.tasks, 'Задачи', 1200);
    fresh.companySupervisor = limited(values.companySupervisor, 'Наставник', 120);
    if (!Number.isInteger(values.hours) || values.hours <= 0 || values.hours > 1000) throw new Error('Объём: 1–1000 часов');
    fresh.hours = values.hours
  } else if (persona.role === 'coordinator') fresh.universitySupervisor = limited(values.universitySupervisor, 'Руководитель вуза', 120); else throw new Error('Нет полномочий');
  if (JSON.stringify(fresh) === JSON.stringify(practice.conditions)) return state;
  return txn(
    state,
    'practice.conditions',
    id,
    next => {
      practice.conditions = fresh;
      practice.conditionsVersion++;
      recordCase(next, practice, 'Уточнены условия; необходимы актуальные версии документов')
    }
  )
}
export function latestDocuments(state: Envelope, id: string) {
  const all = dataFor(state).documents.filter(candidateDocument => candidateDocument.practiceId === id);
  return (['agreement', 'direction', 'assignment', 'report'] as DocType[]).map(type => all.filter(candidateDocument => candidateDocument.type === type).sort((leftDocument, rightDocument) => rightDocument.version - leftDocument.version)[0]).filter((candidateDocument): candidateDocument is DocumentVersion => Boolean(candidateDocument))
}
export function createDocument(state: Envelope, id: string, type: DocType) {
  const practice = caseAccess(state, id);
  requireStudent(state, practice.studentId);
  if (type === 'report'
    ? !['in_progress', 'review'].includes(practice.status)
    : !['awaiting_university', 'changes_requested'].includes(practice.status)) throw new Error('Документ недоступен на текущем этапе');
  if (!practice.conditions.notes || !practice.conditions.tasks || !practice.conditions.companySupervisor
    || !practice.conditions.universitySupervisor
    || practice.conditions.hours <= 0) throw new Error('Заполните примечание, задачи, руководителей и объём');
  if (type === 'report' && !practice.reportText) throw new Error('Сначала сдайте отчёт');
  const template = practice.requirementSnapshot.templates?.find(candidateTemplate => candidateTemplate.type === type) ?? templateSeed.find(candidateTemplate => candidateTemplate.type === type)!;
  const data = dataFor(state), fields = documentFields(
    practice,
    officialName(data.students.find(candidateStudent => candidateStudent.id === practice.studentId)),
    data.companies.find(candidateCompany => candidateCompany.id === practice.companyId)!.name,
    state.demoClock
  ), latest = latestDocuments(state, id).find(candidateDocument => candidateDocument.type === type);
  if (latest && JSON.stringify(latest.fields) === JSON.stringify(fields)
    && latest.conditionsVersion === practice.conditionsVersion
    && latest.status !== 'changes_requested') return state;
  return txn(
    state,
    'document.created',
    id,
    (next, changes) => {
      changes.documents.push({
        ...entity(next, 'document'),
        practiceId: id,
        type,
        version: (latest?.version ?? 0) + 1,
        templateVersion: template.version,
        templateBody: template.body.replace(/\{\{([^{}]+)\}\}/g, (_, key) => fields[key] ?? ''),
        selectedFields: template.fields,
        conditionsVersion: practice.conditionsVersion,
        fields,
        status: 'draft',
        reviewSteps: []
      })
    }
  )
}
export function submitDocument(state: Envelope, docId: string) {
  const document = dataFor(state).documents.find(candidateDocument => candidateDocument.id === docId);
  if (!document) throw new Error('Документ не найден');
  const practice = caseAccess(state, document.practiceId);
  requireStudent(state, practice.studentId);
  if (latestDocuments(state, practice.id).find(candidateDocument => candidateDocument.type === document.type)?.id !== document.id) throw new Error('Направьте последнюю версию');
  if (document.status === 'in_review') return state;
  if (document.status !== 'draft') throw new Error('Для доработки создайте новую версию');
  if (document.conditionsVersion !== practice.conditionsVersion) throw new Error('Условия изменились: сформируйте актуальную версию');
  if (['cancelled', 'completed'].includes(practice.status)) throw new Error('Дело закрыто');
  return txn(
    state,
    'document.submitted',
    docId,
    (next, changes, event) => {
      changes.documents = changes.documents.filter(candidateDocument => candidateDocument.id !== document.id);
      changes.documents.push({
        ...document,
        status: 'in_review',
        updatedAt: now(next)
      });
      if (document.type === 'agreement' || document.type === 'report') alertCompany(next, practice.companyId, event, 'Документ ожидает проверки компании', '/employer/practice-cases/' + practice.id); else notification(next, 'coordinator_mgsu_demo', event, 'Документ направлен на проверку', '/university/practices/' + practice.id)
    }
  )
}
export function submitCase(state: Envelope, id: string) {
  const practice = caseAccess(state, id);
  requireStudent(state, practice.studentId);
  if (practice.status === 'awaiting_university' && practice.submittedToUniversityAt) return state;
  if (!['awaiting_university', 'changes_requested'].includes(practice.status)) throw new Error('Дело нельзя направить на этом этапе');
  const docs = latestDocuments(state, id);
  if (!practice.conditions.notes
    || practice.requirementSnapshot.requiredDocuments.some(type => !docs.some(candidateDocument => candidateDocument.type === type && candidateDocument.conditionsVersion === practice.conditionsVersion
      && ['in_review', 'approved'].includes(candidateDocument.status)))) throw new Error('Заполните условия и направьте актуальные обязательные документы');
  return txn(
    state,
    'practice.submitted',
    id,
    (next, _, event) => {
      practice.status = 'awaiting_university';
      practice.submittedToUniversityAt = now(next);
      recordCase(next, practice, 'Дело направлено на согласование в вуз');
      notification(next, 'coordinator_mgsu_demo', event, 'Новое дело практики на согласовании', '/university/practices/' + id)
    }
  )
}
export function reviewDocument(state: Envelope, docId: string, approve: boolean, reason: string) {
  const document = dataFor(state).documents.find(candidateDocument => candidateDocument.id === docId);
  if (!document) throw new Error('Документ не найден');
  const practice = caseAccess(state, document.practiceId), persona = who(state);
  if (persona.role === 'employer') assertEmployer(state, 'documents', practice.offerId);
  const twoSteps = document.type === 'agreement' || document.type === 'report', companyDone = document.reviewSteps.some(r => r.role === 'employer' && r.decision === 'approved'), expected = twoSteps && !companyDone ? 'employer' : 'coordinator';
  if (latestDocuments(state, practice.id).find(candidateDocument => candidateDocument.type === document.type)?.id === document.id
    && document.reviewSteps.some(r => r.actorId === persona.id && r.decision === (approve ? 'approved' : 'changes_requested'))) return state;
  if (persona.role !== expected) throw new Error('Сейчас документ проверяет ' + (expected === 'employer' ? 'компания' : 'координатор'));
  if (latestDocuments(state, practice.id).find(candidateDocument => candidateDocument.type === document.type)?.id !== docId) throw new Error('Согласуется только последняя версия');
  if (document.reviewSteps.some(r => r.actorId === persona.id && r.decision === (approve ? 'approved' : 'changes_requested'))
    && ['approved', 'changes_requested', 'in_review'].includes(document.status)) return state;
  if (document.status !== 'in_review' || ['cancelled', 'completed'].includes(practice.status)) throw new Error('Документ не находится на проверке');
  if (document.conditionsVersion !== practice.conditionsVersion) throw new Error('Документ устарел относительно условий');
  if (persona.role === 'coordinator' && document.type !== 'report' && !practice.submittedToUniversityAt) throw new Error('Сначала студент направляет дело в вуз');
  const comment = limited(reason, 'Комментарий проверки', 600);
  return txn(
    state,
    'document.reviewed',
    docId,
    (next, changes, event) => {
      const doc = structuredClone(document);
      doc.reviewSteps.push({
        role: persona.role as 'employer' | 'coordinator',
        actorId: persona.id,
        decision: approve ? 'approved' : 'changes_requested',
        comment,
        at: now(next)
      });
      doc.status = !approve ? 'changes_requested' : persona.role === 'employer' ? 'in_review' : 'approved';
      doc.updatedAt = now(next);
      changes.documents = changes.documents.filter(candidateDocument => candidateDocument.id !== document.id);
      changes.documents.push(doc);
      if (!approve) {
        practice.status = document.type === 'report' ? 'in_progress' : 'changes_requested';
        practice.academicResult = document.type === 'report' ? 'needs_revision' : practice.academicResult;
        practice.coordinatorFeedback = comment;
        recordCase(next, practice, 'Документ возвращён: ' + comment)
      } else if (document.type === 'report' && persona.role === 'employer') {
        practice.employerFeedback = comment;
        practice.status = 'review';
        recordCase(next, practice, 'Компания оставила отзыв на отчёт')
      }
      if (persona.role === 'employer' && approve) notification(
        next,
        'coordinator_mgsu_demo',
        event,
        'Компания проверила учебную версию документа',
        '/university/practices/' + practice.id
      ); else alertStudent(
        next,
        practice.studentId,
        event,
        approve ? 'Учебная версия согласована' : 'Есть замечания к документу',
        '/student/practices/' + practice.id + '/documents'
      )
    }
  )
}
export function approvePractice(state: Envelope, id: string) {
  const practice = caseAccess(state, id);
  requireRole(state, 'coordinator');
  if (practice.status === 'approved') return state;
  if (practice.status !== 'awaiting_university' || !practice.submittedToUniversityAt) throw new Error('Дело ещё не направлено на согласование');
  const docs = latestDocuments(state, id);
  if (practice.requirementSnapshot.requiredDocuments.some(type => !docs.some(candidateDocument => candidateDocument.type === type && candidateDocument.status === 'approved'
    && candidateDocument.conditionsVersion === practice.conditionsVersion))) throw new Error('Все обязательные актуальные версии документов должны быть согласованы');
  if (practice.conditions.hours < (practice.requirementSnapshot.minHours ?? 144)
    || !practice.conditions.companySupervisor
    || !practice.conditions.universitySupervisor
    || !practice.conditions.tasks
    || !practice.conditions.notes) throw new Error('Не заполнены обязательные условия практики');
  return txn(
    state,
    'practice.approved',
    id,
    (next, _, event) => {
      practice.status = 'approved';
      recordCase(next, practice, 'Вуз согласовал условия и обязательные документы');
      alertStudent(next, practice.studentId, event, 'Практика согласована вузом', '/student/practices/' + id);
      alertCompany(next, practice.companyId, event, 'Практика согласована вузом', '/employer/practice-cases/' + id)
    }
  )
}
export function returnPractice(state: Envelope, id: string, reason: string) {
  const practice = caseAccess(state, id);
  requireRole(state, 'coordinator');
  if (!['awaiting_university', 'review'].includes(practice.status)) throw new Error('Дело не находится на проверке');
  const comment = limited(reason, 'Замечание', 600);
  return txn(
    state,
    'practice.returned',
    id,
    (next, _, event) => {
      practice.status = practice.status === 'review' ? 'in_progress' : 'changes_requested';
      practice.coordinatorFeedback = comment;
      if (practice.status === 'in_progress') practice.academicResult = 'needs_revision';
      recordCase(next, practice, 'Возвращено: ' + comment);
      alertStudent(next, practice.studentId, event, 'Дело возвращено с замечаниями', '/student/practices/' + id)
    }
  )
}
export function advanceDemoClock(state: Envelope, id: string, to: 'start' | 'end', confirmed: boolean) {
  const practice = caseAccess(state, id);
  requireRole(state, 'coordinator');
  if (!confirmed) throw new Error('Подтвердите изменение учебной даты');
  if (!['approved', 'in_progress', 'review'].includes(practice.status)) throw new Error('Сначала согласуйте практику');
  const date = to === 'start' ? practice.offerSnapshot.startDate : practice.offerSnapshot.endDate;
  if (state.demoClock >= date) return state;
  return txn(state, 'demo.clock', id, next => {
    next.demoClock = date
  })
}
export function startPractice(state: Envelope, id: string) {
  const practice = caseAccess(state, id);
  requireRole(state, 'coordinator');
  if (practice.status === 'in_progress') return state;
  if (practice.status !== 'approved') throw new Error('Практика ещё не согласована');
  if (state.demoClock < practice.offerSnapshot.startDate) throw new Error('Учебная дата ещё не достигла начала');
  const docs = latestDocuments(state, id);
  if (practice.requirementSnapshot.requiredDocuments.some(type => !docs.some(candidateDocument => candidateDocument.type === type && candidateDocument.status === 'approved'
    && candidateDocument.conditionsVersion === practice.conditionsVersion))) throw new Error('Обязательные документы не согласованы');
  return txn(
    state,
    'practice.started',
    id,
    (next, _, event) => {
      practice.status = 'in_progress';
      recordCase(next, practice, 'Координатор подтвердил начало практики');
      alertStudent(next, practice.studentId, event, 'Практика началась', '/student/practices/' + id);
      alertCompany(next, practice.companyId, event, 'Практика началась', '/employer/practice-cases/' + id)
    }
  )
}
export function assignTask(state: Envelope, id: string, title: string, dueDate: string) {
  const practice = caseAccess(state, id);
  requireCompany(state, practice.companyId, 'practice', practice.offerId);
  if (practice.status !== 'in_progress') throw new Error('Задания выдаются во время практики');
  const t = limited(title, 'Название задания', 160);
  if (!validDate(dueDate) || dueDate < practice.offerSnapshot.startDate
    || dueDate > practice.offerSnapshot.endDate) throw new Error('Срок задания должен входить в период практики');
  if (dataFor(state).tasks.some(candidateTask => candidateTask.practiceId === id && candidateTask.title === t && candidateTask.dueDate === dueDate)) return state;
  return txn(
    state,
    'task.assigned',
    id,
    (next, changes, event) => {
      changes.tasks.push({
        ...entity(next, 'task'),
        practiceId: id,
        title: t,
        dueDate,
        studentText: '',
        status: 'assigned',
        comments: []
      });
      alertStudent(next, practice.studentId, event, 'Получено задание практики', '/student/practices/' + id)
    }
  )
}
export function submitTask(state: Envelope, taskId: string, text: string) {
  const task = dataFor(state).tasks.find(candidateTask => candidateTask.id === taskId);
  if (!task) throw new Error('Задание не найдено');
  const practice = caseAccess(state, task.practiceId);
  requireStudent(state, practice.studentId);
  if (practice.status !== 'in_progress') throw new Error('Практика не идёт');
  const studentText = limited(text, 'Результат задания', 2000);
  if (task.status === 'submitted' && task.studentText === studentText) return state;
  if (!['assigned', 'revision'].includes(task.status)) throw new Error('Задание уже отправлено или принято');
  return txn(
    state,
    'task.submitted',
    taskId,
    (next, changes, event) => {
      changes.tasks = changes.tasks.filter(candidateTask => candidateTask.id !== taskId);
      changes.tasks.push({
        ...task,
        status: 'submitted',
        studentText,
        version: task.version + 1,
        updatedAt: now(next)
      });
      alertCompany(next, practice.companyId, event, 'Студент сдал задание', '/employer/practice-cases/' + practice.id)
    }
  )
}
export function reviewTask(state: Envelope, taskId: string, accept: boolean, comment: string) {
  const task = dataFor(state).tasks.find(candidateTask => candidateTask.id === taskId);
  if (!task) throw new Error('Задание не найдено');
  const practice = caseAccess(state, task.practiceId);
  requireCompany(state, practice.companyId, 'practice', practice.offerId);
  if (task.status === (accept ? 'accepted' : 'revision')) return state;
  if (task.status !== 'submitted' || practice.status !== 'in_progress') throw new Error('Задание не находится на проверке');
  const reason = limited(comment, 'Комментарий задания', 600);
  return txn(
    state,
    'task.reviewed',
    taskId,
    (next, changes, event) => {
      changes.tasks = changes.tasks.filter(candidateTask => candidateTask.id !== taskId);
      changes.tasks.push({
        ...task,
        status: accept ? 'accepted' : 'revision',
        version: task.version + 1,
        updatedAt: now(next),
        comments: [...task.comments, {
          actorId: state.activePersonaId,
          text: reason,
          at: now(next)
        }]
      });
      alertStudent(
        next,
        practice.studentId,
        event,
        accept ? 'Задание принято' : 'Задание требует доработки',
        '/student/practices/' + practice.id
      )
    }
  )
}
export function submitReport(state: Envelope, id: string, text: string) {
  const practice = caseAccess(state, id);
  requireStudent(state, practice.studentId);
  if (practice.status !== 'in_progress') throw new Error('Отчёт сдаётся во время практики');
  const report = limited(text, 'Отчёт', 5000), latest = latestDocuments(state, id).find(candidateDocument => candidateDocument.type === 'report');
  if (practice.reportText === report && latest && ['draft', 'in_review'].includes(latest.status)) return state;
  return txn(
    state,
    'report.submitted',
    id,
    (next, changes) => {
      practice.reportText = report;
      practice.reportVersion++;
      practice.employerFeedback = '';
      recordCase(next, practice, 'Студент подготовил отчёт; новая учебная версия');
      const data = dataFor(next), template = practice.requirementSnapshot.templates?.find(candidateTemplate => candidateTemplate.type === 'report') ?? templateSeed.find(candidateTemplate => candidateTemplate.type === 'report')!, fields = documentFields(
        practice,
        officialName(data.students.find(candidateStudent => candidateStudent.id === practice.studentId)),
        data.companies.find(candidateCompany => candidateCompany.id === practice.companyId)!.name,
        next.demoClock
      );
      changes.documents.push({
        ...entity(next, 'document'),
        practiceId: id,
        type: 'report',
        version: (latest?.version ?? 0) + 1,
        templateVersion: template.version,
        templateBody: template.body.replace(/\{\{([^{}]+)\}\}/g, (_, key) => fields[key] ?? ''),
        selectedFields: template.fields,
        conditionsVersion: practice.conditionsVersion,
        fields: documentFields(
          practice,
          officialName(data.students.find(candidateStudent => candidateStudent.id === practice.studentId)),
          data.companies.find(candidateCompany => candidateCompany.id === practice.companyId)!.name,
          next.demoClock
        ),
        status: 'draft',
        reviewSteps: []
      })
    }
  )
}
export function completePractice(state: Envelope, id: string, credited: boolean, reason: string) {
  const practice = caseAccess(state, id);
  requireRole(state, 'coordinator');
  const result = credited ? 'credited' : 'not_credited';
  if (practice.status === 'completed' && practice.academicResult === result) return state;
  if (practice.status !== 'review') throw new Error('Дело должно находиться на проверке отчёта');
  if (state.demoClock < practice.offerSnapshot.endDate) throw new Error('Учебная дата ещё не достигла конца практики');
  const tasks = dataFor(state).tasks.filter(candidateTask => candidateTask.practiceId === id);
  if (!tasks.length || tasks.some(candidateTask => candidateTask.status !== 'accepted')) throw new Error('Все задания должны быть приняты');
  if (!practice.reportText || !practice.employerFeedback
    || !latestDocuments(state, id).some(candidateDocument => candidateDocument.type === 'report' && candidateDocument.status === 'approved')) throw new Error('Нужны отчёт, отзыв компании и согласованная версия отчёта');
  const comment = limited(reason, 'Пояснение итога', 600);
  return txn(
    state,
    'practice.completed',
    id,
    (next, _, event) => {
      practice.status = 'completed';
      practice.academicResult = result;
      practice.coordinatorFeedback = comment;
      recordCase(next, practice, 'Итог: ' + result + ' · ' + comment);
      alertStudent(
        next,
        practice.studentId,
        event,
        credited ? 'Практика зачтена' : 'Практика завершена без зачёта',
        '/student/practices/' + id
      );
      alertCompany(next, practice.companyId, event, 'Учебный итог практики зафиксирован', '/employer/practice-cases/' + id)
    }
  )
}
export function inviteStudent(state: Envelope, offerId: string, studentId: string, message: string) {
  const data = dataFor(state), offer = data.offers.find(candidateOffer => candidateOffer.id === offerId), student = data.students.find(candidateStudent => candidateStudent.id === studentId);
  if (!offer) throw new Error('Предложение не найдено');
  requireCompany(state, offer.companyId, 'search', offer.id);
  if (!isPublic(offer, state) || student?.visibility !== 'visible') throw new Error('Предложение или студент недоступны');
  if (data.invitations.some(candidateInvitation => candidateInvitation.offerId === offerId && candidateInvitation.studentId === studentId
    && ['pending', 'accepted'].includes(candidateInvitation.status))) throw new Error('Активное приглашение уже существует');
  if (data.applications.some(candidateApplication => candidateApplication.offerId === offerId && candidateApplication.studentId === studentId
    && !['rejected', 'withdrawn'].includes(candidateApplication.selectionStatus))) throw new Error('По этому месту уже есть отклик');
  const content = limited(message, 'Текст приглашения', 600);
  return txn(
    state,
    'invitation.created',
    offerId,
    (next, changes, event) => {
      const item: Invite = {
        ...entity(next, 'invitation'),
        companyId: offer.companyId,
        offerId,
        studentId,
        message: content,
        status: 'pending'
      };
      changes.invitations.push(item);
      alertStudent(next, studentId, event, 'Получено приглашение компании', '/student/applications')
    }
  )
}
export function respondInvitation(state: Envelope, id: string, accept: boolean, resumeId: string, consent: boolean) {
  const invitation = dataFor(state).invitations.find(candidateInvitation => candidateInvitation.id === id);
  if (!invitation) throw new Error('Приглашение не найдено');
  requireStudent(state, invitation.studentId);
  if (invitation.status === (accept ? 'accepted' : 'declined')) return state;
  if (invitation.status !== 'pending') throw new Error('Приглашение уже завершено');
  let next = state, applicationId: string | undefined;
  if (accept) {
    if (!consent) throw new Error('Подтвердите передачу выбранного резюме');
    const resume = dataFor(state).resumes.find(candidateResume => candidateResume.id === resumeId && candidateResume.studentId === invitation.studentId
      && candidateResume.status === 'ready');
    if (!resume) throw new Error('Выберите готовое резюме');
    const result = submitApplication(state, invitation.offerId, resumeId, true);
    next = result.state;
    applicationId = result.id
  }
  return txn(
    next,
    'invitation.response',
    id,
    (updated, changes, event) => {
      changes.invitations = changes.invitations.filter(candidateInvitation => candidateInvitation.id !== id);
      changes.invitations.push({
        ...invitation,
        status: accept ? 'accepted' : 'declined',
        applicationId,
        version: invitation.version + 1,
        updatedAt: now(updated)
      });
      alertCompany(
        updated,
        invitation.companyId,
        event,
        accept ? 'Приглашение принято' : 'Приглашение отклонено',
        applicationId ? '/employer/applications/' + applicationId : '/employer/students/' + invitation.studentId
      )
    }
  )
}
export function conversationAllowed(state: Envelope, type: 'application' | 'practice', id: string) {
  try {
    if (type === 'practice') {
      const practice = getCase(state, id);
      return canReadCase(state, practice)
    }
    const { a } = applicationAccess(state, id);
    return ['submitted', 'viewed', 'info_requested', 'interview', 'offered', 'rejected', 'withdrawn'].includes(a.selectionStatus)
  } catch {
    return false
  }
}
export function sendMessage(state: Envelope, type: 'application' | 'practice', id: string, text: string, requestId: string) {
  if (!conversationAllowed(state, type, id)) throw new Error('Диалог доступен после отклика, принятого приглашения или в деле практики');
  const content = limited(text, 'Сообщение', 2000);
  if (!requestId || requestId.length > 100) throw new Error('Некорректный идентификатор сообщения');
  if (dataFor(state).messages.some(candidateMessage => candidateMessage.authorId === state.activePersonaId && candidateMessage.requestId === requestId)) return state;
  return txn(
    state,
    'message.sent',
    id,
    (next, changes, event) => {
      changes.messages.push({
        ...entity(next, 'message'),
        contextType: type,
        contextId: id,
        authorId: state.activePersonaId,
        text: content,
        requestId
      });
      if (type === 'application') {
        const { a, o } = applicationAccess(next, id);
        if (who(state).role === 'student') alertCompany(next, o.companyId, event, 'Новое сообщение по отклику', '/employer/applications/' + id); else alertStudent(next, a.studentId, event, 'Новое сообщение компании', '/student/applications/' + id)
      } else {
        const practice = getCase(next, id);
        if (who(state).role !== 'student') alertStudent(next, practice.studentId, event, 'Новое сообщение по практике', '/student/practices/' + id);
        if (who(state).role !== 'employer') alertCompany(next, practice.companyId, event, 'Новое сообщение по практике', '/employer/practice-cases/' + id);
        if (who(state).role !== 'coordinator' && practice.submittedToUniversityAt) notification(next, 'coordinator_mgsu_demo', event, 'Новое сообщение по практике', '/university/practices/' + id)
      }
    }
  )
}
export function newOffer(state: Envelope): PracticeOffer {
  requireRole(state, 'employer');
  return {
    ...entity(state, 'offer'),
    companyId: who(state).organizationId!,
    kind: 'practice',
    title: '',
    programId: 'ПТО',
    region: 'Москва',
    status: 'draft',
    skills: ['Таблицы', 'График работ'],
    startDate: '2026-11-02',
    endDate: '2026-11-27',
    capacity: 2,
    supervisor: '',
    constructionDirectionId: 'direction_0',
    practiceType: 'Производственная',
    durationHours: 144,
    expectedTasks: '',
    universityCompatibility: 'Учебный пример МГСУ'
  }
}
export function saveOffer(state: Envelope, offer: PracticeOffer) {
  if (offer.paid !== undefined && typeof offer.paid !== 'boolean'
    || offer.schedule !== undefined && !['Полный день', 'Гибкий график'].includes(offer.schedule)
    || [offer.minCourse, offer.maxCourse].some(v => v !== undefined && (!Number.isInteger(v) || v < 1 || v > 6))
    || (offer.minCourse ?? 3) > (offer.maxCourse ?? 4)) throw new Error('Проверьте оплату, график и диапазон курсов');
  requireCompany(state, offer.companyId, 'publish', offer.id);
  const data = dataFor(state), old = data.offers.find(candidateOffer => candidateOffer.id === offer.id);
  if (offer.constructionDirectionId
    && (!dictionaries(state).some(candidateEntry => candidateEntry.id === offer.constructionDirectionId && candidateEntry.category === 'direction')
      || offer.constructionDirectionId !== old?.constructionDirectionId
      && !dictionaries(state).some(candidateEntry => candidateEntry.id === offer.constructionDirectionId && candidateEntry.active))) throw new Error('Выберите активное строительное направление');
  if (old && old.companyId !== offer.companyId) throw new Error('Чужое предложение');
  const title = limited(offer.title, 'Название', 160), region = limited(offer.region, 'Регион', 100), supervisor = limited(offer.supervisor, 'Наставник', 120), tasks = limited(offer.expectedTasks, 'Учебные задачи', 1200);
  if (!validDate(offer.startDate) || !validDate(offer.endDate) || offer.startDate > offer.endDate) throw new Error('Проверьте даты практики');
  if (!Number.isInteger(offer.capacity) || offer.capacity < 1 || offer.capacity > 100
    || !Number.isInteger(offer.durationHours)
    || offer.durationHours < 1
    || offer.durationHours > 1000) throw new Error('Проверьте вместимость и объём');
  if (offer.capacity < data.practices.filter(candidatePractice => candidatePractice.offerId === offer.id && candidatePractice.reservationActive).length) throw new Error('Вместимость ниже числа резервов');
  if (offer.skills.length < 1 || offer.skills.length > 12
    || offer.skills.some(skill => !skill.trim() || skill.length > 80)
    || !['Производственная', 'Учебная'].includes(offer.practiceType)) throw new Error('Укажите вид практики и 1–12 навыков');
  if (!['ПТО', 'BIM/ТИМ', 'Сметное дело', 'Проектирование'].includes(offer.programId)
    || !['practice', 'internship', 'job'].includes(offer.kind)) throw new Error('Проверьте тип и профиль');
  return txn(
    state,
    'offer.saved',
    offer.id,
    (next, changes) => {
      changes.offers[offer.id] = {
        ...offer,
        title,
        region,
        supervisor,
        expectedTasks: tasks,
        status: old?.status === 'published' ? 'pending_moderation' : 'draft',
        version: (old?.version ?? 0) + 1,
        updatedAt: now(next),
        moderationReason: ''
      }
    }
  )
}
export function submitOffer(state: Envelope, id: string) {
  const offer = dataFor(state).offers.find(candidateOffer => candidateOffer.id === id);
  if (!offer) throw new Error('Предложение не найдено');
  requireCompany(state, offer.companyId, 'publish', offer.id);
  if (offer.status === 'pending_moderation') return state;
  if (!['draft', 'changes_requested', 'rejected'].includes(offer.status)) throw new Error('Предложение уже опубликовано или закрыто');
  if (!offer.title || !offer.supervisor || !offer.expectedTasks || offer.capacity < 1) throw new Error('Заполните условия');
  return txn(
    state,
    'offer.submitted',
    id,
    (next, changes, event) => {
      changes.offers[id] = {
        ...offer,
        status: 'pending_moderation',
        version: offer.version + 1,
        updatedAt: now(next)
      };
      notification(next, 'operator_demo', event, 'Предложение ожидает модерации', '/operator/offers')
    }
  )
}
export function moderateOffer(state: Envelope, id: string, publish: boolean, reason: string) {
  requireRole(state, 'operator');
  const data = dataFor(state), offer = data.offers.find(candidateOffer => candidateOffer.id === id);
  if (!offer) throw new Error('Предложение не найдено');
  if (offer.status === (publish ? 'published' : 'changes_requested')) return state;
  if (offer.status !== 'pending_moderation') throw new Error('Нет предложения на модерации');
  if (publish
    && data.companies.find(candidateCompany => candidateCompany.id === offer.companyId)?.status !== 'approved') throw new Error('Компания не допущена');
  const comment = limited(reason, 'Комментарий модерации', 600);
  return txn(
    state,
    'offer.moderated',
    id,
    (next, changes, event) => {
      changes.offers[id] = {
        ...offer,
        status: publish ? 'published' : 'changes_requested',
        moderationReason: comment,
        version: offer.version + 1,
        updatedAt: now(next)
      };
      alertCompany(
        next,
        offer.companyId,
        event,
        publish ? 'Предложение опубликовано' : 'Предложение возвращено',
        '/employer/practices/' + id + '/edit'
      )
    }
  )
}
export function archiveOffer(state: Envelope, id: string) {
  const offer = dataFor(state).offers.find(candidateOffer => candidateOffer.id === id);
  if (!offer) throw new Error('Предложение не найдено');
  requireCompany(state, offer.companyId, 'publish', offer.id);
  if (offer.status === 'archived') return state;
  return txn(
    state,
    'offer.archived',
    id,
    (next, changes) => {
      changes.offers[id] = {
        ...offer,
        status: 'archived',
        version: offer.version + 1,
        updatedAt: now(next)
      }
    }
  )
}
export function submitCompany(state: Envelope, description: string) {
  requireRole(state, 'employer');
  assertEmployer(state, 'team');
  const id = who(state).organizationId!, company = dataFor(state).companies.find(candidateCompany => candidateCompany.id === id)!;
  const content = limited(description, 'Описание компании', 1200);
  return txn(
    state,
    'company.submitted',
    id,
    (next, changes, event) => {
      changes.companies[id] = {
        ...company,
        description: content,
        status: 'pending',
        version: company.version + 1,
        updatedAt: now(next)
      };
      notification(next, 'operator_demo', event, 'Компания ожидает проверки', '/operator/organizations')
    }
  )
}
export function verifyCompany(state: Envelope, id: string, approve: boolean, reason: string) {
  requireRole(state, 'operator');
  const company = dataFor(state).companies.find(candidateCompany => candidateCompany.id === id);
  if (!company) throw new Error('Компания не найдена');
  if (company.status === (approve ? 'approved' : 'rejected')) return state;
  if (company.status !== 'pending') throw new Error('Компания не ожидает проверки');
  const comment = limited(reason, 'Причина проверки', 600);
  return txn(
    state,
    'company.verified',
    id,
    (next, changes, event) => {
      changes.companies[id] = {
        ...company,
        status: approve ? 'approved' : 'rejected',
        verificationReason: comment,
        version: company.version + 1,
        updatedAt: now(next)
      };
      alertCompany(next, id, event, approve ? 'Компания допущена' : 'Компания отклонена', '/employer/company')
    }
  )
}






