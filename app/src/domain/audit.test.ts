import { expect, it } from 'vitest';
import { initialState, seed } from '../data/seed';
import { favoriteIds, toggleFavorite, dataFor, submitApplication } from './b1';
import { switchPersona } from './operations';
import { decode } from '../storage/storage';
import { newOffer, saveOffer, submitOffer } from './b2';
it(
  'favorites are independent and legacy owners are not guessed',
  () => {
    let s = toggleFavorite(initialState(), 'offer_pto_demo');
    const other = seed.personas.find(p => p.role === 'student' && p.id !== 'persona_anna')!;
    s = switchPersona(s, other.id, seed);
    expect(favoriteIds(s)).toEqual([]);
    s = toggleFavorite(s, 'offer_pto_demo');
    s = toggleFavorite(s, 'offer_pto_demo');
    s = switchPersona(decode(JSON.stringify(s)), 'persona_anna', seed);
    expect(favoriteIds(s)).toEqual(['offer_pto_demo']);
    expect(favoriteIds(decode(JSON.stringify({ ...initialState(), changes: { ...initialState().changes, favorites: ['offer_pto_demo'] } }))))
      .toEqual([]);
  }
);
it(
  'new offer is saved and submitted without duplicates',
  () => {
    const s = switchPersona(initialState(), 'employer_sever_demo', seed);
    const o = {
      ...newOffer(s),
      title: 'Новое объявление',
      supervisor: 'Учебный наставник',
      expectedTasks: 'Ведомость объёмов',
      skills: ['Таблицы']
    };
    const next = submitOffer(saveOffer(s, o), o.id);
    expect(dataFor(next).offers.find(v => v.id === o.id)?.status).toBe('pending_moderation');
    expect(submitOffer(next, o.id)).toBe(next);
    expect(dataFor(next).offers.filter(v => v.id === o.id)).toHaveLength(1);
    expect(() => saveOffer(s, { ...o, title: '' })).toThrow();
  }
);

it(
  'all test students keep favorites independently across reload',
  () => {
    let s = initialState();
    const students = seed.personas.filter(p => p.role === 'student');
    for (const p of students) {
      s = switchPersona(s, p.id, seed);
      expect(favoriteIds(s)).toEqual([]);
      s = toggleFavorite(s, 'offer_pto_demo');
    }
    s = decode(JSON.stringify(s));
    for (const p of students) {
      s = switchPersona(s, p.id, seed);
      expect(favoriteIds(s)).toEqual(['offer_pto_demo']);
      s = toggleFavorite(s, 'offer_pto_demo');
    }
    expect(Object.values(s.changes.favoritesByUser!).every(ids => ids.length === 0)).toBe(true);
  }
);
it(
  'expired intake blocks an application through the domain',
  () => {
    const s = { ...initialState(), demoClock: '2027-01-01' };
    expect(() => submitApplication(s, 'offer_pto_demo', 'resume_0', true)).toThrow('Набор завершён');
  }
);
it(
  'offer payment, schedule and courses survive storage; invalid ranges are rejected',
  () => {
    const s = switchPersona(initialState(), 'employer_sever_demo', seed);
    const o = {
      ...newOffer(s),
      title: 'Учебное место',
      supervisor: 'Наставник',
      expectedTasks: 'План',
      paid: false,
      schedule: 'Гибкий график' as const,
      minCourse: 2,
      maxCourse: 4
    };
    const loaded = decode(JSON.stringify(saveOffer(s, o)));
    expect(dataFor(loaded).offers.find(v => v.id === o.id)).toMatchObject({
      paid: false,
      schedule: 'Гибкий график',
      minCourse: 2,
      maxCourse: 4
    });
    expect(() => saveOffer(s, {
      ...o,
      minCourse: 5,
      maxCourse: 2
    })).toThrow();
  }
);
