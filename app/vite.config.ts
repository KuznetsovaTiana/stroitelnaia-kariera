import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createAIHandler } from './server/aiHandler.ts';
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'local-ai-function',
      configureServer(server) {
        const handler = createAIHandler({ ...loadEnv(mode, process.cwd(), ''), ...process.env });
        server.middlewares.use(
          '/.netlify/functions/ai',
          async (incomingRequest, outgoingResponse) => {
            const controller = new AbortController();
            outgoingResponse.on('close', () => controller.abort());
            try {
              const chunks: Buffer[] = [];
              let size = 0;
              for await (const chunk of incomingRequest) {
                size += chunk.length;
                if (size > 32000) {
                  outgoingResponse.statusCode = 413;
                  outgoingResponse.end();
                  return;
                }
                chunks.push(Buffer.from(chunk));
              }
              const headers = new Headers();
              for (const [k, v] of Object.entries(incomingRequest.headers)) if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
              const response = await handler(new Request(
                'http://' + incomingRequest.headers.host + '/.netlify/functions/ai',
                {
                  method: incomingRequest.method,
                  headers,
                  signal: controller.signal,
                  ...(incomingRequest.method === 'POST' ? { body: Buffer.concat(chunks) } : {})
                }
              ));
              outgoingResponse.statusCode = response.status;
              response.headers.forEach((v, k) => outgoingResponse.setHeader(k, v));
              outgoingResponse.end(await response.text());
            } catch {
              outgoingResponse.statusCode = 503;
              outgoingResponse.end(JSON.stringify({ error: 'UNAVAILABLE' }));
            }
          }
        );
      }
    }
  ],
  base: './'
}));
