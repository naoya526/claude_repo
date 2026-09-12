import { COLORS } from './sprites';

export type ParticleKind = 'heart' | 'spark' | 'z' | 'crumb' | 'star' | 'confetti';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  spin: number;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

export class Particles {
  private list: Particle[] = [];

  spawn(kind: ParticleKind, x: number, y: number, n = 1): void {
    for (let i = 0; i < n; i++) {
      const p: Particle = {
        kind,
        x,
        y,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        color: COLORS.cream,
        size: 3,
        spin: rnd(0, Math.PI * 2),
      };
      switch (kind) {
        case 'heart':
          p.vx = rnd(-18, 18);
          p.vy = rnd(-55, -30);
          p.max = rnd(0.9, 1.4);
          p.color = '#ff7a9a';
          p.size = 2;
          break;
        case 'spark':
          p.vx = rnd(-120, 120);
          p.vy = rnd(-160, 20);
          p.max = rnd(0.6, 1.2);
          p.color = Math.random() < 0.5 ? COLORS.gold : COLORS.cream;
          p.size = rnd(2, 4);
          break;
        case 'star':
          p.vx = rnd(-30, 30);
          p.vy = rnd(-40, -10);
          p.max = rnd(1.2, 2);
          p.color = COLORS.gold;
          p.size = 3;
          break;
        case 'z':
          p.vx = rnd(6, 14);
          p.vy = rnd(-22, -14);
          p.max = rnd(1.6, 2.2);
          p.color = '#9aa4b2';
          p.size = rnd(9, 13);
          break;
        case 'confetti': {
          const palette = ['#E06C75', '#7AA2F7', COLORS.body, COLORS.gold, COLORS.cream];
          p.vx = rnd(-25, 25);
          p.vy = rnd(10, 30);
          p.max = rnd(1.8, 3);
          p.color = palette[Math.floor(Math.random() * palette.length)] ?? COLORS.cream;
          p.size = rnd(2, 3);
          break;
        }
        case 'crumb':
          p.vx = rnd(-40, 40);
          p.vy = rnd(-60, -20);
          p.max = rnd(0.4, 0.8);
          p.color = COLORS.gold;
          p.size = 2;
          break;
      }
      this.list.push(p);
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.life += dt;
      if (p.kind === 'crumb' || p.kind === 'spark') p.vy += 260 * dt;
      if (p.kind === 'heart' || p.kind === 'z') p.vx += Math.sin(p.life * 6 + p.spin) * 20 * dt;
      if (p.kind === 'confetti') p.vx = Math.sin(p.life * 5 + p.spin) * 28;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += dt * 4;
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.3));
      ctx.fillStyle = p.color;
      const s = p.size;
      switch (p.kind) {
        case 'heart': {
          const x = Math.round(p.x);
          const y = Math.round(p.y);
          ctx.fillRect(x - s, y - s, s, s);
          ctx.fillRect(x + 1, y - s, s, s);
          ctx.fillRect(x - s - 1, y, s * 2 + 3, s);
          ctx.fillRect(x - s, y + s, s * 2 + 1, s);
          ctx.fillRect(x - s + 1, y + s * 2, s * 2 - 1, s);
          ctx.fillRect(x, y + s * 3, 1, s);
          break;
        }
        case 'spark':
        case 'star': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.fillRect(-s / 2, -s * 1.5, s, s * 3);
          ctx.fillRect(-s * 1.5, -s / 2, s * 3, s);
          ctx.restore();
          break;
        }
        case 'z': {
          ctx.font = `bold ${Math.round(s)}px ui-monospace, Menlo, monospace`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText('z', p.x, p.y);
          break;
        }
        case 'crumb':
          ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
          break;
        case 'confetti': {
          const wide = Math.floor(p.spin * 2) % 2 === 0;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), wide ? s * 2 : s, wide ? s : s * 2);
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  get count(): number {
    return this.list.length;
  }
}
