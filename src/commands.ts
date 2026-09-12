import type { Pet } from './pet';
import type { UI } from './ui';
import { FOOD_KINDS, type FoodKind, type Vec } from './types';
import { FOODS } from './logic';
import { LEVEL_UNLOCKS, STAGES, levelForXp, nextStage, stageUnlocks, unlockRequirement, wardrobeSize, xpForLevel } from './evolution';
import { OUTFITS, type Outfit } from './sprites';

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
  '/wear <outfit> dress up · /outfits lists the wardrobe',
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
      const lvl = levelForXp(s.xp);
      const nx = nextStage(pet.stage);
      ui.log(`${pet.name} · ${pet.def.name} · lv ${lvl} · mood ${pet.mood} · wearing ${pet.outfit}`, 'act');
      ui.log(`hunger ${Math.round(s.hunger)}%  energy ${Math.round(s.energy)}%  joy ${Math.round(s.happiness)}%`, 'sub');
      ui.log(`xp ${s.xp} · next level at ${xpForLevel(lvl + 1)}${nx ? ` · ${nx.name} at ${nx.xp}` : ''}`, 'sub');
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

    case 'outfits':
    case 'wardrobe': {
      const have = pet.unlocked();
      const row = (outfit: Outfit, requirement: string, locked: string | null) => {
        const mark = pet.outfit === outfit ? '▶' : locked ? '🔒' : ' ';
        ui.log(`${mark} ${outfit.padEnd(11)}${requirement.padStart(7)}  ${locked ?? OUTFITS[outfit].label}`, 'sub');
      };
      ui.log(`wearing ${pet.outfit} · ${have.length}/${wardrobeSize()} unlocked`, 'act');
      ui.log('earned by evolving:', 'sub');
      row('none', 'start', null);
      for (const u of stageUnlocks()) {
        row(u.outfit, STAGES[u.stage]?.name ?? '?', have.includes(u.outfit) ? null : `locked — evolve to ${STAGES[u.stage]?.name}`);
      }
      ui.log(`earned by levelling up as a ${STAGES[STAGES.length - 1]?.name}:`, 'sub');
      for (const u of LEVEL_UNLOCKS) {
        row(u.outfit, `lv ${u.level}`, have.includes(u.outfit) ? null : `locked — ${xpForLevel(u.level)} xp`);
      }
      break;
    }

    case 'wear':
    case 'outfit': {
      const list = pet.unlocked();
      if (!arg) {
        ui.log(`wearing: ${pet.outfit} · unlocked: ${list.join(', ')}`, 'sub');
        break;
      }
      const name = arg.toLowerCase();
      if (pet.wear(name)) {
        ui.log(`now wearing ${OUTFITS[pet.outfit].label}`, 'ok');
        pet.events.push({ type: 'bubble', text: name === 'none' ? 'back to basics' : 'how do I look?', ms: 2000 });
      } else if (name in OUTFITS) {
        ui.log(`${name} is locked — unlocks at ${unlockRequirement(name as Outfit)}`, 'err');
      } else {
        ui.log(`unknown outfit "${arg}" — ${list.join(', ')}`, 'err');
      }
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
      ui.log(`  each evolution brings an outfit; after ${STAGES[STAGES.length - 1]?.name} the levels keep going — see /outfits`, 'sub');
      break;

    case 'save': {
      const ok = ctx.save();
      ui.log(ok ? 'saved to localStorage' : 'save failed (storage blocked?)', ok ? 'ok' : 'err');
      break;
    }

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
