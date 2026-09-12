# claude-pet

An interactive pixel pet of the Claude Code mascot, living inside a terminal-flavoured web page.
Poke it, lure it around with your cursor, feed it tokens (and coffee, bugs, commits) and watch it evolve
from **Haiku → Sonnet → Opus → Mythos**. Levels keep climbing long after the last evolution, unlocking ten
purely cosmetic outfits from a hard hat to a crimson cape.

Written in TypeScript with Vite and a plain Canvas 2D renderer. No runtime dependencies.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/
npm test           # vitest
```

## Play

| Action | What happens |
| --- | --- |
| click / tap the pet (or `space`) | raises an arm, squishes, jumps, hearts |
| move the mouse | eyes follow; it crawls after the cursor when far away |
| click empty space | it walks there |
| press `1`–`4` (or click the tray) then click | drop a token / coffee / bug / commit |
| leave it alone | it wanders, chatters, gets hungry, and naps |
| `/` | focus the prompt |

Commands: `/help` `/feed <kind>` `/pet` `/status` `/name <name>` `/wear <outfit>` `/outfits` `/sleep` `/wake` `/stages` `/save` `/reset confirm` `/clear`

Outfits unlock by level and auto-equip: `hardhat` lv 4, `wizard` lv 7, `basket` lv 9, `party` lv 10,
`headphones` lv 12, `beanie` lv 14, `shades` lv 16, `halo` lv 19, `antenna` lv 22, `cape` lv 26.
`/outfits` shows the wardrobe and `/wear none` takes it all off.

Progress is saved to `localStorage` every few seconds and on tab close.

## Deploy (Vercel)

Vercel auto-detects Vite: build command `npm run build`, output directory `dist`. No extra config needed.

## Design

See [DESIGN.md](./DESIGN.md) (日本語).
