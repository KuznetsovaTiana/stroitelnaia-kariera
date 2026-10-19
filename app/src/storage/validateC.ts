import { validProfessional } from '../domain/profile-details';
import type { CChanges } from '../domain/c-types';
export function validC(candidateValue: unknown): candidateValue is CChanges {
  const obj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
  const str = (x: unknown, max = 10000) => typeof x === 'string' && x.length <= max;
  const strings = (candidateValue: unknown) => Array.isArray(candidateValue) && candidateValue.length <= 1000 && candidateValue.every(t => str(t));
  const list = (candidateValue: unknown, check: (candidateRecord: Record<string, unknown>) => boolean) => Array.isArray(candidateValue) && candidateValue.length <= 3000 && candidateValue.every(t => obj(t) && check(t));
  const map = (x: unknown, check: (x: Record<string, unknown>) => boolean) => obj(x) && Object.values(x).every(t => obj(t) && check(t));
  const entity = (candidateRecord: Record<string, unknown>) => str(candidateRecord.id) && Number.isInteger(candidateRecord.version) && Number(candidateRecord.version) > 0 && str(candidateRecord.createdAt) && str(candidateRecord.updatedAt);
  if (!obj(candidateValue)) return false;
  return list(
    candidateValue.requests,
    candidateRecord => entity(candidateRecord) && str(candidateRecord.companyId) && str(candidateRecord.programId) && str(candidateRecord.start) && str(candidateRecord.end)
      && Number.isInteger(candidateRecord.requested)
      && Number.isInteger(candidateRecord.proposed)
      && ['pending', 'answered'].includes(String(candidateRecord.status))
      && str(candidateRecord.message)
      && str(candidateRecord.response)
  )
    &&
    list(
      candidateValue.requirements,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.programId) && str(candidateRecord.practiceType) && Number.isInteger(candidateRecord.minHours) && Number(candidateRecord.minHours) > 0
        && Array.isArray(candidateRecord.requiredDocuments)
        && candidateRecord.requiredDocuments.length > 0
        && candidateRecord.requiredDocuments.every(t => ['agreement', 'direction', 'assignment'].includes(t))
        && str(candidateRecord.completionRule)
    )
    &&
    list(
      candidateValue.templates,
      candidateRecord => entity(candidateRecord) && ['agreement', 'direction', 'assignment', 'report'].includes(String(candidateRecord.type))
        && str(candidateRecord.body, 3000)
        && strings(candidateRecord.fields)
    )
    &&
    list(
      candidateValue.tickets,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.authorId) && str(candidateRecord.category)
        && ['offer', 'company', 'education', 'none'].includes(String(candidateRecord.objectType))
        && str(candidateRecord.objectId)
        && ['open', 'in_progress', 'resolved', 'closed'].includes(String(candidateRecord.status))
        && list(candidateRecord.comments, c => str(c.actorId) && str(c.text) && str(c.at))
    )
    &&
    list(
      candidateValue.dictionaries,
      candidateRecord => entity(candidateRecord) && ['direction', 'skill', 'profession'].includes(String(candidateRecord.category)) && str(candidateRecord.name)
        && typeof candidateRecord.active === 'boolean'
        && strings(candidateRecord.skillIds)
        && str(candidateRecord.tasks)
        && str(candidateRecord.programId)
    )
    &&
    list(
      candidateValue.aiExamples,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.resumeId) && str(candidateRecord.branch) && str(candidateRecord.text) && strings(candidateRecord.facts)
        && ['pending', 'approved', 'needs_revision'].includes(String(candidateRecord.verdict))
        && str(candidateRecord.comment)
    )
    &&
    map(
      candidateValue.team,
      candidateRecord => ['owner', 'recruiter', 'manager', 'documents'].includes(String(candidateRecord.subrole)) && strings(candidateRecord.offerIds)
    )
    && strings(candidateValue.inactive)
    && str(candidateValue.universityDescription)
    &&
    map(candidateValue.programs, candidateRecord => str(candidateRecord.name) && strings(candidateRecord.skills) && str(candidateRecord.group))
    && obj(candidateValue.content)
    && Object.values(candidateValue.content).every(candidateValue => str(candidateValue, 3000))
    && map(candidateValue.notificationSettings, candidateRecord => typeof candidateRecord.recommendations === 'boolean')
    &&
    list(candidateValue.integrationChecks, candidateRecord => str(candidateRecord.id) && str(candidateRecord.at) && typeof candidateRecord.success === 'boolean' && str(candidateRecord.message))
    &&
    list(
      candidateValue.batches,
      candidateRecord => entity(candidateRecord) && ['ready', 'invalid', 'applied'].includes(String(candidateRecord.status)) && strings(candidateRecord.appliedIds)
        && list(
          candidateRecord.rows,
          r => Number.isInteger(r.index) && strings(r.errors)
            && (r.row === null
              || obj(r.row) && str(r.row.externalId) && str(r.row.name) && str(r.row.programId)
              && Number.isInteger(r.row.course)
              && str(r.row.group)
              && strings(r.row.skills)
              && list(r.row.disciplines, disciplineRecord => str(disciplineRecord.name) && str(disciplineRecord.result)))
        )
    )
    &&
    map(
      candidateValue.importedProfiles,
      candidateRecord => (candidateRecord.professional === undefined || validProfessional(candidateRecord.professional)) && entity(candidateRecord) && str(candidateRecord.name)
        && str(candidateRecord.programId)
        && Number.isInteger(candidateRecord.course)
        && str(candidateRecord.universityId)
        && str(candidateRecord.region)
        && strings(candidateRecord.skills)
        && strings(candidateRecord.availability)
        && Array.isArray(candidateRecord.availability)
        && candidateRecord.availability.length === 2
        && str(candidateRecord.interests)
        && str(candidateRecord.schedule)
        && typeof candidateRecord.relocate === 'boolean'
        && ['visible', 'hidden'].includes(String(candidateRecord.visibility))
    )
    &&
    map(
      candidateValue.importedEducation,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && candidateRecord.source === 'university_demo' && str(candidateRecord.sourceDate) && strings(candidateRecord.skills)
        && list(candidateRecord.disciplines, disciplineRecord => str(disciplineRecord.name) && str(disciplineRecord.result))
        && Array.isArray(candidateRecord.history)
    );
}
