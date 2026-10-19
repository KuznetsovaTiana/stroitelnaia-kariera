
import { validC } from './validateC';
import { validB2 } from './validateB2';
import { validB1 } from './validateB1';
import type { Envelope } from '../domain/types';
import { initialState, seed } from '../data/seed';
export const KEY = 'stroitelnaia-kariera:demo:v1';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function decode(raw: string): Envelope {
  const savedState = JSON.parse(raw);
  if (savedState?.schemaVersion !== 1 || savedState.seedVersion !== 1) throw new Error('Неизвестная версия сохранения. Данные не перезаписаны.');
  if (!Number.isInteger(savedState.revision) || savedState.revision < 0 || !seed.personas.some(candidatePersona => candidatePersona.id === savedState.activePersonaId)
    || typeof savedState.demoClock !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(savedState.demoClock)
    || !Number.isFinite(Date.parse(savedState.demoClock))
    || new Date(savedState.demoClock).toISOString().slice(0, 10) !== savedState.demoClock
    || !savedState.changes
    || !savedState.changes.interests
    || typeof savedState.changes.interests !== 'object'
    || Array.isArray(savedState.changes.interests)
    || !Object.values(savedState.changes.interests).every(t => typeof t === 'string' && t.length <= 600)
    || !Array.isArray(savedState.changes.favorites)
    || !savedState.changes.favorites.every((id: unknown) => typeof id === 'string')
    || !Array.isArray(savedState.changes.notifications)
    || !savedState.changes.notifications.every((n: unknown) => typeof n === 'object' && n !== null && 'text' in n && typeof n.text === 'string' && 'recipientId' in n
      && typeof n.recipientId === 'string')) throw new Error('Сохранение повреждено. Восстановите исходный набор или продолжайте в памяти.');
  if (savedState.changes.b1 !== undefined && !validB1(savedState.changes.b1)) throw new Error('Сохранение B1 повреждено. Восстановите исходный набор.');
  if (savedState.changes.b2 !== undefined && !validB2(savedState.changes.b2)) throw new Error('Сохранение B2 повреждено. Восстановите исходный набор.');
  if (savedState.changes.c !== undefined && !validC(savedState.changes.c)) throw new Error('Сохранение C повреждено. Восстановите исходный набор.');
  if (savedState.changes.favoritesByUser !== undefined
    && (typeof savedState.changes.favoritesByUser !== 'object' || savedState.changes.favoritesByUser === null
      || Array.isArray(savedState.changes.favoritesByUser)
      || !Object.entries(savedState.changes.favoritesByUser).every(([owner, ids]) => seed.personas.some(candidatePersona => candidatePersona.id === owner && candidatePersona.role === 'student') && Array.isArray(ids)
        && ids.every(id => typeof id === 'string')))) throw new Error('Избранное повреждено. Восстановите исходный набор.');
  // Legacy favorites have no owner: retain them for recovery, never assign to a persona.
  savedState.changes.favoritesByUser ??= {};
  return savedState;
}
export function load(storage: StoragePort): {
  state: Envelope;
  error: string;
} {
  try {
    const raw = storage.getItem(KEY);
    return { state: raw ? decode(raw) : initialState(), error: '' };
  } catch (error) {
    return { state: initialState(), error: error instanceof Error ? error.message : 'Хранилище недоступно' };
  }
}
export function persist(storage: StoragePort, state: Envelope) {
  const raw = JSON.stringify({ ...state, savedAt: new Date().toISOString() });
  if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error('Превышен бюджет хранения. Предлагается сброс демонстрации.');
  storage.setItem(KEY, raw);
}
export function reset(storage: StoragePort) {
  storage.removeItem(KEY);
  return initialState();
}
