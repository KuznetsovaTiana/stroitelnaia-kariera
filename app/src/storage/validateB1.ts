import { validProfessional } from '../domain/profile-details';
import { seed } from '../data/seed';
import type { B1Changes } from '../domain/b1-types';
// Validate persisted collections before they reach forms or domain operations.
export function validB1(value: unknown): value is B1Changes {
  const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const str = (v: unknown, max = 4000): v is string => typeof v === 'string' && v.length <= max;
  const strings = (candidateValue: unknown) => Array.isArray(candidateValue) && candidateValue.length <= 100 && candidateValue.every(candidateRecord => str(candidateRecord));
  const list = (candidateValue: unknown, test: (candidateRecord: Record<string, unknown>) => boolean) => Array.isArray(candidateValue) && candidateValue.length <= 3000 && candidateValue.every(candidateRecord => obj(candidateRecord) && test(candidateRecord));
  const map = (v: unknown, test: (x: Record<string, unknown>) => boolean) => obj(v) && Object.keys(v).length <= 1000 && Object.values(v).every(x => obj(x) && test(x));
  const entity = (candidateRecord: Record<string, unknown>) => str(candidateRecord.id) && Number.isInteger(candidateRecord.version) && Number(candidateRecord.version) > 0 && str(candidateRecord.createdAt) && str(candidateRecord.updatedAt);
  if (!obj(value)) return false;
  for (const key of ['profiles', 'education', 'projects', 'resumes']) {
    const collection = value[key];
    if (!obj(collection) || !Object.entries(collection).every(([id, item]) => obj(item) && item.id === id)) return false;
  }
  if (!Object.values(value.education as Record<string, unknown>).every(item => obj(item) && seed.education.some(candidateEducation => candidateEducation.id === item.id && candidateEducation.studentId === item.studentId))) return false;
  if (!Object.values(value.profiles as Record<string, unknown>).every(item => obj(item) && seed.students.some(candidateStudent => candidateStudent.id === item.id && candidateStudent.universityId === item.universityId))) return false;
  return map(
    value.profiles,
    candidateRecord => (candidateRecord.professional === undefined || validProfessional(candidateRecord.professional)) && entity(candidateRecord) && str(candidateRecord.name)
      && str(candidateRecord.studentId ?? '')
      && str(candidateRecord.universityId)
      && str(candidateRecord.programId)
      && typeof candidateRecord.course === 'number'
      && str(candidateRecord.region)
      && str(candidateRecord.interests)
      && strings(candidateRecord.skills)
      && Array.isArray(candidateRecord.availability)
      && candidateRecord.availability.length === 2
      && candidateRecord.availability.every(candidateRecord => str(candidateRecord))
      && str(candidateRecord.schedule)
      && typeof candidateRecord.relocate === 'boolean'
      && ['visible', 'hidden'].includes(String(candidateRecord.visibility))
  )
    &&
    map(
      value.education,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && candidateRecord.source === 'university_demo' && str(candidateRecord.sourceDate) && strings(candidateRecord.skills)
        && Array.isArray(candidateRecord.disciplines)
        && candidateRecord.disciplines.length > 0
        && list(candidateRecord.disciplines, disciplineRecord => str(disciplineRecord.name) && str(disciplineRecord.result))
        && list(
          candidateRecord.history,
          historyRecord => str(historyRecord.requestId) && str(historyRecord.fieldPath) && str(historyRecord.oldValue) && str(historyRecord.newValue) && str(historyRecord.at) && str(historyRecord.resolution)
        )
    )
    &&
    map(
      value.projects,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && str(candidateRecord.title) && str(candidateRecord.task) && str(candidateRecord.contribution) && strings(candidateRecord.tools)
        && str(candidateRecord.outcome)
        && str(candidateRecord.programId)
        && ['student', 'university_demo'].includes(String(candidateRecord.source))
    )
    &&
    map(
      value.resumes,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && str(candidateRecord.title)
        && ['ПТО', 'BIM/ТИМ', 'Сметное дело', 'Проектирование'].includes(String(candidateRecord.target))
        && str(candidateRecord.summary)
        && (candidateRecord.experienceSummary === undefined || str(candidateRecord.experienceSummary) && candidateRecord.experienceSummary.length <= 3000)
        && strings(candidateRecord.projectIds)
        && strings(candidateRecord.skillClaims)
        && ['draft', 'ready'].includes(String(candidateRecord.status))
        && typeof candidateRecord.primary === 'boolean'
        && ['student', 'scripted_assistant', 'ai_assisted', 'mock_assisted'].includes(String(candidateRecord.origin))
    )
    &&
    list(
      value.corrections,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && str(candidateRecord.recordId) && str(candidateRecord.fieldPath) && str(candidateRecord.oldValue)
        && str(candidateRecord.proposedValue)
        && str(candidateRecord.reason)
        && Number.isInteger(candidateRecord.recordVersion)
        && ['pending', 'approved', 'rejected'].includes(String(candidateRecord.status))
        && (candidateRecord.resolution === undefined || str(candidateRecord.resolution))
    )
    &&
    list(
      value.applications,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && str(candidateRecord.offerId)
        && [
          'submitted',
          'viewed',
          'info_requested',
          'interview',
          'offered',
          'rejected',
          'withdrawn'
        ].includes(String(candidateRecord.selectionStatus))
        && obj(candidateRecord.resumeSnapshot)
        && str(candidateRecord.resumeSnapshot.title)
        && str(candidateRecord.resumeSnapshot.summary)
        && Number.isInteger(candidateRecord.resumeSnapshot.version)
        && (candidateRecord.history === undefined || list(candidateRecord.history, historyRecord => str(historyRecord.at) && str(historyRecord.text)))
        && (candidateRecord.projectSnapshot === undefined
          || list(
            candidateRecord.projectSnapshot,
            p => entity(p) && str(p.title) && str(p.studentId) && str(p.contribution) && strings(p.tools)
          ))
        && (candidateRecord.educationSnapshot === undefined
          || obj(candidateRecord.educationSnapshot) && entity(candidateRecord.educationSnapshot)
          && list(candidateRecord.educationSnapshot.disciplines, disciplineRecord => str(disciplineRecord.name) && str(disciplineRecord.result))
          && strings(candidateRecord.educationSnapshot.skills))
    )
    &&
    list(
      value.events,
      candidateRecord => str(candidateRecord.id) && str(candidateRecord.actorId) && str(candidateRecord.type) && str(candidateRecord.objectRef) && str(candidateRecord.at) && candidateRecord.origin === 'visitor'
    )
    &&
    list(
      value.searches,
      candidateRecord => str(candidateRecord.id) && str(candidateRecord.userId) && str(candidateRecord.title) && str(candidateRecord.url, 2000)
        && /^\/(practices|jobs)(\?|$)/.test(String(candidateRecord.url))
    )
    &&
    obj(value.lastSearch)
    && Object.values(value.lastSearch).every(candidateValue => str(candidateValue, 2000) && /^\/(practices|jobs)(\?|$)/.test(candidateValue))
    &&
    map(
      value.assistant,
      candidateRecord => ['ПТО', 'BIM/ТИМ', 'Сметное дело', 'Проектирование'].includes(String(candidateRecord.branch))
        && Array.isArray(candidateRecord.answers)
        && candidateRecord.answers.length === 6
        && candidateRecord.answers.every(a => str(a, 600))
        && str(candidateRecord.preview, 3000)
        && typeof candidateRecord.simulateError === 'boolean'
        && Number.isInteger(candidateRecord.step)
        && Number(candidateRecord.step) >= 0
        && Number(candidateRecord.step) <= 5
    );
}
