import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { aiService } from '../services/aiService';

const AvailabilityContext = createContext<boolean | undefined>(undefined);

/** Presentation status only; the assistant still checks access before sending. */
export function AIAvailabilityProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState<boolean>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let mounted = true;
    aiService.availability(controller.signal)
      .then(result => { if (mounted) setAvailable(result.available); })
      .catch(() => { if (mounted) setAvailable(false); })
      .finally(() => clearTimeout(timer));
    return () => { mounted = false; clearTimeout(timer); controller.abort(); };
  }, []);
  return <AvailabilityContext.Provider value={available}>{children}</AvailabilityContext.Provider>;
}

export function AIEntryLabel({ children }: { children: ReactNode }) {
  const available = useContext(AvailabilityContext);
  return <><span className="ai-entry-icon" aria-hidden="true">✦</span><span className="ai-entry-copy"><span>{children}</span><span className="ai-entry-status">{available === undefined ? 'Проверяем доступность' : available ? 'ИИ-помощник' : 'Недоступно в демо'}</span></span></>;
}

export function AIDemoNotice() {
  return <aside className="ai-demo-notice" role="status" aria-label="Ограничение демонстрационной версии">
    <span className="ai-notice-icon" aria-hidden="true">i</span>
    <div><strong>ИИ-помощник недоступен в демо</strong><p>Функция предусмотрена архитектурой платформы для помощи с профилем и резюме. В этой демонстрации она отключена — заполните текст вручную.</p></div>
  </aside>;
}
