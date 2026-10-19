
import { seed } from '../data/seed';
import type { Envelope } from './types';
import { cState } from './c-types';
export type Ability = 'publish' | 'selection' | 'search' | 'practice' | 'documents' | 'team' | 'analytics' | 'read';
export function activeActor(state: Envelope) {
  const persona = seed.personas.find(candidatePersona => candidatePersona.id === state.activePersonaId);
  if (!persona || cState(state).inactive.includes(persona.id)) throw new Error('Тестовый пользователь отключён или не найден');
  return persona;
}
export function teamRule(state: Envelope) {
  const persona = activeActor(state);
  return cState(state).team[persona.id] ?? { subrole: persona.subrole ?? 'owner', offerIds: ['offer_pto_demo', 'offer_7_demo', 'offer_13_demo'] };
}
export function canEmployer(
  state: Envelope,
  ability: Ability,
  offerId?: string
) {
  const persona = activeActor(state);
  if (persona.role !== 'employer') return false;
  const rule = teamRule(state);
  if (rule.subrole === 'owner') return true;
  const permitted: Record<string, Ability[]> = {
    recruiter: ['publish', 'selection', 'search', 'read', 'analytics'],
    manager: ['practice', 'read'],
    documents: ['documents', 'read']
  };
  return permitted[rule.subrole]?.includes(ability) && (!offerId || rule.offerIds.includes(offerId));
}
export function assertEmployer(
  state: Envelope,
  ability: Ability,
  offerId?: string
) {
  if (!canEmployer(state, ability, offerId)) throw new Error('Действие недоступно подроли или предложение не назначено сотруднику');
}
