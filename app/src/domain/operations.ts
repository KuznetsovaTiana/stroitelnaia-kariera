
import { cState } from './c-types';
import type { Envelope, Seed } from './types';
export function switchPersona(
  state: Envelope,
  id: string,
  data: Seed
): Envelope {
  if (cState(state).inactive.includes(id) || !data.personas.some(candidatePersona => candidatePersona.id === id)) throw new Error('Тестовый персонаж не найден');
  return {
    ...state,
    activePersonaId: id,
    revision: state.revision + 1
  };
}
export function saveInterests(
  state: Envelope,
  text: string,
  data: Seed
): Envelope {
  const persona = data.personas.find(candidatePersona => candidatePersona.id === state.activePersonaId);
  if (persona?.role !== 'student' || !persona.studentId) throw new Error('Самоописание доступно только студенту');
  if (text.length > 600) throw new Error('Не более 600 символов');
  return {
    ...state,
    revision: state.revision + 1,
    changes: { ...state.changes, interests: { ...state.changes.interests, [persona.studentId]: text.trim() } }
  };
}
export function availablePlaces(data: Seed, offerId: string) {
  const offer = data.offers.find(candidateOffer => candidateOffer.id === offerId);
  return offer ? offer.capacity - data.practices.filter(p => p.offerId === offerId && p.reservationActive).length : 0;
}
export function recommendations(data: Seed, studentId: string) {
  const student = data.students.find(candidateStudent => candidateStudent.id === studentId);
  if (!student) return [];
  return data.offers.filter(candidateOffer => candidateOffer.kind === 'practice' && candidateOffer.status === 'published'
    && data.companies.find(candidateCompany => candidateCompany.id === candidateOffer.companyId)?.status === 'approved'
    && availablePlaces(data, candidateOffer.id) > 0
    && candidateOffer.programId === student.programId
    && candidateOffer.startDate >= student.availability[0]
    && candidateOffer.endDate <= student.availability[1])
    .map(offer => ({
      offer,
      evidence: [
        `Учебная траектория: ${student.programId}`,
        `${student.region === offer.region ? 'Совпадает регион' : 'Другой регион'}: ${offer.region}`,
        `Период: 02–27 ноября 2026`
      ]
    }));
}
