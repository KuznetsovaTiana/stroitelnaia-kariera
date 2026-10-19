
import type { Envelope, Entity } from './types';
import type {



  CChanges,



  PlaceRequest,



  Requirement,



  Template,



  ImportBatch,



  ImportRow,



  Ticket,



  Subrole,



  Dictionary



} from './c-types';
import { cState } from './c-types';
import { dataFor } from './b1';
import { activeActor, assertEmployer } from './access';
import { emptyB1 } from './b1-types';
import { emptyB2 } from './b2-types';
import { requirementSeed, templateSeed, requestSeed, dictionarySeed, aiSeed, mergeById } from '../data/c-seed';
const at = (state: Envelope) => state.demoClock + 'T12:00:00.000Z';
const id = (prefix: string) => prefix + '_' + crypto.randomUUID();
const entity = (state: Envelope, prefix: string): Entity => ({
  id: id(prefix),
  version: 1,
  createdAt: at(state),
  updatedAt: at(state)
});
export const text = (
  value: string,
  label = 'Текст',
  max = 2000
) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label}: заполните поле, не более ${max} символов`);
  return value.trim();
};
const role = (state: Envelope, r: string) => {
  if (activeActor(state).role !== r) throw new Error('Действие недоступно текущей роли');
};
export function cTxn(
  state: Envelope,
  type: string,
  ref: string,
  fn: (next: Envelope, changes: CChanges, eventId: string) => void
) {
  activeActor(state);
  const next = structuredClone(state);
  next.changes.c = structuredClone(cState(state));
  next.changes.b1 = structuredClone(state.changes.b1 ?? emptyB1());
  next.changes.b2 = structuredClone(state.changes.b2 ?? emptyB2());
  next.revision++;
  const eventId = id('event');
  fn(next, next.changes.c, eventId);
  next.changes.b1.events.push({
    id: eventId,
    actorId: state.activePersonaId,
    type,
    objectRef: ref,
    at: at(state),
    origin: 'visitor'
  });
  return next;
}
function notify(
  state: Envelope,
  eventId: string,
  recipientId: string,
  message: string,
  target: string
) {
  state.changes.notifications.push({
    ...entity(state, 'notification'),
    recipientId,
    eventId,
    text: message,
    target,
    read: false
  });
}
export const currentRequirements = (state: Envelope) => mergeById(requirementSeed, cState(state).requirements);
export const currentTemplates = (state: Envelope) => mergeById(templateSeed, cState(state).templates);
export const currentRequests = (state: Envelope) => mergeById(requestSeed, cState(state).requests);
export const dictionaries = (state: Envelope) => mergeById(dictionarySeed, cState(state).dictionaries);
export const aiExamples = (state: Envelope) => mergeById(aiSeed, cState(state).aiExamples);
const date = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d))
  && new Date(d).toISOString().slice(0, 10) === d;
export function requestPlaces(state: Envelope, v: Omit<PlaceRequest, keyof Entity | 'status' | 'proposed' | 'response'>) {
  role(state, 'coordinator');
  if (!dataFor(state).companies.some(candidateCompany => candidateCompany.id === v.companyId && candidateCompany.status === 'approved')
    || !dataFor(state).programs.some(p => p.id === v.programId)) throw new Error('Выберите допущенную компанию и программу');
  if (!date(v.start) || !date(v.end) || v.start > v.end || !Number.isInteger(v.requested) || v.requested < 1
    || v.requested > 100) throw new Error('Проверьте период и число мест');
  const message = text(v.message, 'Сообщение', 600);
  return cTxn(
    state,
    'places.requested',
    v.companyId,
    (
      next,
      changes,
      event
    ) => {
      const item: PlaceRequest = {
        ...entity(state, 'request'),
        ...v,
        message,
        proposed: 0,
        status: 'pending',
        response: ''
      };
      changes.requests.push(item);
      dataFor(next).personas.filter(p => p.role === 'employer' && p.organizationId === v.companyId && (!p.subrole || p.subrole === 'owner'))
        .forEach(p => notify(next, event, p.id, 'Вуз запросил места практики', '/employer/university-requests'));
    }
  );
}
export function respondPlaces(
  state: Envelope,
  requestId: string,
  proposed: number,
  response: string
) {
  role(state, 'employer');
  assertEmployer(state, 'publish');
  const placeRequest = currentRequests(state).find(candidatePlaceRequest => candidatePlaceRequest.id === requestId);
  if (!placeRequest || placeRequest.companyId !== activeActor(state).organizationId) throw new Error('Запрос недоступен');
  if (!Number.isInteger(proposed) || proposed < 0 || proposed > 100) throw new Error('Число мест: 0–100');
  const comment = text(response, 'Ответ', 600);
  if (placeRequest.status === 'answered' && placeRequest.proposed === proposed && placeRequest.response === comment) return state;
  return cTxn(
    state,
    'places.answered',
    placeRequest.id,
    (
      next,
      changes,
      event
    ) => {
      changes.requests = changes.requests.filter(candidatePlaceRequest => candidatePlaceRequest.id !== placeRequest.id);
      changes.requests.push({
        ...placeRequest,
        proposed,
        response: comment,
        status: 'answered',
        version: placeRequest.version + 1,
        updatedAt: at(state)
      });
      notify(
        next,
        event,
        'coordinator_mgsu_demo',
        'Компания ответила на запрос мест',
        '/university/company-requests'
      );
    }
  );
}
export function saveRequirement(state: Envelope, requirement: Requirement) {
  role(state, 'coordinator');
  const existingRequirement = currentRequirements(state).find(candidateRequirement => candidateRequirement.id === requirement.id);
  if (!existingRequirement || requirement.programId !== existingRequirement.programId || requirement.practiceType !== existingRequirement.practiceType) throw new Error('Требование не найдено');
  if (!Number.isInteger(requirement.minHours) || requirement.minHours < 1 || requirement.minHours > 1000 || !requirement.requiredDocuments.length
    || new Set(requirement.requiredDocuments).size !== requirement.requiredDocuments.length
    || requirement.requiredDocuments.some(t => !['agreement', 'direction', 'assignment'].includes(t))) throw new Error('Проверьте объём и обязательные начальные документы');
  const completionRule = text(requirement.completionRule, 'Условие завершения', 600);
  return cTxn(
    state,
    'requirement.version',
    requirement.id,
    (_, changes) => {
      changes.requirements = changes.requirements.filter(candidateRequirement => candidateRequirement.id !== requirement.id);
      changes.requirements.push({
        ...requirement,
        completionRule,
        version: existingRequirement.version + 1,
        updatedAt: at(state)
      });
    }
  );
}
const allowedFields = [
  'student',
  'university',
  'company',
  'practiceType',
  'period',
  'hours',
  'tasks',
  'companySupervisor',
  'universitySupervisor',
  'notes',
  'report',
  'generatedAt'
];
export function validateTemplate(template: Template) {
  text(template.body, 'Текст шаблона', 3000);
  if (!template.fields.length || template.fields.some(f => !allowedFields.includes(f))
    || new Set(template.fields).size !== template.fields.length) throw new Error('Выберите разрешённые поля');
  const tokens = [...template.body.matchAll(/\{\{([^{}]+)\}\}/g)].map(m => m[1]);
  if (template.type !== 'report' && (template.fields.includes('report') || tokens.includes('report'))) throw new Error('Поле отчёта доступно только итоговому шаблону');
  if (tokens.some(t => !allowedFields.includes(t))) throw new Error('Шаблон содержит неизвестную переменную');
  if (template.body.replace(/\{\{[^{}]+\}\}/g, '').includes('{{')) throw new Error('Некорректная переменная шаблона');
}
export function saveTemplate(state: Envelope, template: Template) {
  role(state, 'coordinator');
  validateTemplate(template);
  const existingTemplate = currentTemplates(state).find(candidateTemplate => candidateTemplate.id === template.id);
  if (!existingTemplate || existingTemplate.type !== template.type) throw new Error('Шаблон не найден');
  return cTxn(
    state,
    'template.version',
    template.id,
    (_, changes) => {
      changes.templates = changes.templates.filter(candidateTemplate => candidateTemplate.id !== template.id);
      changes.templates.push({
        ...template,
        version: existingTemplate.version + 1,
        updatedAt: at(state)
      });
    }
  );
}
export function saveUniversity(state: Envelope, description: string) {
  role(state, 'coordinator');
  return cTxn(
    state,
    'university.updated',
    'university_mgsu_demo',
    (_, changes) => {
      changes.universityDescription = text(description, 'Описание вуза', 1200);
    }
  );
}
export function saveProgram(
  state: Envelope,
  programId: string,
  name: string,
  skills: string[],
  group: string
) {
  role(state, 'coordinator');
  if (!dataFor(state).programs.some(p => p.id === programId) || skills.length > 16
    || skills.some(t => t.length > 80 || !t.trim())) throw new Error('Программа или учебные навыки некорректны');
  return cTxn(
    state,
    'program.updated',
    programId,
    (_, changes) => {
      changes.programs[programId] = {
        name: text(name, 'Название', 160),
        skills,
        group: text(group, 'Группа', 80)
      };
    }
  );
}
export const importExample = JSON.stringify(
  {
    demoOnly: true,
    students: [
      {
        externalId: 'sample_01',
        name: 'Учебный студент — демо',
        programId: 'ПТО',
        course: 3,
        group: 'ДЕМО-31',
        skills: ['Таблицы'],
        disciplines: [{ name: 'Организация строительства', result: 'Зачёт' }]
      }
    ]
  },
  null,
  2
);
export const importBadExample = JSON.stringify(
  {
    demoOnly: true,
    students: [
      {
        externalId: 'bad_01',
        name: 'Ошибка — демо',
        programId: 'Неизвестная программа',
        course: 9,
        group: 'ДЕМО',
        skills: [],
        disciplines: []
      },
      {
        externalId: 'sample_02',
        name: 'Допустимый — демо',
        programId: 'BIM/ТИМ',
        course: 3,
        group: 'ДЕМО-32',
        skills: ['Моделирование'],
        disciplines: [{ name: 'Учебная модель', result: 'Зачёт' }]
      }
    ]
  },
  null,
  2
);
export function previewImport(state: Envelope, raw: string) {
  role(state, 'coordinator');
  if (new TextEncoder().encode(raw).length > 100 * 1024) throw new Error('Учебный JSON: не более 100 KiB');
  let packet;
  try {
    packet = JSON.parse(raw);
  } catch {
    throw new Error('Некорректный JSON: проверьте формат');
  }
  ;
  if (packet?.demoOnly !== true || !Array.isArray(packet.students) || packet.students.length < 1
    || packet.students.length > 100) throw new Error('Нужны demoOnly:true и 1–100 учебных строк');
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const r of packet.students) {
    if (seen.has(r?.externalId)) duplicates.add(r.externalId);
    seen.add(r?.externalId);
  }
  const rows: ImportBatch['rows'] = packet.students.map((r: Record<string, unknown>, index: number) => {
    const errors: string[] = [];
    if (!r || typeof r !== 'object') return {
      index,
      row: null,
      errors: ['Строка должна быть объектом']
    };
    if (typeof r.externalId !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(r.externalId)) errors.push('Некорректный внешний демо-ID');
    if (duplicates.has(String(r.externalId))) errors.push('Повтор внешнего ID в файле');
    if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 160) errors.push('Проверьте вымышленное имя');
    if (!dataFor(state).programs.some(p => p.id === r.programId)) errors.push('Неизвестная программа');
    if (!Number.isInteger(r.course) || Number(r.course) < 1 || Number(r.course) > 4) errors.push('Курс: 1–4');
    if (typeof r.group !== 'string' || !r.group.trim() || r.group.length > 80) errors.push('Проверьте группу');
    if (r.universityId !== undefined && r.universityId !== 'university_mgsu_demo') errors.push('В демо только МГСУ');
    if (!Array.isArray(r.skills) || r.skills.length > 16 || r.skills.some(t => typeof t !== 'string' || t.length > 80)) errors.push('Проверьте учебные навыки');
    if (!Array.isArray(r.disciplines) || !r.disciplines.length || r.disciplines.length > 20
      || r.disciplines.some(d => !d || typeof d.name !== 'string' || typeof d.result !== 'string' || d.name.length > 160 || d.result.length > 160)) errors.push('Проверьте дисциплины/результаты');
    return {
      index,
      row: errors.length ? null : r as unknown as ImportRow,
      errors
    };
  });
  return cTxn(
    state,
    'import.preview',
    'mgsu_demo',
    (_, changes) => {
      changes.batches.push({
        ...entity(state, 'batch'),
        rows,
        status: rows.every(r => r.errors.length) ? 'invalid' : 'ready',
        appliedIds: []
      });
    }
  );
}
export function applyImport(
  state: Envelope,
  batchId: string,
  confirmed: boolean
) {
  role(state, 'coordinator');
  if (!confirmed) throw new Error('Подтвердите применение допустимых строк');
  const batch = cState(state).batches.find(candidateImportBatch => candidateImportBatch.id === batchId);
  if (!batch || batch.status === 'invalid') throw new Error('Нет допустимых строк');
  if (batch.status === 'applied') return state;
  return cTxn(
    state,
    'import.applied',
    batchId,
    (_, changes) => {
      const applied: string[] = [];
      for (const entry of batch.rows) {
        const importRow = entry.row;
        if (!importRow) continue;
        const studentId = 'student_import_' + importRow.externalId;
        const recordId = 'education_import_' + importRow.externalId;
        const existingStudent = changes.importedProfiles[studentId];
        changes.importedProfiles[studentId] = {
          id: studentId,
          version: (existingStudent?.version ?? 0) + 1,
          createdAt: existingStudent?.createdAt ?? at(state),
          updatedAt: at(state),
          name: importRow.name,
          programId: importRow.programId,
          course: importRow.course,
          group: importRow.group,
          universityId: 'university_mgsu_demo',
          region: 'Москва',
          availability: ['2026-11-02', '2026-11-27'],
          skills: importRow.skills,
          interests: '',
          schedule: 'Полный день',
          relocate: false,
          visibility: 'visible'
        };
        const education = changes.importedEducation[recordId];
        changes.importedEducation[recordId] = {
          id: recordId,
          version: (education?.version ?? 0) + 1,
          createdAt: education?.createdAt ?? at(state),
          updatedAt: at(state),
          studentId,
          source: 'university_demo',
          sourceDate: state.demoClock,
          disciplines: importRow.disciplines,
          skills: importRow.skills,
          history: [...(education?.history ?? [])]
        };
        applied.push(studentId);
      }
      const importBatch = changes.batches.find(candidateImportBatch => candidateImportBatch.id === batchId)!;
      importBatch.status = 'applied';
      importBatch.appliedIds = applied;
      importBatch.version++;
    }
  );
}
export function ticketAccess(state: Envelope, ticketId: string) {
  const ticket = cState(state).tickets.find(candidateTicket => candidateTicket.id === ticketId);
  if (!ticket || ticket.authorId !== state.activePersonaId && activeActor(state).role !== 'operator') throw new Error('Обращение недоступно');
  return ticket;
}
export function createTicket(
  state: Envelope,
  category: string,
  body: string,
  objectType: Ticket['objectType'] = 'none',
  objectId = ''
) {
  const message = text(body, 'Обращение', 2000);
  if (!['Данные', 'Практика', 'Поддержка', 'Нарушение'].includes(category)) throw new Error('Выберите категорию');
  const data = dataFor(state);
  const persona = activeActor(state);
  if (objectType === 'offer' && !data.offers.some(candidateOffer => candidateOffer.id === objectId)
    || objectType === 'company' && !data.companies.some(candidateCompany => candidateCompany.id === objectId)
    || objectType === 'education'
    && !data.education.some(candidateEducation => candidateEducation.id === objectId && (persona.role === 'coordinator' || candidateEducation.studentId === persona.studentId))) throw new Error('Связанный объект недоступен');
  return cTxn(
    state,
    'ticket.created',
    objectId,
    (
      next,
      changes,
      event
    ) => {
      const ticket: Ticket = {
        ...entity(state, 'ticket'),
        authorId: state.activePersonaId,
        category,
        objectType,
        objectId,
        status: 'open',
        comments: [{
          actorId: state.activePersonaId,
          text: message,
          at: at(state)
        }]
      };
      changes.tickets.push(ticket);
      notify(next, event, 'operator_demo', 'Создано обращение', '/support/' + ticket.id);
    }
  );
}
export function replyTicket(
  state: Envelope,
  ticketId: string,
  body: string,
  status: Ticket['status']
) {
  const originalTicket = ticketAccess(state, ticketId);
  const persona = activeActor(state);
  const message = text(body, 'Ответ', 2000);
  if (persona.role !== 'operator' && status !== originalTicket.status && !(originalTicket.status === 'resolved' && status === 'closed')
    && !(originalTicket.status === 'closed' && status === 'open')) throw new Error('Автор может закрыть решённое обращение или открыть его повторно');
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) throw new Error('Некорректный статус');
  return cTxn(
    state,
    'ticket.replied',
    ticketId,
    (
      next,
      changes,
      event
    ) => {
      const ticket = changes.tickets.find(candidateTicket => candidateTicket.id === ticketId)!;
      ticket.status = status;
      ticket.version++;
      ticket.updatedAt = at(state);
      ticket.comments.push({
        actorId: state.activePersonaId,
        text: message,
        at: at(state)
      });
      notify(
        next,
        event,
        persona.role === 'operator' ? originalTicket.authorId : 'operator_demo',
        'Ответ в обращении',
        '/support/' + ticketId
      );
    }
  );
}
export function hideReportedOffer(
  state: Envelope,
  ticketId: string,
  reason: string
) {
  role(state, 'operator');
  const originalTicket = ticketAccess(state, ticketId);
  const offer = dataFor(state).offers.find(candidateOffer => candidateOffer.id === originalTicket.objectId);
  if (originalTicket.objectType !== 'offer' || !offer) throw new Error('Нет связанного предложения для скрытия');
  const message = text(reason, 'Причина скрытия', 600);
  return cTxn(
    state,
    'offer.hidden',
    offer.id,
    (
      next,
      changes,
      event
    ) => {
      next.changes.b2!.offers[offer.id] = {
        ...offer,
        status: 'archived',
        moderationReason: message,
        version: offer.version + 1
      };
      const ticket = changes.tickets.find(candidateTicket => candidateTicket.id === ticketId)!;
      ticket.comments.push({
        actorId: state.activePersonaId,
        text: 'Предложение скрыто: ' + message,
        at: at(state)
      });
      ticket.status = 'resolved';
      ticket.version++;
      notify(next, event, originalTicket.authorId, 'По обращению скрыто предложение', '/support/' + ticketId);
    }
  );
}
export function configureTeam(
  state: Envelope,
  personaId: string,
  subrole: Subrole,
  offerIds: string[]
) {
  role(state, 'employer');
  assertEmployer(state, 'team');
  const p = dataFor(state).personas.find(p => p.id === personaId);
  if (!p || p.role !== 'employer' || p.organizationId !== activeActor(state).organizationId
    || personaId === 'employer_sever_demo') throw new Error('Выберите тестового сотрудника своей компании; основной администратор сохраняет вход');
  if (!['owner', 'recruiter', 'manager', 'documents'].includes(subrole)
    || offerIds.some(id => !dataFor(state).offers.some(candidateOffer => candidateOffer.id === id && candidateOffer.companyId === p.organizationId))) throw new Error('Подроль или назначения некорректны');
  return cTxn(state, 'team.updated', personaId, (_, changes) => {
    changes.team[personaId] = { subrole, offerIds };
  });
}
export function configureUser(
  state: Envelope,
  personaId: string,
  active: boolean
) {
  role(state, 'operator');
  const p = dataFor(state).personas.find(p => p.id === personaId);
  if (!p || personaId === 'operator_demo') throw new Error('Оператор остаётся доступен для восстановления');
  return cTxn(
    state,
    'user.status',
    personaId,
    (_, changes) => {
      changes.inactive = changes.inactive.filter(id => id !== personaId);
      if (!active) changes.inactive.push(personaId);
    }
  );
}
export function addDictionary(state: Envelope, v: Pick<Dictionary, 'category' | 'name' | 'tasks' | 'programId' | 'skillIds'>) {
  role(state, 'operator');
  const name = text(v.name, 'Название', 100);
  if (!['direction', 'skill', 'profession'].includes(v.category)
    || dictionaries(state).some(candidateEntry => candidateEntry.category === v.category && candidateEntry.name === name)
    || v.skillIds.some(id => !dictionaries(state).some(candidateEntry => candidateEntry.id === id && candidateEntry.category === 'skill'))) throw new Error('Категория, навыки или название некорректны');
  return cTxn(
    state,
    'dictionary.added',
    name,
    (_, changes) => {
      changes.dictionaries.push({
        ...entity(state, 'dictionary'),
        ...v,
        name,
        tasks: text(v.tasks, 'Описание задач', 600),
        active: true
      });
    }
  );
}
export function setDictionaryActive(
  state: Envelope,
  dictId: string,
  active: boolean
) {
  role(state, 'operator');
  const entry = dictionaries(state).find(candidateEntry => candidateEntry.id === dictId);
  if (!entry) throw new Error('Элемент не найден');
  return cTxn(
    state,
    'dictionary.status',
    dictId,
    (_, changes) => {
      changes.dictionaries = changes.dictionaries.filter(candidateEntry => candidateEntry.id !== dictId);
      changes.dictionaries.push({
        ...entry,
        active,
        version: entry.version + 1
      });
    }
  );
}
export function saveContent(
  state: Envelope,
  key: string,
  value: string
) {
  role(state, 'operator');
  if (!['help', 'for-employers', 'for-universities', 'how-it-works'].includes(key)) throw new Error('Статья не найдена');
  return cTxn(state, 'content.updated', key, (_, changes) => {
    changes.content[key] = text(value, 'Справочная статья', 3000);
  });
}
export function reviewAi(
  state: Envelope,
  exampleId: string,
  verdict: 'approved' | 'needs_revision',
  comment: string
) {
  role(state, 'operator');
  const e = aiExamples(state).find(e => e.id === exampleId);
  if (!e) throw new Error('Пример не найден');
  const reason = text(comment, 'Обоснование оценки', 600);
  return cTxn(
    state,
    'ai.reviewed',
    exampleId,
    (_, changes) => {
      changes.aiExamples = changes.aiExamples.filter(x => x.id !== exampleId);
      changes.aiExamples.push({
        ...e,
        verdict,
        comment: reason,
        version: e.version + 1
      });
    }
  );
}
export function setNotificationSettings(state: Envelope, recommendations: boolean) {
  return cTxn(
    state,
    'notifications.settings',
    state.activePersonaId,
    (_, changes) => {
      changes.notificationSettings[state.activePersonaId] = { recommendations };
    }
  );
}
export function checkIntegration(state: Envelope, success: boolean) {
  role(state, 'operator');
  return cTxn(
    state,
    'integration.simulated',
    'mgsu_demo',
    (_, changes) => {
      changes.integrationChecks.push({
        id: id('check'),
        at: at(state),
        success,
        message: success
          ? 'Имитация: тестовый адаптер завершил проверку. Внешних запросов нет.'
          : 'Имитация: контрольная ошибка соединения. Внешних запросов нет.'
      });
      changes.integrationChecks = changes.integrationChecks.slice(-1000);
    }
  );
}
