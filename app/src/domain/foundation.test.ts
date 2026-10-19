
import { describe, it, expect } from 'vitest';
import { initialState, seed } from '../data/seed';
import { availablePlaces, recommendations, saveInterests, switchPersona } from './operations';
import { KEY, decode, load, persist, reset } from '../storage/storage';
const memory = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    }
  };
};
describe(
  'Этап A',
  () => {
    it(
      'сохраняет самоописание при смене ролей и перезагрузке',
      () => {
        const store = memory();
        const next = switchPersona(saveInterests(initialState(), 'Планирование работ', seed), 'employer_sever_demo', seed);
        persist(store, next);
        expect(load(store).state.changes.interests.student_anna_demo).toBe('Планирование работ');
        expect(load(store).state.activePersonaId).toBe('employer_sever_demo');
        expect(() => saveInterests(next, 'Чужой профиль', seed)).toThrow();
      }
    );
    it(
      'сброс не трогает чужой ключ',
      () => {
        const store = memory();
        store.setItem('other', 'keep');
        persist(store, initialState());
        expect(reset(store)).toEqual(initialState());
        expect(store.getItem(KEY)).toBeNull();
        expect(store.getItem('other')).toBe('keep');
      }
    );
    it(
      'сохраняет повреждённый JSON и неизвестную версию',
      () => {
        const store = memory();
        store.setItem(KEY, 'broken');
        expect(load(store).error).toBeTruthy();
        expect(store.getItem(KEY)).toBe('broken');
        expect(() => decode('{"schemaVersion":9}')).toThrow();
        expect(() => decode(JSON.stringify({
          ...initialState(), changes: {
            interests: [],
            favorites: [],
            notifications: []
          }
        })))
          .toThrow();
      }
    );
    it(
      'сообщает об отказе записи',
      () => {
        const store = memory();
        store.setItem = () => {
          throw new Error('quota');
        };
        expect(() => persist(store, initialState())).toThrow('quota');
      }
    );
    it(
      'рекомендует опубликованное место с одним свободным резервом',
      () => {
        expect(availablePlaces(seed, 'offer_pto_demo')).toBe(1);
        expect(recommendations(seed, 'student_anna_demo')[0].offer.id).toBe('offer_pto_demo');
        expect(seed.practices.some(p => p.studentId === 'student_anna_demo')).toBe(false);
        const full = structuredClone(seed);
        full.practices.push({
          ...full.practices[0],
          id: 'last',
          studentId: 'other'
        });
        expect(recommendations(full, 'student_anna_demo').some(r => r.offer.id === 'offer_pto_demo')).toBe(false);
      }
    );
  }
);
