
import type { B2Changes } from '../domain/b2-types';
export function validB2(value: unknown): value is B2Changes {
  const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const str = (v: unknown, max = 6000) => typeof v === 'string' && v.length <= max;
  const list = (candidateValue: unknown, check: (candidateRecord: Record<string, unknown>) => boolean) => Array.isArray(candidateValue) && candidateValue.length <= 3000 && candidateValue.every(candidateRecord => obj(candidateRecord) && check(candidateRecord));
  const map = (v: unknown, check: (v: Record<string, unknown>) => boolean) => obj(v) && Object.keys(v).length <= 1000 && Object.entries(v).every(([id, x]) => obj(x) && x.id === id && check(x));
  const entity = (candidateRecord: Record<string, unknown>) => str(candidateRecord.id, 120) && Number.isInteger(candidateRecord.version) && Number(candidateRecord.version) > 0 && str(candidateRecord.createdAt, 40)
    && str(candidateRecord.updatedAt, 40);
  const offer = (candidateRecord: Record<string, unknown>) => entity(candidateRecord) && (candidateRecord.paid === undefined || typeof candidateRecord.paid === 'boolean')
    && (candidateRecord.schedule === undefined || ['Полный день', 'Гибкий график'].includes(String(candidateRecord.schedule)))
    && [candidateRecord.minCourse, candidateRecord.maxCourse].every(n => n === undefined || Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 6)
    && str(candidateRecord.companyId)
    && ['practice', 'job', 'internship'].includes(String(candidateRecord.kind))
    && str(candidateRecord.title)
    && str(candidateRecord.programId)
    && str(candidateRecord.region)
    && [
      'published',
      'draft',
      'rejected',
      'pending_moderation',
      'changes_requested',
      'archived'
    ].includes(String(candidateRecord.status))
    && Array.isArray(candidateRecord.skills)
    && candidateRecord.skills.every(candidateRecord => str(candidateRecord))
    && str(candidateRecord.startDate, 10)
    && str(candidateRecord.endDate, 10)
    && Number.isInteger(candidateRecord.capacity)
    && Number(candidateRecord.capacity) > 0
    && str(candidateRecord.supervisor);
  if (!obj(value)) return false;
  return map(
    value.practices,
    candidateRecord => entity(candidateRecord) && str(candidateRecord.studentId) && str(candidateRecord.companyId) && str(candidateRecord.applicationId) && str(candidateRecord.offerId)
      && obj(candidateRecord.offerSnapshot)
      && offer(candidateRecord.offerSnapshot)
      && [
        'awaiting_university',
        'changes_requested',
        'approved',
        'in_progress',
        'review',
        'completed',
        'cancelled'
      ].includes(String(candidateRecord.status))
      && ['not_assessed', 'credited', 'not_credited', 'needs_revision'].includes(String(candidateRecord.academicResult))
      && typeof candidateRecord.reservationActive === 'boolean'
      && obj(candidateRecord.conditions)
      && Number.isInteger(candidateRecord.conditions.hours)
      && Number(candidateRecord.conditions.hours) > 0
      && str(candidateRecord.conditions.tasks)
      && str(candidateRecord.conditions.companySupervisor)
      && str(candidateRecord.conditions.universitySupervisor)
      && str(candidateRecord.conditions.notes)
      && Number.isInteger(candidateRecord.conditionsVersion)
      && Number(candidateRecord.conditionsVersion) > 0
      && (candidateRecord.submittedToUniversityAt === undefined || str(candidateRecord.submittedToUniversityAt))
      && obj(candidateRecord.requirementSnapshot)
      && Number.isInteger(candidateRecord.requirementSnapshot.version)
      && Array.isArray(candidateRecord.requirementSnapshot.requiredDocuments)
      && candidateRecord.requirementSnapshot.requiredDocuments.every(candidateRecord => ['agreement', 'direction', 'assignment'].includes(candidateRecord))
      && str(candidateRecord.reportText)
      && Number.isInteger(candidateRecord.reportVersion)
      && str(candidateRecord.employerFeedback)
      && str(candidateRecord.coordinatorFeedback)
      && list(candidateRecord.history, historyRecord => str(historyRecord.at) && str(historyRecord.actorId) && str(historyRecord.text))
  )
    &&
    list(
      value.documents,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.practiceId)
        && ['agreement', 'direction', 'assignment', 'report'].includes(String(candidateRecord.type))
        && Number.isInteger(candidateRecord.templateVersion)
        && Number.isInteger(candidateRecord.conditionsVersion)
        && ['draft', 'in_review', 'approved', 'changes_requested'].includes(String(candidateRecord.status))
        && obj(candidateRecord.fields)
        && [
          'student',
          'university',
          'company',
          'practiceType',
          'period',
          'hours',
          'tasks',
          'companySupervisor',
          'universitySupervisor',
          'generatedAt',
          'notes',
          'report'
        ].every(k => str((candidateRecord.fields as Record<string, unknown>)[k]))
        && list(
          candidateRecord.reviewSteps,
          r => ['employer', 'coordinator'].includes(String(r.role)) && str(r.actorId)
            && ['approved', 'changes_requested'].includes(String(r.decision))
            && str(r.comment)
            && str(r.at)
        )
    )
    &&
    list(
      value.tasks,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.practiceId) && str(candidateRecord.title) && str(candidateRecord.dueDate) && str(candidateRecord.studentText)
        && ['assigned', 'submitted', 'revision', 'accepted'].includes(String(candidateRecord.status))
        && list(candidateRecord.comments, c => str(c.actorId) && str(c.text) && str(c.at))
    )
    &&
    list(
      value.messages,
      candidateRecord => entity(candidateRecord) && ['application', 'practice'].includes(String(candidateRecord.contextType)) && str(candidateRecord.contextId)
        && str(candidateRecord.authorId)
        && str(candidateRecord.text)
        && str(candidateRecord.requestId, 100)
    )
    &&
    list(
      value.invitations,
      candidateRecord => entity(candidateRecord) && str(candidateRecord.companyId) && str(candidateRecord.studentId) && str(candidateRecord.offerId) && str(candidateRecord.message)
        && ['pending', 'accepted', 'declined', 'cancelled'].includes(String(candidateRecord.status))
        && (candidateRecord.applicationId === undefined || str(candidateRecord.applicationId))
    )
    &&
    map(
      value.offers,
      candidateRecord => offer(candidateRecord) && str(candidateRecord.practiceType) && Number.isInteger(candidateRecord.durationHours) && str(candidateRecord.expectedTasks)
        && str(candidateRecord.universityCompatibility)
    )
    &&
    map(
      value.companies,
      candidateRecord => entity(candidateRecord) && (candidateRecord.logoUrl === undefined || str(candidateRecord.logoUrl, 2000)) && str(candidateRecord.name) && str(candidateRecord.description)
        && ['draft', 'pending', 'approved', 'rejected', 'suspended'].includes(String(candidateRecord.status))
    );
}
