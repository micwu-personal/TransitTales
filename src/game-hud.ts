import './game-hud.css';
import type { Language } from './rush/locale';

export const hudCopy = {
  en: { controls: 'Controls', close: 'Close controls', help: 'How to play', sound: 'Sound & music', journey: 'Beijing journeys', settings: 'Settings' },
  'zh-CN': { controls: '操作面板', close: '收起面板', help: '怎么玩', sound: '音效与音乐', journey: '北京地铁旅程', settings: '设置' },
  ja: { controls: '操作パネル', close: 'パネルを閉じる', help: '遊び方', sound: '音と音楽', journey: '北京の地下鉄の旅', settings: '設定' },
  'mn-Cyrl-MN': { controls: 'Удирдлага', close: 'Самбарыг хаах', help: 'Хэрхэн тоглох', sound: 'Дуу ба хөгжим', journey: 'Бээжингийн метроны аялал', settings: 'Тохиргоо' },
  'mn-Mong-CN': { controls: 'ᠵᠢᠯᠣᠭᠣᠳᠤᠯᠭ᠎ᠠ', close: 'ᠰᠠᠮᠪᠠᠷ ᠢ ᠬᠠᠭᠠᠬᠤ', help: 'ᠬᠡᠷᠬᠢᠨ ᠲᠣᠭᠯᠠᠬᠤ', sound: 'ᠳᠠᠭᠤ ᠪᠠ ᠬᠥᠭᠵᠢᠮ', journey: 'ᠪᠡᠭᠡᠵᠢᠩ ᠦ ᠮᠧᠲᠷᠣ ᠶᠢᠨ ᠠᠶᠠᠯᠠᠯ', settings: 'ᠲᠣᠬᠢᠷᠠᠭᠤᠯᠭ᠎ᠠ' },
} satisfies Record<Language, Record<string, string>>;

export function mountGameShell(root: HTMLElement, options: {
  panel: string; scene: string; primary: string; help: string; result: string;
  tools?: string; quick?: string; settings?: string[]; feedback?: string[]; notice?: string; beforeOpen?: () => void;
}) {
  const find = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  root.classList.add('viewport-game');
  const header = find('header'), brand = header.firstElementChild!, select = find('header select');
  const label = header.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`)!;
  const help = find(options.help);
  const extraLinks = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).filter(link => link !== brand);
  if (extraLinks.length) { const links = document.createElement('nav'); links.className = 'extra-links'; links.append(...extraLinks); help.append(links); }
  const sound = document.createElement('details');
  sound.innerHTML = '<summary data-hud-copy="sound"></summary>';
  for (const selector of options.settings ?? []) sound.append(find(selector));
  const actions = document.createElement('div'); actions.className = 'game-header-actions';
  label.classList.add('sr-only');
  actions.append(label, select);
  actions.insertAdjacentHTML('beforeend', '<button id="hud-help" type="button" aria-expanded="false" aria-controls="game-help-panel">?</button><button id="hud-toggle" type="button" aria-expanded="false" aria-controls="game-control-panel"></button>');
  header.replaceChildren(brand, actions); header.classList.add('game-header');
  const panel = find(options.panel), contents = document.createElement('div'); contents.className = 'game-panel-scroll';
  const dock = document.createElement('div'); dock.className = 'game-dock';
  if (options.tools) dock.append(find(options.tools));
  dock.append(find(options.primary)); root.append(dock);
  for (const selector of options.feedback ?? []) panel.append(find(selector));
  if (options.notice) { const notice = find(options.notice); notice.classList.add('game-prompt'); root.append(notice); }
  contents.append(...Array.from(panel.childNodes));
  if (options.settings?.length) contents.append(sound);
  panel.replaceChildren(); panel.classList.add('game-panel'); panel.id = 'game-control-panel';
  panel.innerHTML = '<div class="game-panel-head"><h2 data-hud-copy="controls"></h2><button id="hud-close" type="button">×</button></div>';
  panel.append(contents);
  help.classList.add('game-help'); help.id = 'game-help-panel';
  if (help instanceof HTMLDetailsElement) help.open = true;
  const legend = root.querySelector<HTMLElement>('.map-bottom, .stage-bottom');
  if (legend) help.append(legend);
  root.append(help);
  find(options.scene).classList.add('scene-surface');
  find(options.result).classList.add('game-result');
  const viewTools = find('.scene-toolbar, .city-view-toolbar');
  viewTools.classList.add('game-view-tools');
  if (options.quick) viewTools.append(find(options.quick));
  let frame = 0;
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const bounds = root.getBoundingClientRect();
      const dockBounds = dock.getBoundingClientRect();
      root.style.setProperty('--tools-bottom', `${Math.max(0, bounds.bottom - dockBounds.top + 8)}px`);
      root.style.setProperty('--scene-top', `${Math.max(0, header.getBoundingClientRect().bottom - bounds.top + 8)}px`);
      root.style.setProperty('--scene-bottom', `${Math.max(0, bounds.bottom - viewTools.getBoundingClientRect().top + 8)}px`);
    });
  };
  const geometry = new ResizeObserver(measure);
  for (const node of [root, dock, header, viewTools]) geometry.observe(node);
  measure();
  const hud = createGameHud(root, panel, help, options.beforeOpen);
  return { ...hud, dispose() { hud.dispose(); geometry.disconnect(); cancelAnimationFrame(frame); } };
}

export function createGameHud(root: HTMLElement, panel: HTMLElement, help: HTMLElement, beforeOpen?: () => void) {
  const toggle = root.querySelector<HTMLButtonElement>('#hud-toggle')!;
  const close = root.querySelector<HTMLButtonElement>('#hud-close')!;
  const helpToggle = root.querySelector<HTMLButtonElement>('#hud-help')!;
  const wide = matchMedia('(min-width: 1100px) and (min-height: 600px)');
  let open = wide.matches, helpOpen = false, manuallyChosen = false;
  function update() {
    root.dataset.hud = open ? 'open' : 'closed';
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    help.hidden = !helpOpen;
    helpToggle.setAttribute('aria-expanded', String(helpOpen));
  }
  function setOpen(value: boolean) { open = value; if (open) beforeOpen?.(); update(); }
  toggle.addEventListener('click', () => { manuallyChosen = true; setOpen(!open); });
  close.addEventListener('click', () => { manuallyChosen = true; setOpen(false); toggle.focus({ preventScroll: true }); });
  helpToggle.addEventListener('click', () => { helpOpen = !helpOpen; update(); });
  const resize = () => { if (!manuallyChosen) { open = wide.matches; update(); } };
  wide.addEventListener('change', resize);
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (helpOpen) { helpOpen = false; update(); helpToggle.focus({ preventScroll: true }); }
    else if (open && panel.contains(document.activeElement)) { setOpen(false); toggle.focus({ preventScroll: true }); }
  };
  document.addEventListener('keydown', escape);
  update();
  return {
    localize(language: Language) {
      const c = hudCopy[language];
      toggle.textContent = c.controls; toggle.title = c.controls;
      close.setAttribute('aria-label', c.close); close.title = c.close;
      helpToggle.setAttribute('aria-label', c.help); helpToggle.title = c.help;
      root.querySelectorAll<HTMLElement>('[data-hud-copy]').forEach(node => { node.textContent = c[node.dataset.hudCopy as keyof typeof c]; });
      panel.setAttribute('aria-label', c.controls);
    },
    open: () => setOpen(true),
    dispose() { wide.removeEventListener('change', resize); document.removeEventListener('keydown', escape); },
  };
}
