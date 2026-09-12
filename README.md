# claude-pet

An interactive pixel pet of the Claude Code mascot, living inside a terminal-flavoured web page.
Poke it, lure it around with your cursor, feed it tokens (and coffee, bugs, commits) and watch it evolve
from **Haiku → Sonnet → Opus → Mythos**, unlocking a hard hat, a wizard hat and a crown along the way.

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
| `/` | focus the prompt |

Commands: `/help` `/feed <kind>` `/pet` `/status` `/name <name>` `/wear <outfit>` `/sleep` `/wake` `/stages` `/save` `/reset confirm` `/clear`

Outfits unlock as it evolves: `hardhat` (Sonnet), `wizard` (Opus), `party` (Mythos). `/wear none` takes it off.

Progress is saved to `localStorage` every few seconds and on tab close.

## Deploy (Vercel)

Vercel auto-detects Vite: build command `npm run build`, output directory `dist`. No extra config needed.

## Design

See [DESIGN.md](./DESIGN.md) (日本語).
