import { AI_UNAVAILABLE, validAIRequest } from '../shared/aiContract.ts';
import { createGigaChat, AIProviderError } from './gigaChat.ts';
import { secureTransport } from './transport.ts';
import type { Transport } from './transport.ts';
import { mockAI } from './mockAI.ts';
type Env = Record<string, string | undefined>;
const json = (body: unknown, status = 200) => Response.json(body, {
  status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
  }
});
export function createAIHandler(env: Env, transport: Transport = secureTransport, now = Date.now) {
  const gigaChat = createGigaChat(transport, now);
  const buckets = new Map<string, {
    count: number;
    reset: number;
  }>();
  return async (request: Request): Promise<Response> => {
    const mode = env.AI_MODE ?? 'live';
    const configured = mode === 'mock' || mode === 'live' && !!env.GIGACHAT_CREDENTIALS?.trim();
    if (request.method === 'GET')
      return json({
        mode: mode === 'mock' ? 'mock' : 'live', available: configured
      });
    if (request.method !== 'POST')
      return json({
        error: 'METHOD', message: 'Допустим только POST.'
      }, 405);
    const origin = request.headers.get('origin');
    const origins = [new URL(request.url).origin, ...(env.AI_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)];
    if (!origin || !origins.includes(origin))
      return json({
        error: 'ORIGIN', message: 'Запрос разрешён только со страницы платформы.'
      }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return json({
        error: 'CONTENT_TYPE', message: 'Нужен JSON-запрос.'
      }, 415);
    // Instance guard complements the distributed Netlify edge rate limit.
    const ip = request.headers.get('x-nf-client-connection-ip') ?? 'local';
    if (buckets.size > 1000)
      for (const [k, v] of buckets)
        if (v.reset <= now())
          buckets.delete(k);
    if (buckets.size >= 1000 && !buckets.has(ip))
      return json({
        error: 'RATE_LIMIT', message: 'Попробуйте позже.'
      }, 429);
    const bucket = buckets.get(ip);
    if (bucket && bucket.reset > now() && bucket.count >= 12)
      return json({
        error: 'RATE_LIMIT', message: 'Слишком много запросов. Повторите через минуту.'
      }, 429);
    buckets.set(ip, {
      count: bucket && bucket.reset > now() ? bucket.count + 1 : 1, reset: bucket && bucket.reset > now() ? bucket.reset : now() + 60000
    });
    let input: unknown;
    try {
      if (Number(request.headers.get('content-length')) > 32000)
        return json({
          error: 'SIZE', message: 'Запрос слишком большой.'
        }, 413);
      const reader = request.body?.getReader();
      if (!reader)
        return json({
          error: 'INVALID_REQUEST', message: 'Нужен запрос.'
        }, 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done)
          break;
        size += part.value.byteLength;
        if (size > 32000) {
          await reader.cancel();
          return json({
            error: 'SIZE', message: 'Запрос слишком большой.'
          }, 413);
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      input = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    }
    catch {
      return json({
        error: 'INVALID_JSON', message: 'Некорректный JSON.'
      }, 400);
    }
    if (!validAIRequest(input))
      return json({
        error: 'INVALID_REQUEST', message: 'Проверьте действие, длину сообщения, историю и контекст профиля.'
      }, 400);
    if (!configured)
      return json({
        error: 'UNAVAILABLE', message: AI_UNAVAILABLE
      }, 503);
    if (mode === 'mock')
      return json({
        mode: 'mock', answer: mockAI(input)
      });
    const scope = env.GIGACHAT_SCOPE ?? 'GIGACHAT_API_PERS';
    if (!['GIGACHAT_API_PERS', 'GIGACHAT_API_B2B', 'GIGACHAT_API_CORP'].includes(scope))
      return json({
        error: 'UNAVAILABLE', message: AI_UNAVAILABLE
      }, 503);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 22000);
    const cancel = () => controller.abort();
    request.signal.addEventListener('abort', cancel, {
      once: true
    });
    try {
      const answer = await gigaChat({
        credentials: env.GIGACHAT_CREDENTIALS!.trim(), scope, model: env.GIGACHAT_MODEL ?? 'GigaChat-2', caPem: env.GIGACHAT_CA_PEM
      }, input, controller.signal);
      return json({
        mode: 'live', answer
      });
    }
    catch (error) {
      if (controller.signal.aborted)
        return json({
          error: 'TIMEOUT', message: AI_UNAVAILABLE + ' Запрос занял слишком много времени.'
        }, 504);
      if (error instanceof AIProviderError && error.code === 'LIMIT')
        return json({
          error: 'LIMIT', message: 'Лимит ИИ-помощника временно исчерпан. Попробуйте позже.'
        }, 429);
      return json({
        error: 'UNAVAILABLE', message: AI_UNAVAILABLE
      }, 503);
    }
    finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', cancel);
    }
  };
}
export const handleAI = createAIHandler(process.env);
