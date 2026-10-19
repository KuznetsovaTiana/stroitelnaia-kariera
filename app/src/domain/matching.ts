import { dataFor, isPublic } from './b1';
import type { Envelope, Offer } from './types';
import type { MatchFactor, MatchResult, Profile, Education, Project, FactorStatus } from './b1-types';
export function compareFacts(student: Profile, education: Education | undefined, projects: Project[], offer: Offer): MatchResult {
  const factors: MatchFactor[] = [];

  const add = (name: string, weight: number, status: FactorStatus, description: string, evidenceRefs: string[]) => factors.push({
    name,
    weight,
    status,
    description,
    evidenceRefs
  });

  add(
    'Программа',
    30,
    !student.programId ? 'unknown' : student.programId === offer.programId ? 'match' : 'mismatch',
    student.programId ? `${student.programId} → ${offer.programId}` : 'Учебная траектория неизвестна',
    [student.id + '.programId', offer.id + '.programId']
  );

  const known = education?.skills ?? [], matched = offer.skills.filter(skill => known.includes(skill));

  add(
    'Учебные навыки',
    25,
    !known.length || !matched.length ? 'unknown' : matched.length === offer.skills.length ? 'match' : 'partial',
    `${matched.length ? 'Учебные сведения: ' + matched.join(', ') + '. ' : ''}${offer.skills.filter(skill => !known.includes(skill)).length
      ? 'Нужно уточнить: ' + offer.skills.filter(skill => !known.includes(skill)).join(', ')
      : 'Все указанные учебные навыки совпали'}`,
    [...(education ? [education.id + '.skills'] : []), offer.id + '.skills']
  );

  const related = projects.filter(candidateProject => candidateProject.programId === offer.programId);

  add(
    'Проекты',
    20,
    !projects.length ? 'unknown' : related.length ? 'match' : 'mismatch',
    !projects.length
      ? 'Нет описанного учебного проекта'
      : related.length
        ? 'Учебный проект по траектории ' + offer.programId
        : 'Описанные проекты относятся к другой траектории',
    projects.map(candidateProject => candidateProject.id)
  );

  add(
    'Регион',
    15,
    !student.region
      ? 'unknown'
      : student.region === offer.region ? 'match' : student.relocate ? 'partial' : 'mismatch',
    !student.region
      ? 'Регион не указан'
      : `${student.region} → ${offer.region}${student.relocate ? ' · готовность к переезду заявлена студентом' : ''}`,
    [student.id + '.region', student.id + '.relocate', offer.id + '.region']
  );

  const schedule = offerSchedule(offer);

  add(
    'График',
    10,
    !student.schedule ? 'unknown' : student.schedule === schedule ? 'match' : 'mismatch',
    student.schedule ? `${student.schedule} → ${schedule}` : 'Предпочтительный график неизвестен',
    [student.id + '.schedule', offer.id + '.schedule']
  );

  const constraints: MatchResult['constraints'] = [];

  if (!isPublic(offer)) constraints.push({
    status: 'mismatch',
    text: 'Предложение не опубликовано или компания не допущена',
    evidenceRefs: [offer.id + '.status', offer.companyId + '.status']
  });

  if (!student.availability[0] || !student.availability[1]) constraints.push({
    status: 'unknown',
    text: 'Нужно уточнить период доступности',
    evidenceRefs: [student.id + '.availability']
  });
  else if (offer.startDate < student.availability[0] || offer.endDate > student.availability[1]) constraints.push({
    status: 'mismatch',
    text: 'Период предложения не входит в доступность студента',
    evidenceRefs: [student.id + '.availability', offer.id + '.startDate', offer.id + '.endDate']
  });

  if (!student.course) constraints.push({
    status: 'unknown',
    text: 'Курс неизвестен',
    evidenceRefs: [student.id + '.course']
  });
  else if (student.course < (offer.minCourse ?? 3) || student.course > (offer.maxCourse ?? 4)) constraints.push({
    status: 'mismatch',
    text: `Предложение рассчитано на ${offer.minCourse ?? 3}–${offer.maxCourse ?? 4} курс`,
    evidenceRefs: [student.id + '.course', offer.id + '.requirements.course']
  });

  const weight = factors.filter(candidateFactor => candidateFactor.status !== 'unknown').reduce((sum, rightFactor) => sum + rightFactor.weight, 0), coverage = weight / 100;

  const score = coverage < .5
    ? null
    : Math.round(100 * factors.reduce((sum, rightFactor) => sum + rightFactor.weight * (rightFactor.status === 'match' ? 1 : rightFactor.status === 'partial' ? .5 : 0), 0) / weight);

  return {
    factors,
    constraints,
    score,
    coverage,
    eligible: !constraints.some(c => c.status === 'mismatch')
  };
}
export function compare(state: Envelope, studentId: string, offerId: string): MatchResult {
  const data = dataFor(state), student = data.students.find(candidateStudent => candidateStudent.id === studentId), offer = data.offers.find(candidateOffer => candidateOffer.id === offerId);
  if (!student || !offer) throw new Error('Пара для подбора не найдена');

  const result = compareFacts(
    student,
    data.education.find(candidateEducation => candidateEducation.studentId === studentId),
    data.projects.filter(candidateProject => candidateProject.studentId === studentId),
    offer
  );

  if (isPublic(offer, state)) {
    result.constraints = result.constraints.filter(c => !c.text.startsWith('Предложение не опубликовано'));
    result.eligible = !result.constraints.some(c => c.status === 'mismatch')
  } else if (!result.constraints.some(c => c.text.startsWith('Предложение не опубликовано'))) {
    result.constraints.push({
      status: 'mismatch',
      text: 'Предложение не опубликовано или компания не допущена',
      evidenceRefs: [offer.id + '.status']
    });
    result.eligible = false
  }

  if (offer.endDate < state.demoClock) {
    result.constraints.push({
      status: 'mismatch',
      text: 'Набор завершён',
      evidenceRefs: [offer.id + '.endDate']
    });
    result.eligible = false
  }

  if (offer.kind === 'practice' && available(state, offer) <= 0) {
    result.constraints.push({
      status: 'mismatch',
      text: 'Свободных мест нет',
      evidenceRefs: [offer.id + '.capacity']
    });
    result.eligible = false
  }
  return result;
}
export function available(state: Envelope, offer: Offer) {
  return offer.capacity - dataFor(state).practices.filter(candidatePractice => candidatePractice.offerId === offer.id && candidatePractice.reservationActive).length
}
export function ranked(state: Envelope, studentId: string, offers: Offer[]) {
  return offers.map(offer => ({ offer, result: compare(state, studentId, offer.id) })).sort((a, b) => Number(b.result.eligible) - Number(a.result.eligible) || (b.result.score ?? -1) - (a.result.score ?? -1)
    || b.result.coverage - a.result.coverage
    || a.offer.id.localeCompare(b.offer.id))
}
export const offerSchedule = (candidateOffer: Offer) => candidateOffer.schedule ?? (candidateOffer.kind === 'internship' ? 'Гибкий график' : 'Полный день');
export const offerPaid = (candidateOffer: Offer) => candidateOffer.paid ?? (candidateOffer.kind !== 'practice'
  || ['offer_pto_demo', 'offer_4_demo', 'offer_10_demo'].includes(candidateOffer.id));

