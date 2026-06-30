/* Spielfigur: der gehetzte Fahrgast. Lauf-/Sprungphysik + achsenweise AABB-Kollision. */

import { TILE } from './level.js';

const MOVE_SPEED = 230;     // px/s
const ACCEL = 1800;
const FRICTION = 1700;
const GRAVITY = 2100;
const JUMP_VELOCITY = -720;
const MAX_FALL = 1000;
const COYOTE_TIME = 0.09;   // kurze Sprung-Toleranz nach Kantenabgang
const JUMP_BUFFER = 0.12;

export class Player {
  constructor(spawn) {
    this.w = 22;
    this.h = 30;
    this.reset(spawn);
  }

  reset(spawn) {
    this.x = spawn.x + (TILE - this.w) / 2;
    this.y = spawn.y + TILE - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.invuln = 0;       // Unverwundbarkeit nach Treffer
    this.powerTime = 0;    // BahnCard-Powerup
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.alive = true;
    this.walkPhase = 0;
  }

  get powered() { return this.powerTime > 0; }

  update(dt, level, input, speedFactor) {
    // Horizontale Steuerung (durch Überfüllung gebremst)
    const targetDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxSpeed = MOVE_SPEED * speedFactor;
    if (targetDir !== 0) {
      this.vx += targetDir * ACCEL * dt;
      this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
      this.facing = targetDir;
    } else {
      const sign = Math.sign(this.vx);
      this.vx -= sign * FRICTION * dt;
      if (Math.sign(this.vx) !== sign) this.vx = 0;
    }

    // Sprung mit Coyote-Time + Jump-Buffer
    this.coyote = this.onGround ? COYOTE_TIME : Math.max(0, this.coyote - dt);
    this.jumpBuffer = input.jump ? JUMP_BUFFER : Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }
    // Variable Sprunghöhe: Loslassen kappt Aufwärtsbewegung
    if (!input.jump && this.vy < -260) this.vy = -260;

    // Schwerkraft
    this.vy = Math.min(MAX_FALL, this.vy + GRAVITY * dt);

    // Bewegung achsenweise auflösen
    this._moveAxis(level, this.vx * dt, 0);
    this.onGround = false;
    this._moveAxis(level, 0, this.vy * dt);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.powerTime > 0) this.powerTime -= dt;
    if (Math.abs(this.vx) > 10) this.walkPhase += dt * 12; else this.walkPhase = 0;
  }

  _moveAxis(level, dx, dy) {
    this.x += dx;
    this.y += dy;

    const left = Math.floor(this.x / TILE);
    const right = Math.floor((this.x + this.w - 1) / TILE);
    const top = Math.floor(this.y / TILE);
    const bottom = Math.floor((this.y + this.h - 1) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (!level.isSolid(tx, ty)) continue;
        const tileLeft = tx * TILE;
        const tileTop = ty * TILE;
        if (dx > 0) this.x = tileLeft - this.w, this.vx = 0;
        else if (dx < 0) this.x = tileLeft + TILE, this.vx = 0;
        else if (dy > 0) { this.y = tileTop - this.h; this.vy = 0; this.onGround = true; }
        else if (dy < 0) { this.y = tileTop + TILE; this.vy = 0; }
      }
    }
  }

  hit() {
    // Treffer: ein Leben verlieren, sofern nicht gerade unverwundbar/gepowert.
    if (this.invuln > 0 || this.powered) return false;
    this.invuln = 1.5;
    this.vy = -380;
    return true;
  }

  bounce() { this.vy = -480; } // nach erfolgreichem "Stomp"

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x);
    const y = Math.round(this.y - cam.y);
    // Blinken bei Unverwundbarkeit
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    const bob = this.onGround ? Math.sin(this.walkPhase) * 1.5 : 0;
    // Körper (Reisemantel)
    ctx.fillStyle = this.powered ? '#ffd60a' : '#1f6fb2';
    ctx.fillRect(x, y + 8 + bob, this.w, this.h - 8);
    // Kopf
    ctx.fillStyle = '#f1c79b';
    ctx.fillRect(x + 4, y + bob, this.w - 8, 12);
    // Rucksack/Koffer hinten
    ctx.fillStyle = '#9a3b3b';
    const bx = this.facing > 0 ? x - 4 : x + this.w - 2;
    ctx.fillRect(bx, y + 12 + bob, 6, 12);
    // Augen-Richtung
    ctx.fillStyle = '#222';
    const ex = this.facing > 0 ? x + this.w - 8 : x + 4;
    ctx.fillRect(ex, y + 4 + bob, 3, 3);
  }
}
