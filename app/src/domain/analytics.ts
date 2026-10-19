import type { Envelope } from './types';
import { dataFor, isPublic } from './b1';
import { activeActor, canEmployer } from './access';
export interface AnalyticsFilter {
  region: string;
  programId: string;
  offerId?: string;
  start: string;
  end: string;
  origin: 'all' | 'visitor';
}
export function aggregate(
  state: Envelope,
  filters: AnalyticsFilter,
  publicOnly = false
) {
  const data = dataFor(state);
  const actor = activeActor(state);
  if (!publicOnly && actor.role === 'employer' && !canEmployer(state, 'analytics')) throw new Error('Аналитика недоступна этой подроли');
  const allOffers = data.offers.filter(candidateOffer => (publicOnly
    ? isPublic(candidateOffer, state)
    : actor.role === 'employer' ? candidateOffer.companyId === actor.organizationId && canEmployer(state, 'analytics', candidateOffer.id) : true)
    && (!filters.offerId || candidateOffer.id === filters.offerId)
    && (!filters.region || candidateOffer.region === filters.region)
    && (!filters.programId || candidateOffer.programId === filters.programId)
    && (!filters.start || candidateOffer.endDate >= filters.start)
    && (!filters.end || candidateOffer.startDate <= filters.end));
  const eventRefs = new Set((state.changes.b1?.events ?? []).map(e => e.objectRef));
  const offers = allOffers.filter(candidateOffer => filters.origin === 'all' || eventRefs.has(candidateOffer.id));
  const cases = data.practices.filter(candidatePractice => allOffers.some(candidateOffer => candidateOffer.id === candidatePractice.offerId) && (filters.origin === 'all' || eventRefs.has(candidatePractice.id)));
  const students = data.students.filter(candidateStudent => (!filters.programId || candidateStudent.programId === filters.programId) && (!filters.start || candidateStudent.availability[1] >= filters.start)
    && (!filters.end || candidateStudent.availability[0] <= filters.end));
  const applications = data.applications.filter(candidateApplication => allOffers.some(candidateOffer => candidateOffer.id === candidateApplication.offerId) && (!filters.start || candidateApplication.createdAt.slice(0, 10) >= filters.start)
    && (!filters.end || candidateApplication.createdAt.slice(0, 10) <= filters.end)
    && (filters.origin === 'all' || eventRefs.has(candidateApplication.id)));
  const finishedPractices = cases.filter(candidatePractice => candidatePractice.status === 'completed' && ['credited', 'not_credited'].includes(candidatePractice.academicResult));
  const creditedPractices = finishedPractices.filter(candidatePractice => candidatePractice.academicResult === 'credited');
  const placedStudentIds = new Set(cases.filter(candidatePractice => candidatePractice.reservationActive && ['approved', 'in_progress', 'review', 'completed'].includes(candidatePractice.status))
    .map(candidatePractice => candidatePractice.studentId));
  const capacity = offers.filter(candidateOffer => candidateOffer.kind === 'practice').reduce((totalCapacity, candidateOffer) => totalCapacity + candidateOffer.capacity, 0);
  const reserved = data.practices.filter(candidatePractice => candidatePractice.reservationActive && offers.some(candidateOffer => candidateOffer.id === candidatePractice.offerId && candidateOffer.kind === 'practice'))
    .length;
  const publishedOffers = offers.filter(candidateOffer => isPublic(candidateOffer, state));
  const rows: {
    metric: string;
    count: number;
    denominator: number | null;
    value: string;
  }[] = [];
  const add = (
    metric: string,
    count: number,
    denominator: number | null = null
  ) => rows.push({
    metric,
    count,
    denominator,
    value: denominator === null
      ? String(count)
      : denominator === 0 ? 'Недостаточно данных' : `${(100 * count / denominator).toFixed(1)}%`
  });
  add('Опубликованные предложения', publishedOffers.length);
  add('Выборка студентов', students.length);
  add('Места практики', capacity);
  add('Занятые места', reserved);
  add('Свободные места', capacity - reserved);
  add('Обеспеченность местами', students.filter(candidateStudent => placedStudentIds.has(candidateStudent.id)).length, students.length);
  add('Зачтённые практики', creditedPractices.length, finishedPractices.length);
  for (const stage of [
    'submitted',
    'viewed',
    'info_requested',
    'interview',
    'offered',
    'rejected',
    'withdrawn'
  ]) add(
    'Воронка: ' + ({
      submitted: 'Отправлен',
      viewed: 'Просмотрен',
      info_requested: 'Запрошено уточнение',
      interview: 'Собеседование',
      offered: 'Предложение',
      rejected: 'Отказ',
      withdrawn: 'Отозван'
    }[stage]),
    applications.filter(candidateApplication => stage === 'submitted' || candidateApplication.selectionStatus === stage || candidateApplication.history?.some(h => h.selectionStatus === stage))
      .length
  );
  const accepted = applications.filter(candidateApplication => candidateApplication.offerResponse === 'accepted' && allOffers.some(candidateOffer => candidateOffer.id === candidateApplication.offerId && candidateOffer.kind !== 'practice'));
  add('Принятые предложения работы/стажировки (не трудоустройство)', accepted.length);
  const completedStudents = new Set(finishedPractices.map(candidatePractice => candidatePractice.studentId));
  const offersAfterPractice = applications.filter(candidateApplication => candidateApplication.selectionStatus === 'offered' && allOffers.some(candidateOffer => candidateOffer.id === candidateApplication.offerId && candidateOffer.kind === 'job')
    && cases.some(candidatePractice => candidatePractice.studentId === candidateApplication.studentId && candidatePractice.status === 'completed' && candidateApplication.createdAt.slice(0, 10) >= candidatePractice.offerSnapshot.endDate));
  add(
    'Практика → предложение работы',
    new Set(offersAfterPractice.map(candidateApplication => candidateApplication.studentId)).size,
    completedStudents.size
  );
  const approvalDurations = cases.map(candidatePractice => {
    const approval = candidatePractice.history.find(h => h.text === 'Вуз согласовал условия и обязательные документы');
    const submission = candidatePractice.history.find(h => h.text === 'Дело направлено на согласование в вуз');
    return approval && submission ? (Date.parse(approval.at) - Date.parse(submission.at)) / 86400000 : null;
  })
    .filter((v): v is number => v !== null && v >= 0)
    .sort((analytics, b) => analytics - b);
  rows.push({
    metric: 'Медиана согласования, дней',
    count: approvalDurations.length,
    denominator: null,
    value: approvalDurations.length
      ? String((approvalDurations[Math.floor((approvalDurations.length - 1) / 2)] + approvalDurations[Math.floor(approvalDurations.length / 2)]) / 2)
      : 'Недостаточно данных'
  });
  for (const skill of [...new Set(publishedOffers.flatMap(candidateOffer => candidateOffer.skills))]) add('Запрос навыка: ' + skill, publishedOffers.filter(candidateOffer => candidateOffer.skills.includes(skill)).length);
  return {
    rows,
    offerCount: offers.length,
    practiceCount: cases.length,
    applicationCount: applications.length,
    studentCount: students.length,
    filters: filters,
    scope: publicOnly
      ? 'Публичные агрегаты'
      : actor.role === 'employer'
        ? 'Своя компания и назначенные предложения'
        : actor.role === 'coordinator' ? 'Учебные студенты МГСУ' : 'Весь учебный набор'
  };
}
export function csvCell(value: unknown) {
  const raw = String(value ?? '');
  return '"' + (/^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw).replace(/"/g, '""') + '"';
}
export function analyticsCsv(
  state: Envelope,
  filters: AnalyticsFilter,
  publicOnly = false
) {
  const analytics = aggregate(state, filters, publicOnly);
  return '\ufeff' + [
    ['Демонстрационные данные', analytics.scope],
    ['Регион', filters.region || 'Все'],
    ['Программа', filters.programId || 'Все'],
    ['Предложение', filters.offerId || 'Все'],
    ['Период', filters.start + ' — ' + filters.end],
    ['Источник', filters.origin],
    ['Показатель', 'Число', 'Знаменатель', 'Значение'],
    ...analytics.rows.map(r => [r.metric, r.count, r.denominator ?? '', r.value])
  ].map(row => row.map(csvCell).join(';'))
    .join('\r\n');
}
