
import { describe, it, expect } from 'vitest';
import { initialState, seed } from '../data/seed';
import {



  b1,



  dataFor,



  requestCorrection,



  resolveCorrection,



  submitApplication,



  saveResume,



  saveProfile,



  newProject,



  saveProject,



  toggleFavorite,



  saveSearch



} from './b1';
import { compare, compareFacts, ranked } from './matching';
import { switchPersona } from './operations';
import { decode } from '../storage/storage';
const coordinator = (s: ReturnType<typeof initialState>) => switchPersona(s, 'coordinator_mgsu_demo', seed);
describe(
  'B1: общие сущности и права',
  () => {
    it(
      'исправление создаёт уведомления и историю, сохраняя прежний снимок отклика',
      () => {
        const s = submitApplication(initialState(), 'offer_pto_demo', 'resume_0', true).state;
        const pending = requestCorrection(s, 'disciplines.0.result', 'Отлично', 'Учебная ошибка');
        expect(() => resolveCorrection(pending, b1(pending).corrections[0].id, true, 'Проверено')).toThrow();
        const done = resolveCorrection(
          coordinator(pending),
          b1(pending).corrections[0].id,
          true,
          'Исправлено по учебному примеру'
        );
        const restored = decode(JSON.stringify(done));
        const e = dataFor(restored).education[0];
        expect(e.disciplines[0].result).toBe('Отлично');
        expect(e.history[0].oldValue).toBe('Зачёт');
        expect(e.version).toBe(2);
        expect(dataFor(restored).applications.at(-1)?.educationSnapshot?.disciplines[0].result).toBe('Зачёт');
        expect(restored.changes.notifications.some(n => n.recipientId === 'persona_anna' && n.target.includes('history')))
          .toBe(true);
        expect(() => resolveCorrection(done, b1(pending).corrections[0].id, true, 'Повтор')).toThrow();
      }
    );
    it(
      'отказ сохраняет образование, повторный pending запрещён',
      () => {
        const pending = requestCorrection(initialState(), 'disciplines.1.result', 'Зачёт', 'Проверить');
        expect(() => requestCorrection(pending, 'disciplines.1.result', 'Отлично', 'Второй запрос')).toThrow();
        const done = resolveCorrection(coordinator(pending), b1(pending).corrections[0].id, false, 'Учебных оснований нет');
        expect(dataFor(done).education[0].version).toBe(1);
        expect(b1(done).corrections[0].status).toBe('rejected');
      }
    );
    it(
      'отклик идемпотентен, требует согласия, не резервирует место и фиксирует версию резюме',
      () => {
        expect(() => submitApplication(initialState(), 'offer_pto_demo', 'resume_0', false)).toThrow();
        const first = submitApplication(initialState(), 'offer_pto_demo', 'resume_0', true);
        expect(submitApplication(first.state, 'offer_pto_demo', 'resume_0', true).id).toBe(first.id);
        expect(dataFor(first.state).applications.filter(a => a.studentId === 'student_anna_demo')).toHaveLength(1);
        expect(dataFor(first.state).practices).toHaveLength(5);
        const r = dataFor(first.state).resumes[0];
        const changed = saveResume(first.state, { ...r, summary: 'Новый текст' });
        expect(dataFor(changed).applications.at(-1)?.resumeSnapshot.summary).toBe(r.summary);
        expect(() => submitApplication(initialState(), 'offer_8_demo', 'resume_0', true)).toThrow();
      }
    );
    it(
      'самоописание проекта не подменяет учебный источник, сохраняется и входит в резюме',
      () => {
        const s = initialState();
        const p = {
          ...newProject(s),
          title: 'Мой проект',
          task: 'График работ',
          contribution: 'Построила график',
          tools: ['Таблицы'],
          outcome: 'Учебная таблица'
        };
        const saved = saveProject(s, p);
        const r = dataFor(saved).resumes[0];
        const next = saveResume(saved, { ...r, projectIds: [p.id] });
        expect(dataFor(decode(JSON.stringify(next))).projects.find(e => e.id === p.id)?.source).toBe('student');
        expect(() => saveProject(s, dataFor(s).projects[0])).toThrow();
        expect(() => saveResume(s, { ...dataFor(s).resumes[1], summary: 'Чужое' })).toThrow();
      }
    );
    it(
      'профиль, поиск, избранное и ответы помощника сохраняются; malformed B1 отвергается',
      () => {
        const profile = dataFor(initialState()).students[0];
        let s = saveProfile(initialState(), {
          ...profile,
          region: 'Казань',
          relocate: true
        });
        s = toggleFavorite(s, 'offer_pto_demo');
        s = saveSearch(s, '/practices?program=ПТО', 'ПТО');
        s = {
          ...s,
          changes: {
            ...s.changes,
            b1: {
              ...b1(s),
              assistant: {
                resume_0: {
                  branch: 'ПТО',
                  answers: [
                    'ПТО',
                    '',
                    '',
                    '',
                    '',
                    ''
                  ],
                  preview: '',
                  simulateError: false,
                  step: 1
                }
              }
            }
          }
        };
        expect(dataFor(decode(JSON.stringify(s))).students[0].region).toBe('Казань');
        expect(decode(JSON.stringify(s)).changes.favoritesByUser?.persona_anna).toContain('offer_pto_demo');
        expect(() => decode(JSON.stringify({ ...s, changes: { ...s.changes, b1: { ...b1(s), resumes: { bad: {} } } } })))
          .toThrow();
        expect(decode(JSON.stringify(initialState())).changes.b1).toBeUndefined();
      }
    );
  }
);
describe(
  'AC08: подбор',
  () => {
    it(
      'полное совпадение и несовместимый период показаны отдельно',
      () => {
        const full = compare(initialState(), 'student_anna_demo', 'offer_pto_demo');
        expect(full.score).toBe(100);
        expect(full.coverage).toBe(1);
        expect(full.eligible).toBe(true);
        const student = { ...dataFor(initialState()).students[0], availability: ['2027-01-01', '2027-02-01'] as [string, string] };
        const bad = compareFacts(
          student,
          dataFor(initialState()).education[0],
          dataFor(initialState()).projects.filter(p => p.studentId === student.id),
          seed.offers[0]
        );
        expect(bad.score).toBe(100);
        expect(bad.eligible).toBe(false);
        expect(bad.constraints[0].text).toContain('Период');
      }
    );
    it(
      'unknown не становится mismatch; низкая полнота не даёт процента',
      () => {
        const data = dataFor(initialState());
        const p = {
          ...data.students[0],
          programId: '',
          region: '',
          schedule: ''
        };
        const missing = compareFacts(p, undefined, [], seed.offers[0]);
        expect(missing.score).toBeNull();
        expect(missing.coverage).toBe(0);
        expect(missing.factors.every(f => f.status === 'unknown')).toBe(true);
        const unknown = compareFacts(
          data.students[0],
          { ...data.education[0], skills: ['Таблицы'] },
          data.projects,
          seed.offers[0]
        );
        expect(unknown.factors.find(f => f.name === 'Учебные навыки')?.status).toBe('partial');
        expect(unknown.factors[1].description).toContain('Нужно уточнить');
      }
    );
    it(
      'другой регион не отклоняет автоматически, переезд даёт partial, ранжирование устойчиво',
      () => {
        const data = dataFor(initialState());
        const p = { ...data.students[0], region: 'Казань' };
        expect(compareFacts(p, data.education[0], data.projects, seed.offers[0]).factors[3].status).toBe('mismatch');
        expect(compareFacts({ ...p, relocate: true }, data.education[0], data.projects, seed.offers[0]).factors[3].status)
          .toBe('partial');
        expect(ranked(initialState(), p.id, [...seed.offers]).map(r => r.offer.id)).toEqual(ranked(initialState(), p.id, [...seed.offers].reverse()).map(r => r.offer.id));
      }
    );
  }
);
describe(
  'Совместимость старых черновиков помощника',
  () => {
    it(
      'читает прежний черновик, не меняя резюме',
      () => {
        const state = initialState();
        const resume = dataFor(state).resumes[0];
        const saved = {
          ...state,
          changes: {
            ...state.changes,
            b1: {
              ...b1(state),
              assistant: {
                [resume.id]: {
                  branch: 'ПТО',
                  answers: [
                    'Хочу в ПТО',
                    '',
                    '',
                    '',
                    '',
                    ''
                  ],
                  preview: 'Старый текст',
                  simulateError: false,
                  step: 0
                }
              }
            }
          }
        };
        expect(dataFor(decode(JSON.stringify(saved))).resumes[0]).toEqual(resume);
      }
    );
  }
);
