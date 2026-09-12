import type { Pet } from './pet';
import { FOOD_KINDS, type FoodKind, type Tool } from './types';
import { FOODS } from './logic';
import { FOOD_SPRITES } from './sprites';
import { Renderer } from './renderer';
import { STAGES, levelForXp, nextStage } from './evolution';

export type LogClass = 'act' | 'sub' | 'sys' | 'ok' | 'err' | 'user' | 'pet';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const esc = (s: string): string => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch] ?? ch);

function bar(v: number, width = 12): string {
  const n = Math.round((Math.max(0, Math.min(100, v)) / 100) * width);
  return '█'.repeat(n) + '░'.repeat(width - n);
}

export class UI {
  readonly stageWrap = $<HTMLElement>('stage-wrap');
  readonly canvas = $<HTMLCanvasElement>('stage');
  private readonly statsEl = $<HTMLPreElement>('stats');
  private readonly trayEl = $<HTMLElement>('tray');
  private readonly logEl = $<HTMLElement>('log');
  private readonly promptEl = $<HTMLFormElement>('prompt');
  private readonly cmdEl = $<HTMLInputElement>('cmd');
  private readonly statusRight = $<HTMLElement>('status-right');
  private readonly statusLeft = $<HTMLElement>('status-left');
  private readonly hintEl = $<HTMLElement>('hint');
  private toolButtons = new Map<Tool, HTMLButtonElement>();
  private lastStats = '';

  onCommand: (text: string) => void = () => {};
  onSelectTool: (tool: Tool) => void = () => {};

  constructor() {
    this.buildTray();
    this.promptEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.cmdEl.value.trim();
      this.cmdEl.value = '';
      if (text) this.onCommand(text);
    });
    this.cmdEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cmdEl.blur();
        this.onSelectTool('cursor');
      }
    });
  }

  get inputFocused(): boolean {
    return document.activeElement === this.cmdEl;
  }

  focusInput(): void {
    this.cmdEl.focus();
  }

  private buildTray(): void {
    const tools: Tool[] = ['cursor', ...FOOD_KINDS];
    tools.forEach((tool, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tool';
      btn.dataset['tool'] = tool;
      btn.title = tool === 'cursor' ? 'cursor: poke / lure' : `${FOODS[tool].label}: ${FOODS[tool].effect}`;
      const icon = document.createElement('canvas');
      if (tool === 'cursor') Renderer.renderIcon(icon, ['.......', '.#.....', '.##....', '.###...', '.####..', '.#####.', '..#.#..']);
      else Renderer.renderIcon(icon, FOOD_SPRITES[tool]);
      const label = document.createElement('span');
      label.textContent = tool;
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = i === 0 ? '[0]' : `[${i}]`;
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = tool === 'cursor' ? '' : '×0';
      btn.append(icon, label, count, key);
      btn.addEventListener('click', () => this.onSelectTool(tool));
      this.trayEl.appendChild(btn);
      this.toolButtons.set(tool, btn);
    });
  }

  setTool(tool: Tool): void {
    for (const [t, b] of this.toolButtons) b.classList.toggle('selected', t === tool);
    this.stageWrap.classList.toggle('tool-food', tool !== 'cursor');
  }

  updateCounts(fed: Record<FoodKind, number>): void {
    for (const k of FOOD_KINDS) {
      const el = this.toolButtons.get(k)?.querySelector('.count');
      if (el) el.textContent = `×${fed[k] ?? 0}`;
    }
  }

  log(text: string, cls: LogClass = 'act'): void {
    const line = document.createElement('div');
    line.className = `line ${cls}`;
    line.textContent = text;
    this.logEl.appendChild(line);
    while (this.logEl.childElementCount > 80) this.logEl.firstElementChild?.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  clearLog(): void {
    this.logEl.replaceChildren();
  }

  renderStats(pet: Pet): void {
    const s = pet.stats;
    const stage = pet.def;
    const next = nextStage(pet.stage);
    const lvl = levelForXp(s.xp);
    const xpPct = next ? ((s.xp - stage.xp) / (next.xp - stage.xp)) * 100 : 100;
    const moodGlyph =
      pet.mood === 'sleeping' ? 'zzz' : pet.mood === 'eating' ? 'nom' : pet.mood === 'evolving' ? '✻ ✻ ✻' : pet.mood === 'sad' ? ':(' : pet.mood === 'happy' || pet.mood === 'excited' ? ':)' : ':|';
    const low = (v: number) => (v < 25 ? ' low' : '');
    const html =
      `<span class="name">${esc(pet.name)}</span> <span class="k">·</span> ${esc(stage.name)} <span class="k">· lv</span> ${lvl} <span class="k">· stage</span> ${pet.stage + 1}<span class="k">/${STAGES.length}</span>\n` +
      `<span class="k">mood    </span> ${esc(moodGlyph)}${pet.caffeinated ? ' <span class="bar xp">☕</span>' : ''}\n` +
      `<span class="k">hunger  </span> <span class="bar${low(s.hunger)}">${bar(s.hunger)}</span> ${String(Math.round(s.hunger)).padStart(3)}%\n` +
      `<span class="k">energy  </span> <span class="bar${low(s.energy)}">${bar(s.energy)}</span> ${String(Math.round(s.energy)).padStart(3)}%\n` +
      `<span class="k">joy     </span> <span class="bar${low(s.happiness)}">${bar(s.happiness)}</span> ${String(Math.round(s.happiness)).padStart(3)}%\n` +
      `<span class="k">xp      </span> <span class="bar xp">${bar(xpPct)}</span> ${s.xp}${next ? `<span class="k">/${next.xp} → ${esc(next.name)}</span>` : ' <span class="k">max</span>'}`;
    if (html !== this.lastStats) {
      this.statsEl.innerHTML = html;
      this.lastStats = html;
    }
  }

  setStatus(left: string, right: string): void {
    this.statusLeft.innerHTML = left;
    this.statusRight.innerHTML = right;
  }

  hideHint(): void {
    this.hintEl.classList.add('hidden');
  }
}
