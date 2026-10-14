import { seed } from '../data/seed';
import type { Envelope } from './types';
import { cState } from './c-types';
export type Ability='publish'|'selection'|'search'|'practice'|'documents'|'team'|'analytics'|'read';
export function activeActor(s:Envelope){const p=seed.personas.find(p=>p.id===s.activePersonaId);if(!p||cState(s).inactive.includes(p.id))throw new Error('Тестовый пользователь отключён или не найден');return p}
export function teamRule(s:Envelope){const p=activeActor(s);return cState(s).team[p.id]??{subrole:p.subrole??'owner',offerIds:['offer_pto_demo','offer_7_demo','offer_13_demo']}}
export function canEmployer(s:Envelope,ability:Ability,offerId?:string){const p=activeActor(s);if(p.role!=='employer')return false;const rule=teamRule(s);if(rule.subrole==='owner')return true;const permitted:Record<string,Ability[]>={recruiter:['publish','selection','search','read','analytics'],manager:['practice','read'],documents:['documents','read']};return permitted[rule.subrole]?.includes(ability)&&(!offerId||rule.offerIds.includes(offerId))}
export function assertEmployer(s:Envelope,ability:Ability,offerId?:string){if(!canEmployer(s,ability,offerId))throw new Error('Действие недоступно подроли или предложение не назначено сотруднику')}
