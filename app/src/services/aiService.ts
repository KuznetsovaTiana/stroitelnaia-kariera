import { AI_UNAVAILABLE, record, validAIAnswer, validAIRequest } from '../../shared/aiContract';
import type { AIAvailability, AIRequest, AIResponse } from '../../shared/aiContract';
const endpoint = '/.netlify/functions/ai';
async function call(
  method: string,
  signal: AbortSignal,
  body?: AIRequest
): Promise<unknown> {
  const response = await fetch(
    endpoint,
    {
      method,
      signal,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    }
  );
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error(AI_UNAVAILABLE);
  }
  if (!response.ok) throw new Error(record(value) && response.status === 429
    ? 'Лимит запросов временно исчерпан. Попробуйте через минуту.'
    : AI_UNAVAILABLE);
  return value;
}
export const aiService = {
  async availability(signal: AbortSignal): Promise<AIAvailability> {
    const responsePayload = await call('GET', signal);
    if (!record(responsePayload) || !['mock', 'live'].includes(String(responsePayload.mode)) || typeof responsePayload.available !== 'boolean') throw new Error(AI_UNAVAILABLE);
    return responsePayload as unknown as AIAvailability;
  },
  async sendResumeMessage(request: AIRequest, signal: AbortSignal): Promise<AIResponse> {
    if (!validAIRequest(request)) throw new Error('Диалог достиг ограничения длины. Начните новый диалог, сохранив нужные факты.');
    const responsePayload = await call('POST', signal, request);
    if (!record(responsePayload) || !['mock', 'live'].includes(String(responsePayload.mode)) || !validAIAnswer(responsePayload.answer)) throw new Error(AI_UNAVAILABLE);
    const target = request.action === 'resume_experience'
      ? 'experience'
      : request.action === 'resume_about' ? 'about' : request.target;
    if (responsePayload.answer.type === 'result'
      && (!target || !responsePayload.answer.content[target] || Object.keys(responsePayload.answer.content).length !== 1)) throw new Error(AI_UNAVAILABLE);
    return responsePayload as unknown as AIResponse;
  }
};
