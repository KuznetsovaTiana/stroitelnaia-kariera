/** One modal at a time: keyboard containment, Escape and focus restoration. */
export function installDialogAccessibility() {
  let current: HTMLElement | null = null;
  let previous: HTMLElement | null = null;
  let lastOutside = document.activeElement as HTMLElement;
  const focusables = () => current
    ? Array.from(current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'))
      .filter(e => e.getClientRects().length)
    : [];
  const observe = () => {
    const next = document.querySelector<HTMLElement>('[role="dialog"]');
    if (next === current) return;
    if (current && !next) {
      current = null;
      previous?.focus();
      previous = null;
    }
    if (next) {
      previous = lastOutside;
      current = next;
      next.tabIndex = -1;
      (focusables()[0] ?? next).focus();
    } else current = null;
  };
  const observer = new MutationObserver(observe);
  observer.observe(document.body, { childList: true, subtree: true });
  observe();
  const key = (e: KeyboardEvent) => {
    if (!current) return;
    if (e.key === 'Escape') {
      const cancel = focusables().find(b => /Отмена|Отменить|Закрыть/.test(b.textContent ?? ''));
      if (cancel) {
        e.preventDefault();
        cancel.click();
      }
    }
    if (e.key === 'Tab') {
      const items = focusables();
      const first = items[0];
      const last = items.at(-1);
      if (!first) {
        e.preventDefault();
        current.focus();
      } else if (e.shiftKey && (document.activeElement === first || !current.contains(document.activeElement))) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  const focus = (event: FocusEvent) => {
    if (!(event.target as HTMLElement).closest('[role=dialog]')) lastOutside = event.target as HTMLElement;
    if (current && !current.contains(event.target as Node)) (focusables()[0] ?? current).focus();
  };
  document.addEventListener('keydown', key, true);
  document.addEventListener('focusin', focus, true);
  return () => {
    observer.disconnect();
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('focusin', focus, true);
  };
}
