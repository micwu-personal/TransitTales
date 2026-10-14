export type InfoKey = 'wheelchair' | 'balloon' | 'hint' | `request:${string}`;
interface Box { left: number; top: number; width: number; height: number }

export function popoutPosition(anchor: Box, popup: Box, bounds: Box) {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
  const below = anchor.top + anchor.height + 8;
  const top = below + popup.height <= bounds.top + bounds.height - 8 ? below : anchor.top - popup.height - 8;
  return {
    left: clamp(anchor.left, bounds.left + 8, bounds.left + bounds.width - popup.width - 8) - bounds.left,
    top: clamp(top, bounds.top + 8, bounds.top + bounds.height - popup.height - 8) - bounds.top,
  };
}

export function createInfoPopout(root: HTMLElement, popup: HTMLElement, render: (key: InfoKey) => void, changed: (key: InfoKey | null) => void) {
  let key: InfoKey | null = null;
  const trigger = () => Array.from(root.querySelectorAll<HTMLElement>('[data-info]')).find(node => node.dataset.info === key);
  function position() {
    const anchor = trigger();
    if (!key || !anchor || popup.hidden) return;
    const point = popoutPosition(anchor.getBoundingClientRect(), popup.getBoundingClientRect(), root.getBoundingClientRect());
    popup.style.left = `${point.left}px`; popup.style.top = `${point.top}px`;
  }
  function update() {
    for (const node of Array.from(root.querySelectorAll<HTMLElement>('[data-info]'))) {
      node.setAttribute('aria-controls', popup.id);
      node.setAttribute('aria-expanded', String(node.dataset.info === key));
    }
    popup.hidden = !key;
    if (key) { render(key); position(); }
  }
  function close(returnFocus = false) {
    const anchor = trigger();
    key = null; changed(null); update();
    if (returnFocus) anchor?.focus({ preventScroll: true });
  }
  const click = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-info]');
    if (!button || !root.contains(button)) return;
    const next = button.dataset.info as InfoKey;
    if (key === next) close();
    else { key = next; changed(key); update(); }
  };
  const outside = (event: PointerEvent) => {
    const target = event.target as Element;
    if (key && !popup.contains(target) && !target.closest('[data-info]')) close();
  };
  const escape = (event: KeyboardEvent) => {
    if (key && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
  };
  const scroll = (event: Event) => { if (key && !popup.contains(event.target as Node)) close(); };
  const closeButton = popup.querySelector<HTMLButtonElement>('[data-info-close]')!;
  const dismiss = () => close(true);
  root.addEventListener('click', click);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', escape, true);
  root.addEventListener('scroll', scroll, true);
  closeButton.addEventListener('click', dismiss);
  const geometry = new ResizeObserver(position); geometry.observe(root); geometry.observe(popup);
  return {
    update, close,
    dispose() {
      geometry.disconnect(); root.removeEventListener('click', click);
      document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true);
      root.removeEventListener('scroll', scroll, true); closeButton.removeEventListener('click', dismiss);
    },
  };
}
