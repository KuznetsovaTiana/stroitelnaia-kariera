export const AI_ACTIONS = ['resume_about', 'resume_experience', 'improve_text'] as const;
export type AIAction = typeof AI_ACTIONS[number];
export type AIMode = 'mock' | 'live';
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface AIContext {
  university: string;
  educationProgram: string;
  course: number;
  disciplines: string[];
  verifiedSkills: string[];
  source: 'university_demo';
}
export interface AIRequest {
  action: AIAction;
  message: string;
  history: AIMessage[];
  profileContext: AIContext;
  target?: 'about' | 'experience';
  draft?: string;
}
export type AIAnswer = {
  type: 'question';
  message: string;
} |
{
  type: 'result';
  message: string;
  content: {
    about?: string;
    experience?: string;
  };
};
export interface AIResponse {
  mode: AIMode;
  answer: AIAnswer;
}
export interface AIAvailability {
  mode: AIMode;
  available: boolean;
}
export const AI_UNAVAILABLE = 'ИИ-помощник сейчас недоступен. Остальные функции демонстрационной версии продолжают работать.';
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const only = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(k => keys.includes(k));
export function validAIRequest(value: unknown): value is AIRequest {
  if (!record(value) || !only(value, [
    'action',
    'message',
    'history',
    'profileContext',
    'target',
    'draft'
  ])
    || !AI_ACTIONS.includes(value.action as AIAction)
    || !text(value.message, 2000)
    || !value.message.trim()
    || !Array.isArray(value.history)
    || value.history.length > 16) return false;
  if (!value.history.every(m => record(m) && only(m, ['role', 'content']) && ['user', 'assistant'].includes(String(m.role))
    && text(m.content, 3000))) return false;
  if (value.action === 'resume_about' && value.target !== undefined && value.target !== 'about'
    || value.action === 'resume_experience' && value.target !== undefined && value.target !== 'experience') return false;
  if (value.action === 'improve_text'
    && (!['about', 'experience'].includes(String(value.target)) || !text(value.draft, 3000) || !value.draft.trim())) return false;
  const c = value.profileContext;
  return record(c)
    && only(c, [
      'university',
      'educationProgram',
      'course',
      'disciplines',
      'verifiedSkills',
      'source'
    ])
    && c.source === 'university_demo'
    && text(c.university, 160)
    && text(c.educationProgram, 160)
    && Number.isInteger(c.course)
    && Number(c.course) >= 1
    && Number(c.course) <= 6
    &&
    [c.disciplines, c.verifiedSkills].every(xs => Array.isArray(xs) && xs.length <= 20 && xs.every(x => text(x, 160)))
    &&
    (value.target === undefined || ['about', 'experience'].includes(String(value.target)))
    && (value.draft === undefined || text(value.draft, 3000))
    &&
    JSON.stringify(value.history).length <= 12000
    && JSON.stringify(c).length <= 5000;
}
export function validAIAnswer(value: unknown): value is AIAnswer {
  if (!record(value) || !text(value.message, 1000) || !value.message.trim()) return false;
  if (value.type === 'question') return only(value, ['type', 'message']);
  return value.type === 'result' && only(value, ['type', 'message', 'content']) && record(value.content)
    && only(value.content, ['about', 'experience'])
    && Object.keys(value.content).length > 0
    && Object.values(value.content).every(t => text(t, 3000) && t.trim().length > 0);
}
