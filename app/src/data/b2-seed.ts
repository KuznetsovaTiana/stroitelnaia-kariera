import { officialName } from '../domain/personName';
import { seed } from './seed';
import type { Case, DocumentVersion, Invite, Task, PracticeOffer } from '../domain/b2-types';
export const enrichedOffer = (candidateOffer: typeof seed.offers[number]): PracticeOffer => ({
  ...candidateOffer,
  constructionDirectionId: 'direction_' + ['ПТО', 'Проектирование', 'BIM/ТИМ', 'Сметное дело'].indexOf(candidateOffer.programId),
  practiceType: 'Производственная',
  durationHours: 144,
  expectedTasks: 'Изучить организацию работ, подготовить фрагмент документации и учебный отчёт',
  universityCompatibility: 'Учебный пример МГСУ'
});
export const seedCases: Case[] = seed.practices.map(p => {
  const offer = seed.offers.find(candidateOffer => candidateOffer.id === p.offerId)!;
  return {
    ...p,
    companyId: offer.companyId,
    offerSnapshot: enrichedOffer(offer),
    conditions: {
      hours: 144,
      tasks: 'Подготовить учебную схему и пояснительную записку',
      companySupervisor: offer.supervisor,
      universitySupervisor: 'Координатор МГСУ — демо',
      notes: 'Учебный пример'
    },
    conditionsVersion: 1,
    submittedToUniversityAt: p.createdAt,
    requirementSnapshot: { version: 1, requiredDocuments: ['agreement', 'direction', 'assignment'] },
    reportText: ['review', 'completed'].includes(p.status)
      ? 'Учебный отчёт: подготовлена схема работ и пояснительная записка.'
      : '',
    reportVersion: ['review', 'completed'].includes(p.status) ? 1 : 0,
    employerFeedback: ['review', 'completed'].includes(p.status) ? 'Учебные задания выполнены.' : '',
    coordinatorFeedback: p.status === 'completed' ? 'Учебный результат зачтён' : '',
    history: [{
      at: p.createdAt,
      actorId: 'seed',
      text: 'Подготовленное учебное дело'
    }]
  };
});
export function documentFields(
  practice: Case,
  student: string,
  company: string,
  date: string
): Record<string, string> {
  return {
    student,
    university: 'МГСУ — демонстрационный контекст',
    company,
    practiceType: practice.offerSnapshot.practiceType + ' практика',
    period: practice.offerSnapshot.startDate + ' — ' + practice.offerSnapshot.endDate,
    hours: String(practice.conditions.hours),
    tasks: practice.conditions.tasks,
    companySupervisor: practice.conditions.companySupervisor,
    universitySupervisor: practice.conditions.universitySupervisor,
    generatedAt: date,
    notes: practice.conditions.notes,
    report: practice.reportText
  };
}
export const seedDocuments: DocumentVersion[] = seedCases.flatMap(candidatePractice => {
  const types = candidatePractice.status === 'review' || candidatePractice.status === 'completed'
    ? [...candidatePractice.requirementSnapshot.requiredDocuments, 'report' as const]
    : candidatePractice.requirementSnapshot.requiredDocuments;
  return types.map(type => ({
    id: `document_${candidatePractice.id}_${type}_1`,
    version: 1,
    createdAt: candidatePractice.createdAt,
    updatedAt: candidatePractice.updatedAt,
    practiceId: candidatePractice.id,
    type,
    templateVersion: 1,
    conditionsVersion: 1,
    fields: documentFields(
      candidatePractice,
      officialName(seed.students.find(candidateStudent => candidateStudent.id === candidatePractice.studentId)),
      seed.companies.find(candidateCompany => candidateCompany.id === candidatePractice.companyId)!.name,
      '2026-10-14'
    ),
    status: candidatePractice.status === 'changes_requested' && type === 'direction' ? 'changes_requested' as const : 'approved' as const,
    reviewSteps: [
      ...(type === 'agreement' || type === 'report'
        ? [
          {
            role: 'employer' as const,
            actorId: 'seed',
            decision: 'approved' as const,
            comment: 'Учебный пример проверки компании',
            at: candidatePractice.createdAt
          }
        ]
        : []),
      {
        role: 'coordinator' as const,
        actorId: 'seed',
        decision: candidatePractice.status === 'changes_requested' && type === 'direction' ? 'changes_requested' as const : 'approved' as const,
        comment: candidatePractice.status === 'changes_requested' && type === 'direction'
          ? 'Уточните примечание в направлении'
          : 'Учебная версия согласована',
        at: candidatePractice.createdAt
      }
    ]
  }));
});
export const seedTasks: Task[] = seedCases.filter(candidatePractice => ['in_progress', 'review', 'completed'].includes(candidatePractice.status)).map(candidatePractice => ({
  id: 'task_' + candidatePractice.id,
  version: 1,
  createdAt: candidatePractice.createdAt,
  updatedAt: candidatePractice.updatedAt,
  practiceId: candidatePractice.id,
  title: 'Учебная схема организации работ',
  dueDate: candidatePractice.offerSnapshot.endDate,
  studentText: candidatePractice.reportText,
  status: candidatePractice.status === 'in_progress' ? 'assigned' : 'accepted',
  comments: []
}));
export const seedInvitations: Invite[] = [
  {
    id: 'invitation_anna_demo',
    version: 1,
    createdAt: '2026-10-14T09:00:00.000Z',
    updatedAt: '2026-10-14T09:00:00.000Z',
    companyId: 'company_sever_demo',
    offerId: 'offer_13_demo',
    studentId: 'student_anna_demo',
    message: 'Приглашаем обсудить стартовую вакансию ПТО — учебный пример.',
    status: 'pending'
  },
  {
    id: 'invitation_accepted_demo',
    version: 1,
    createdAt: '2026-10-14T09:00:00.000Z',
    updatedAt: '2026-10-14T09:00:00.000Z',
    companyId: 'company_sever_demo',
    offerId: 'offer_pto_demo',
    studentId: 'student_5_demo',
    message: 'Учебное приглашение',
    status: 'accepted',
    applicationId: 'application_0'
  },
  {
    id: 'invitation_declined_demo',
    version: 1,
    createdAt: '2026-10-14T09:00:00.000Z',
    updatedAt: '2026-10-14T09:00:00.000Z',
    companyId: 'company_sever_demo',
    offerId: 'offer_13_demo',
    studentId: 'student_maria_demo',
    message: 'Учебное приглашение',
    status: 'declined'
  }
];
