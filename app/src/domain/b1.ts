import { withDemoPatronymic } from './personName';
import { validProfessional } from './profile-details';
import type { ProfessionalProfile } from './profile-details';
import { activeActor } from './access';
import { cState } from './c-types';
import type { Organization } from './b2-types';
import { seedCases, seedDocuments, seedTasks, seedInvitations, enrichedOffer } from '../data/b2-seed';
import { emptyB2 } from './b2-types';
import { seed } from '../data/seed';
import type { Envelope, Entity, Offer } from './types';
import { emptyB1 } from './b1-types';
import type { Profile, Education, Project, Resume, SentApplication, B1Changes, Correction } from './b1-types';
export const b1 = (state: Envelope) => state.changes.b1 ?? emptyB1();
export function dataFor(state: Envelope) {
  const changes = b1(state), b2 = state.changes.b2 ?? emptyB2();

  return {
    ...seed,

    personas: seed.personas.map(candidatePersona => withDemoPatronymic({ ...candidatePersona, active: !cState(state).inactive.includes(candidatePersona.id) })),

    universities: seed.universities.map(u => ({ ...u, description: cState(state).universityDescription })),

    programs: seed.programs.map(candidateProgram => ({
      ...candidateProgram,
      name: cState(state).programs[candidateProgram.id]?.name ?? candidateProgram.name,
      skillIds: cState(state).programs[candidateProgram.id]?.skills ?? candidateProgram.skillIds,
      group: cState(state).programs[candidateProgram.id]?.group ?? 'Учебная группа'
    })),

    companies: merge(seed.companies.map((candidateCompany): Organization => ({ ...candidateCompany, description: 'Вымышленная строительная компания' })), b2.companies),

    offers: merge(seed.offers.map(enrichedOffer), b2.offers),

    practices: merge(seedCases, b2.practices),

    documents: merge(seedDocuments, Object.fromEntries(b2.documents.map(candidateDocument => [candidateDocument.id, candidateDocument]))),

    tasks: merge(seedTasks, Object.fromEntries(b2.tasks.map(candidateTask => [candidateTask.id, candidateTask]))),

    invitations: merge(seedInvitations, Object.fromEntries(b2.invitations.map(candidateInvitation => [candidateInvitation.id, candidateInvitation]))),

    messages: b2.messages,

    students: [...seed.students.map((leftStudent, i): Profile => ({
      ...leftStudent,
      schedule: 'Полный день',
      relocate: false,
      visibility: 'visible',
      ...(changes.profiles[leftStudent.id] as Partial<Profile> | undefined),
      group: cState(state).programs[leftStudent.programId]?.group ?? changes.profiles[leftStudent.id]?.group ?? 'Учебная группа',
      interests: state.changes.interests[leftStudent.id] ?? changes.profiles[leftStudent.id]?.interests ?? leftStudent.interests,
      ...(i === 11 && !changes.profiles[leftStudent.id] ? { region: '', schedule: '' } : {})
    })), ...Object.values(cState(state).importedProfiles)].map(withDemoPatronymic),

    education: [...seed.education.map((leftEducation, i): Education => ({
      ...leftEducation,
      skills: seed.students[i].skills,
      history: [],
      ...(changes.education[leftEducation.id] as Partial<Education> | undefined)
    })), ...Object.values(cState(state).importedEducation)],

    projects: merge(seed.projects.map(p => ({
      ...p,
      task: 'Планирование учебного строительного объекта',
      tools: seed.students.find(candidateStudent => candidateStudent.id === p.studentId)!.skills,
      outcome: 'Учебная схема и пояснительная записка',
      source: 'university_demo' as const,
      programId: seed.students.find(candidateStudent => candidateStudent.id === p.studentId)!.programId
    })), changes.projects),

    resumes: merge<Resume>(seed.resumes.map((r, i) => ({
      ...r,
      target: seed.students.find(candidateStudent => candidateStudent.id === r.studentId)!.programId,
      projectIds: seed.projects.filter(p => p.studentId === r.studentId).map(p => p.id),
      skillClaims: [],
      status: 'ready' as const,
      primary: i < 12,
      origin: 'student' as const
    })), changes.resumes),

    applications: merge(seed.applications.map(candidateApplication => ({
      ...candidateApplication, offerResponse: merge(seedCases, b2.practices).some(candidatePractice => candidatePractice.applicationId === candidateApplication.id)
        ? 'accepted' as const
        : candidateApplication.selectionStatus === 'offered' ? 'pending' as const : 'none' as const
    })) as SentApplication[], Object.fromEntries(changes.applications.map(candidateApplication => [candidateApplication.id, candidateApplication])))

  };
}
function merge<T extends Entity>(base: T[], changed: Record<string, T>): T[] {
  return [...base.map(item => changed[item.id] ?? item), ...Object.values(changed).filter(item => !base.some(e => e.id === item.id))]
}
const at = (state: Envelope) => state.demoClock + 'T12:00:00.000Z';
const id = (prefix: string) => prefix + '_' + crypto.randomUUID();
function entity(state: Envelope, prefix: string): Entity {
  return {
    id: id(prefix),
    version: 1,
    createdAt: at(state),
    updatedAt: at(state)
  }
}
function actor(state: Envelope) {
  return activeActor(state)
}
function studentActor(state: Envelope) {
  const persona = actor(state);
  if (persona.role !== 'student' || !persona.studentId) throw new Error('Действие доступно только студенту');
  return persona.studentId
}
function text(value: string, label: string, max = 1200, required = true) {
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) throw new Error(`${label}: ${required ? 'заполните поле, ' : ''}не более ${max} символов`);
  return value.trim()
}
function update(state: Envelope, mutate: (next: Envelope, changes: B1Changes) => void, type: string, ref: string): Envelope {
  const next = structuredClone(state);
  next.changes.b1 = structuredClone(b1(state));
  next.revision++;

  mutate(next, next.changes.b1);

  next.changes.b1.events.push({
    id: id('event'),
    actorId: state.activePersonaId,
    type,
    objectRef: ref,
    at: at(state),
    origin: 'visitor'
  });

  return next;
}
function notify(state: Envelope, to: string, message: string, target: string) {
  state.changes.notifications.push({
    ...entity(state, 'notification'),
    recipientId: to,
    text: message,
    target,
    read: false
  })
}
export function saveProfile(state: Envelope, values: Pick<Profile, 'region' | 'availability' | 'schedule' | 'relocate' | 'visibility'>) {
  const studentId = studentActor(state);
  const profile = dataFor(state).students.find(candidateStudent => candidateStudent.id === studentId)!;
  if (values.availability.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d))
    || new Date(d).toISOString().slice(0, 10) !== d)
    || values.availability[0] > values.availability[1]) throw new Error('Укажите корректный период доступности');
  if (!['Полный день', 'Гибкий график', ''].includes(values.schedule)
    || !['visible', 'hidden'].includes(values.visibility)
    || typeof values.relocate !== 'boolean') throw new Error('Некорректные условия профиля');
  return update(
    state,
    (_, changes) => {
      changes.profiles[studentId] = {
        ...profile,
        ...values,
        region: text(values.region, 'Регион', 100, false),
        version: profile.version + 1,
        updatedAt: at(state)
      }
    },
    'profile.updated',
    studentId
  )
}
export function saveProject(state: Envelope, project: Project) {
  const studentId = studentActor(state);
  const existing = dataFor(state).projects.find(candidateProject => candidateProject.id === project.id);
  if (project.studentId !== studentId || existing && existing.studentId !== studentId) throw new Error('Недоступен чужой проект');
  if (existing?.source === 'university_demo') throw new Error('Учебный проект из источника вуза доступен только для чтения. Создайте собственное описание.');
  const item = {
    ...project,
    title: text(project.title, 'Название', 160),
    task: text(project.task, 'Задача'),
    contribution: text(project.contribution, 'Личный вклад'),
    outcome: text(project.outcome, 'Результат'),
    tools: project.tools.map(t => text(t, 'Инструмент', 80)),
    source: 'student' as const,
    version: (existing?.version ?? 0) + 1,
    updatedAt: at(state)
  };
  if (item.tools.length > 12) throw new Error('Не более 12 инструментов');
  return update(state, (_, changes) => {
    changes.projects[project.id] = item
  }, 'project.saved', project.id)
}
export function newProject(state: Envelope): Project {
  return {
    ...entity(state, 'project'),
    studentId: studentActor(state),
    title: '',
    task: '',
    contribution: '',
    tools: [],
    outcome: '',
    source: 'student',
    programId: dataFor(state).students.find(candidateStudent => candidateStudent.id === studentActor(state))!.programId
  }
}
export function createResume(state: Envelope) {
  const studentId = studentActor(state);
  const resume: Resume = {
    ...entity(state, 'resume'),
    studentId,
    title: 'Новое резюме',
    target: 'ПТО',
    summary: '',
    projectIds: [],
    skillClaims: [],
    status: 'draft',
    primary: false,
    origin: 'student'
  };
  return {
    state: update(state, (_, changes) => {
      changes.resumes[resume.id] = resume
    }, 'resume.created', resume.id), id: resume.id
  }
}
export function saveResume(state: Envelope, resume: Resume) {
  const studentId = studentActor(state), data = dataFor(state), existing = data.resumes.find(candidateResume => candidateResume.id === resume.id);
  if (!existing || existing.studentId !== studentId || resume.studentId !== studentId) throw new Error('Резюме недоступно');
  if (!['draft', 'ready'].includes(resume.status)
    || !['ПТО', 'BIM/ТИМ', 'Сметное дело', 'Проектирование'].includes(resume.target)) throw new Error('Укажите траекторию и статус');
  if (resume.projectIds.some(id => !data.projects.some(candidateProject => candidateProject.id === id && candidateProject.studentId === studentId))) throw new Error('Можно включить только свои проекты');
  if (resume.skillClaims.length > 12 || resume.projectIds.length > 12) throw new Error('Не более 12 навыков и проектов');
  const item = {
    ...resume,
    title: text(resume.title, 'Название', 160),
    summary: text(resume.summary, 'Самоописание', 3000, resume.status === 'ready'),
    ...(resume.experienceSummary === undefined
      ? {}
      : { experienceSummary: text(resume.experienceSummary, 'Учебный опыт', 3000, false) }),
    skillClaims: resume.skillClaims.map(t => text(t, 'Навык', 80)),
    version: existing.version + 1,
    updatedAt: at(state)
  };
  return update(state, (_, changes) => {
    changes.resumes[resume.id] = item
  }, 'resume.saved', resume.id)
}
export function primaryResume(state: Envelope, resumeId: string) {
  const studentId = studentActor(state), list = dataFor(state).resumes.filter(candidateResume => candidateResume.studentId === studentId);
  if (!list.some(candidateResume => candidateResume.id === resumeId)) throw new Error('Резюме недоступно');
  return update(
    state,
    (_, changes) => {
      list.forEach(candidateResume => {
        changes.resumes[candidateResume.id] = {
          ...candidateResume,
          primary: candidateResume.id === resumeId,
          version: candidateResume.version + 1,
          updatedAt: at(state)
        }
      })
    },
    'resume.primary',
    resumeId
  )
}
export const correctionFields = (candidateEducation: Education) => candidateEducation.disciplines.flatMap((d, i) => [{ path: `disciplines.${i}.name`, label: `Дисциплина: ${d.name}` }, { path: `disciplines.${i}.result`, label: `Результат: ${d.name}` }]);
export function fieldValue(education: Education, path: string) {
  const m = /^disciplines\.(\d+)\.(name|result)$/.exec(path);
  if (!m || !education.disciplines[Number(m[1])]) throw new Error('Неизвестное образовательное поле');
  return education.disciplines[Number(m[1])][m[2] as 'name' | 'result']
}
function applyField(education: Education, path: string, value: string) {
  fieldValue(education, path);
  const [, index, key] = path.split('.');
  education.disciplines[Number(index)][key as 'name' | 'result'] = value
}
export function requestCorrection(state: Envelope, path: string, value: string, reason: string) {
  const studentId = studentActor(state), education = dataFor(state).education.find(candidateEducation => candidateEducation.studentId === studentId)!;
  const oldValue = fieldValue(education, path);
  if (b1(state).corrections.some(candidateCorrectionRequest => candidateCorrectionRequest.recordId === education.id && candidateCorrectionRequest.fieldPath === path
    && candidateCorrectionRequest.status === 'pending')) throw new Error('Запрос по этому полю уже ожидает решения');
  const proposedValue = text(value, 'Предложенное значение', 160);
  if (oldValue === proposedValue) throw new Error('Новое значение совпадает с текущим');
  const correctionRequest: Correction = {
    ...entity(state, 'correction'),
    studentId,
    recordId: education.id,
    fieldPath: path,
    oldValue,
    recordVersion: education.version,
    proposedValue,
    reason: text(reason, 'Причина', 600),
    status: 'pending'
  };
  return update(
    state,
    (next, changes) => {
      changes.corrections.push(correctionRequest);
      notify(
        next,
        'coordinator_mgsu_demo',
        'Новый запрос исправления образовательных сведений',
        '/university/students/' + studentId
      )
    },
    'education.requested',
    correctionRequest.id
  )
}
export function resolveCorrection(state: Envelope, requestId: string, approved: boolean, reason: string) {
  const persona = actor(state);
  if (persona.role !== 'coordinator' || persona.organizationId !== 'university_mgsu_demo') throw new Error('Решение доступно координатору МГСУ');
  const correctionRequest = b1(state).corrections.find(candidateCorrectionRequest => candidateCorrectionRequest.id === requestId);
  if (!correctionRequest || correctionRequest.status !== 'pending') throw new Error('Запрос уже рассмотрен или не найден');
  const data = dataFor(state), education = data.education.find(candidateEducation => candidateEducation.id === correctionRequest.recordId)!, student = data.students.find(candidateStudent => candidateStudent.id === correctionRequest.studentId);
  if (student?.universityId !== persona.organizationId) throw new Error('Чужой вуз');
  if (approved && fieldValue(education, correctionRequest.fieldPath) !== correctionRequest.oldValue) throw new Error('Поле уже изменилось. Отклоните устаревший запрос с пояснением.');
  const resolution = text(reason, 'Пояснение решения', 600);
  return update(
    state,
    (next, changes) => {
      const request = changes.corrections.find(candidateCorrectionRequest => candidateCorrectionRequest.id === requestId)!;
      request.status = approved ? 'approved' : 'rejected';
      request.resolution = resolution;
      request.version++;
      request.updatedAt = at(state);
      if (approved) {
        const record = structuredClone(education);
        applyField(record, correctionRequest.fieldPath, correctionRequest.proposedValue);
        record.version++;
        record.updatedAt = at(state);
        record.history.push({
          requestId,
          fieldPath: correctionRequest.fieldPath,
          oldValue: correctionRequest.oldValue,
          newValue: correctionRequest.proposedValue,
          at: at(state),
          resolution
        });
        changes.education[education.id] = record
      }
      const recipient = seed.personas.find(candidatePersona => candidatePersona.studentId === correctionRequest.studentId)?.id;
      if (recipient) notify(
        next,
        recipient,
        approved ? 'Исправление образовательных сведений принято' : 'Запрос исправления отклонён',
        '/student/education/history'
      )
    },
    'education.resolved',
    correctionRequest.id
  )
}
export function isPublic(offer: Offer, state?: Envelope) {
  return offer.status === 'published'
    && (state ? dataFor(state).companies : seed.companies).find(candidateCompany => candidateCompany.id === offer.companyId)?.status === 'approved'
}
export function submitApplication(state: Envelope, offerId: string, resumeId: string, consent: boolean) {
  const studentId = studentActor(state), data = dataFor(state), offer = data.offers.find(candidateOffer => candidateOffer.id === offerId), resume = data.resumes.find(candidateResume => candidateResume.id === resumeId);
  const existing = data.applications.find(candidateApplication => candidateApplication.studentId === studentId && candidateApplication.offerId === offerId
    && !['rejected', 'withdrawn'].includes(candidateApplication.selectionStatus));
  if (existing) return { state: state, id: existing.id };
  if (!offer || !isPublic(offer, state)) throw new Error('Предложение недоступно');
  if (offer.endDate < state.demoClock) throw new Error('Набор завершён. Новый отклик недоступен');
  if (offer.kind === 'practice'
    && offer.capacity - data.practices.filter(candidatePractice => candidatePractice.offerId === offerId && candidatePractice.reservationActive).length <= 0) throw new Error('Свободных мест нет');
  if (!resume || resume.studentId !== studentId || resume.status !== 'ready') throw new Error('Выберите готовое собственное резюме');
  if (!consent) throw new Error('Подтвердите передачу выбранного резюме');
  const application: SentApplication = {
    ...entity(state, 'application'),
    studentId,
    offerId,
    selectionStatus: 'submitted',
    offerResponse: 'none',
    resumeId,
    resumeSnapshot: structuredClone(resume),
    educationSnapshot: structuredClone(data.education.find(candidateEducation => candidateEducation.studentId === studentId)!),
    projectSnapshot: structuredClone(data.projects.filter(candidateProject => resume.projectIds.includes(candidateProject.id))),
    history: [{ at: at(state), text: 'Студент направил отклик и выбранную версию резюме' }]
  };
  return {
    state: update(
      state,
      (next, changes) => {
        changes.applications.push(application);
        const employer = seed.personas.find(candidatePersona => candidatePersona.role === 'employer' && candidatePersona.organizationId === offer.companyId);
        if (employer) notify(next, employer.id, 'Новый отклик на ' + offer.title, '/employer/applications/' + application.id);
        notify(next, state.activePersonaId, 'Отклик отправлен: ' + offer.title, '/student/applications/' + application.id)
      },
      'application.submitted',
      application.id
    ), id: application.id
  }
}
export function withdrawApplication(state: Envelope, id: string) {
  const studentId = studentActor(state), application = dataFor(state).applications.find(candidateApplication => candidateApplication.id === id);
  if (!application || application.studentId !== studentId) throw new Error('Отклик недоступен');
  if (['withdrawn', 'rejected'].includes(application.selectionStatus)
    || application.offerResponse === 'accepted'
    || dataFor(state).practices.some(candidatePractice => candidatePractice.applicationId === application.id)) throw new Error('Отклик нельзя отозвать');
  return update(
    state,
    (next, changes) => {
      changes.applications = changes.applications.filter(candidateApplication => candidateApplication.id !== id);
      changes.applications.push({
        ...application,
        version: application.version + 1,
        updatedAt: at(state),
        selectionStatus: 'withdrawn',
        history: [...(application.history ?? []), { at: at(state), text: 'Студент отозвал отклик' }]
      });
      const companyId = dataFor(state).offers.find(candidateOffer => candidateOffer.id === application.offerId)!.companyId;
      const employer = seed.personas.find(candidatePersona => candidatePersona.organizationId === companyId && candidatePersona.role === 'employer');
      if (employer) notify(next, employer.id, 'Студент отозвал отклик', '/employer/applications/' + id)
    },
    'application.withdrawn',
    id
  )
}
export function favoriteIds(state: Envelope) {
  return state.changes.favoritesByUser?.[state.activePersonaId] ?? []
}
export function toggleFavorite(state: Envelope, offerId: string) {
  studentActor(state);
  const list = favoriteIds(state);
  if (!list.includes(offerId)
    && !dataFor(state).offers.some(candidateOffer => candidateOffer.id === offerId && isPublic(candidateOffer, state))) throw new Error('Предложение недоступно');
  return update(
    state,
    next => {
      next.changes.favoritesByUser ??= {};
      next.changes.favoritesByUser[state.activePersonaId] = list.includes(offerId) ? list.filter(id => id !== offerId) : [...list, offerId]
    },
    'favorite.toggled',
    offerId
  )
}
export function saveSearch(state: Envelope, url: string, title: string) {
  studentActor(state);
  if (!/^\/(practices|jobs)(\?|$)/.test(url) || url.length > 2000) throw new Error('Некорректный поисковый запрос');
  if (b1(state).searches.some(q => q.userId === state.activePersonaId && q.url === url)) return state;
  return update(
    state,
    (_, changes) => {
      changes.searches.push({
        id: id('search'),
        userId: state.activePersonaId,
        url,
        title: text(title, 'Название поиска', 160)
      })
    },
    'search.saved',
    url
  )
}
export function deleteSearch(state: Envelope, id: string) {
  studentActor(state);
  return update(
    state,
    (_, changes) => {
      changes.searches = changes.searches.filter(q => !(q.id === id && q.userId === state.activePersonaId))
    },
    'search.deleted',
    id
  )
}
export function rememberSearch(state: Envelope, path: string, url: string) {
  return update(state, (_, changes) => {
    changes.lastSearch[path] = url
  }, 'search.changed', path)
}
export function markNotification(state: Envelope, id: string) {
  return update(
    state,
    next => {
      const notification = next.changes.notifications.find(candidateNotification => candidateNotification.id === id && candidateNotification.recipientId === state.activePersonaId);
      if (!notification) throw new Error('Уведомление недоступно');
      notification.read = true
    },
    'notification.read',
    id
  )
}









export function saveProfessional(state: Envelope, details: ProfessionalProfile) {
  const studentId = studentActor(state), profile = dataFor(state).students.find(candidateStudent => candidateStudent.id === studentId)!;

  if (!validProfessional(details)) throw new Error('Проверьте поля: даты, email, обязательные названия и ограничения длины.');

  return update(
    state,
    (_, changes) => {
      changes.profiles[studentId] = {
        ...profile,
        professional: structuredClone(details),
        version: profile.version + 1,
        updatedAt: at(state)
      }
    },
    'profile.professional.updated',
    studentId
  );
}
