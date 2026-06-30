/* Collectibles und Gegner/Hindernisse. Alle teilen eine schlichte AABB-Box. */

import { TILE } from './level.js';

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class Entity {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.dead = false; this.t = 0; }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  overlaps(r) { return aabb(this.rect, r); }
  update(dt) { this.t += dt; }
  draw() {}
}

/* ---------- Collectibles ---------- */

export class Coin extends Entity {
  constructor(x, y) { super(x + 8, y + 6, 16, 20); this.kind = 'coin'; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const s = Math.abs(Math.sin(this.t * 4));
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 10, 7 * (0.4 + 0.6 * s), 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#caa106';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('€', x + 4, y + 14);
  }
}

// Eis/Ventilator (cool) oder Kaffee/Glühwein (warm) – senkt die Temperatur.
export class ReliefItem extends Entity {
  constructor(x, y, relief) { super(x + 4, y + 2, 24, 26); this.kind = 'relief'; this.relief = relief; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const bob = Math.sin(this.t * 3) * 2;
    ctx.font = '22px Arial';
    ctx.fillText(this.relief === 'cool' ? '🧊' : '☕', x, y + 22 + bob);
  }
}

// BahnCard: kurzzeitig unverwundbar.
export class BahnCard extends Entity {
  constructor(x, y) { super(x + 2, y + 4, 28, 22); this.kind = 'bahncard'; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const bob = Math.sin(this.t * 4) * 2;
    ctx.fillStyle = '#EC0016';
    ctx.fillRect(x, y + bob, 28, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('BahnCard', x + 2, y + 13 + bob);
  }
}

/* ---------- Gegner / Hindernisse ---------- */

// Herrenloser Koffer, der hin und her rollt. Stompbar.
export class Walker extends Entity {
  constructor(x, y) { super(x + 2, y + 4, 28, 28); this.kind = 'walker'; this.vx = -55; this.stompable = true; }
  update(dt, level) {
    this.t += dt;
    this.x += this.vx * dt;
    // an Wand oder Kantenende umkehren
    const ahead = this.vx < 0 ? this.x : this.x + this.w;
    const tx = Math.floor((this.vx < 0 ? ahead - 2 : ahead + 2) / TILE);
    const tyMid = Math.floor((this.y + this.h / 2) / TILE);
    const tyFoot = Math.floor((this.y + this.h + 2) / TILE);
    if (level.isSolid(tx, tyMid) || !level.isSolid(tx, tyFoot)) this.vx *= -1;
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(x, y, this.w, this.h);
    ctx.strokeStyle = '#3f2a17';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, this.w - 4, this.h - 4);
    ctx.fillStyle = '#3f2a17';
    ctx.fillRect(x + this.w / 2 - 5, y - 4, 10, 5); // Griff
  }
}

// Menschenmenge: bremst (keine Lebensgefahr), nicht stompbar, bewegt sich langsam.
export class Crowd extends Entity {
  constructor(x, y) { super(x, y - TILE + 4, TILE - 2, TILE * 2 - 4); this.kind = 'crowd'; this.vx = 28; this.base = x; this.stompable = false; }
  update(dt) { this.t += dt; this.x = this.base + Math.sin(this.t * 0.8) * 40; }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const heads = ['#2b3a55', '#553a2b', '#3a5540', '#55402b'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = heads[i % heads.length];
      const hx = x + (i % 2) * 14;
      const hy = y + Math.floor(i / 2) * 22 + Math.sin(this.t * 3 + i) * 1.5;
      ctx.fillRect(hx, hy + 8, 14, 24);
      ctx.fillStyle = '#e8c9a0';
      ctx.fillRect(hx + 2, hy, 10, 10);
    }
  }
}

// Schienenersatzverkehr: großer Bus, fährt schnell zu und macht Lebensgefahr. Stompbar (mit Glück).
export class Bus extends Entity {
  constructor(x, y) { super(x, y - TILE + 2, TILE * 2, TILE * 2 - 2); this.kind = 'bus'; this.vx = -90; this.base = x; this.range = TILE * 4; this.stompable = true; }
  update(dt, level) {
    this.t += dt;
    this.x += this.vx * dt;
    if (this.x < this.base - this.range || this.x > this.base) this.vx *= -1;
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.fillStyle = '#f4b400';
    ctx.fillRect(x, y, this.w, this.h - 8);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 6, y + 8, this.w - 12, 14); // Fenster
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + 14, y + this.h - 8, 7, 0, Math.PI * 2);
    ctx.arc(x + this.w - 14, y + this.h - 8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('SEV', x + this.w / 2 - 9, y + 6);
  }
}

const FACTORY = {
  coin: (s) => new Coin(s.x, s.y),
  cool: (s) => new ReliefItem(s.x, s.y, 'cool'),
  warm: (s) => new ReliefItem(s.x, s.y, 'warm'),
  bahncard: (s) => new BahnCard(s.x, s.y),
  walker: (s) => new Walker(s.x, s.y),
  crowd: (s) => new Crowd(s.x, s.y),
  bus: (s) => new Bus(s.x, s.y),
};

export function buildEntities(specs) {
  return specs.map((s) => FACTORY[s.type](s)).filter(Boolean);
}
