import type { Pet } from './pet';
import type { UI } from './ui';
import { FOOD_KINDS, type FoodKind, type Vec } from './types';
import { FOODS } from './logic';
import { STAGES, nextStage } from './evolution';

export interface CommandContext {
  pet: Pet;
  ui: UI;
  now: () => number;
  spawnFood: (kind: FoodKind, at?: Vec) => boolean;
  reset: () => void;
  save: () => boolean;
}

const HELP = [
  '/feed <kind>   drop a snack (token|coffee|bug|commit)',
  '/pet           poke it',
  '/status        print stats',
  '/name <name>   rename',
  '/sleep /wake   toggle nap',
  '/stages        evolution chart',
  '/save /reset /clear',
  'keys: 1-4 food · 0/esc cursor · space poke · / prompt',
];

const REPLIES = ['I am a pet, not a chatbot ✻', 'try /help', '*tilts head*', 'beep boop', 'did you mean /feed?', '…tokens?'];

export function runCommand(raw: string, ctx: CommandContext): void {
  const { pet, ui } = ctx;
  const now = ctx.now();
  ui.log(raw, 'user');

  if (!raw.startsWith('/')) {
    ui.log(REPLIES[Math.floor(Math.random() * REPLIES.length)] ?? '', 'pet');
    pet.events.push({ type: 'bubble', text: '?', ms: 1200 });
    return;
  }

  const [cmd = '', ...rest] = raw.slice(1).split(/\s+/);
  const arg = rest.join(' ').trim();

  switch (cmd.toLowerCase()) {
    case 'help':
    case '?':
      for (const l of HELP) ui.log(l, 'sub');
      break;

    case 'feed': {
      const kind = (arg || 'token').toLowerCase() as FoodKind;
      if (!FOOD_KINDS.includes(kind)) {
        ui.log(`unknown food "${arg}" — try ${FOOD_KINDS.join(', ')}`, 'err');
        break;
      }
      if (!ctx.spawnFood(kind)) ui.log('too many snacks on the floor already', 'err');
      break;
    }

    case 'pet':
    case 'poke':
      pet.poke(now);
      break;

    case 'status': {
      const s = pet.stats;
      const nx = nextStage(pet.stage);
      ui.log(`${pet.name} · ${pet.def.name} (stage ${pet.stage + 1}/${STAGES.length}) · mood ${pet.mood}`, 'act');
      ui.log(`hunger ${Math.round(s.hunger)}%  energy ${Math.round(s.energy)}%  joy ${Math.round(s.happiness)}%  xp ${s.xp}${nx ? ` / ${nx.xp}` : ''}`, 'sub');
      ui.log(`fed: ${FOOD_KINDS.map((k) => `${FOODS[k].label} ×${pet.fed[k]}`).join('  ')} · pokes ${pet.pokes}`, 'sub');
      break;
    }

    case 'name': {
      const name = arg.slice(0, 16);
      if (!name) {
        ui.log('usage: /name <name>', 'err');
        break;
      }
      pet.rename(name);
      ui.log(`renamed to ${name}`, 'ok');
      pet.events.push({ type: 'bubble', text: `I'm ${name} now`, ms: 2000 });
      break;
    }

    case 'sleep':
      if (pet.sleeping) ui.log('already asleep', 'sub');
      else pet.sleep(now);
      break;

    case 'wake':
      if (!pet.sleeping) ui.log('already awake', 'sub');
      else pet.wake(now, 'command');
      break;

    case 'stages':
      STAGES.forEach((st, i) => ui.log(`${i === pet.stage ? '▶' : ' '} ${i + 1}. ${st.name.padEnd(7)} ${String(st.xp).padStart(4)} xp  ${st.tagline}`, 'sub'));
      break;

    case 'save':
      ui.log(ctx.save() ? 'saved to localStorage' : 'save failed (storage blocked?)', ctx.save() ? 'ok' : 'err');
      break;

    case 'reset':
      if (arg !== 'confirm') {
        ui.log('this wipes your pet. type: /reset confirm', 'err');
        break;
      }
      ctx.reset();
      break;

    case 'clear':
      ui.clearLog();
      break;

    default:
      ui.log(`unknown command: /${cmd} — try /help`, 'err');
  }
}
