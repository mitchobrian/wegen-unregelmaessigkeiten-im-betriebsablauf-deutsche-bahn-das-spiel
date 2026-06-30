/* Game-Loop, Eingabe, Kollisionsauflösung, Scoring, Sieg/Niederlage. */

import { Level, TILE } from './level.js';
import { Player } from './player.js';
import { Hazards } from './hazards.js';
import { buildEntities } from './entities.js';

const STEP = 1 / 120; // fixe Physikschrittweite
const COIN_VALUE = 100;
const STOMP_VALUE = 150;

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks; // { onWin, onGameOver, onHud }
    this.input = { left: false, right: false, jump: false };
    this.running = false;
    this.paused = false;
    this._raf = null;
    this._last = 0;
    this._acc = 0;
    this._loop = this._loop.bind(this);
    this._bindKeys();
  }

  _bindKeys() {
    const set = (e, val) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this.input.left = val; break;
        case 'ArrowRight': case 'KeyD': this.input.right = val; break;
        case 'ArrowUp': case 'KeyW': case 'Space': this.input.jump = val; break;
        default: return;
      }
      e.preventDefault();
    };
    this._onDown = (e) => { if (this.running) set(e, true); };
    this._onUp = (e) => set(e, false);
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
  }

  setInput(key, val) {
    if (key === 'left') this.input.left = val;
    else if (key === 'right') this.input.right = val;
    else if (key === 'jump') this.input.jump = val;
  }

  start(levelDef) {
    this.levelDef = levelDef;
    this.level = new Level(levelDef);
    this.player = new Player(this.level.spawn);
    this.entities = buildEntities(this.level.entitySpecs);
    this.hazards = new Hazards(this.level.theme);
    this.cam = { x: 0, y: 0 };
    this.lives = 3;
    this.coins = 0;
    this.score = 0;
    this.elapsed = 0;
    this.finished = false;
    this.input.left = this.input.right = this.input.jump = false;
    this.running = true;
    this.paused = false;
    this._last = 0;
    this._acc = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }
  pause() { this.paused = true; }
  resume() { if (this.running) { this.paused = false; this._last = 0; } }

  _loop(ts) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this._last) this._last = ts;
    let dt = (ts - this._last) / 1000;
    this._last = ts;
    if (dt > 0.1) dt = 0.1; // Tab-Wechsel abfedern

    if (!this.paused) {
      this._acc += dt;
      let guard = 0;
      while (this._acc >= STEP && guard < 8) { this._step(STEP); this._acc -= STEP; guard++; }
    }
    this._draw();
    if (this.cb.onHud) this.cb.onHud(this._hudState());
  }

  _step(dt) {
    if (this.finished) return;
    this.elapsed += dt;

    // Überfüllung: Berührung mit Menschenmengen?
    let touchingCrowd = false;
    for (const e of this.entities) {
      if (!e.dead && e.kind === 'crowd' && e.overlaps(this.player.rect)) { touchingCrowd = true; break; }
    }

    this.player.update(dt, this.level, this.input, this.hazards.speedFactor);

    for (const e of this.entities) { if (!e.dead) e.update(dt, this.level); }
    this._resolveEntities();

    // Gefahr-Tiles (Gleisbett)
    if (this._touchesHazardTile()) this._damage();

    // Temperatur/Verspätung
    const { overheat } = this.hazards.update(dt, touchingCrowd);
    if (overheat) { this._damage(); this.hazards.temp = this.hazards.cfg.start; }

    // Absturz unter die Strecke
    if (this.player.y > this.level.pixelHeight + 60) this._fall();

    // Ziel erreicht?
    if (this.level.goal && this._rectsOverlap(this.player.rect, this.level.goal)) this._win();

    this._updateCamera();
  }

  _resolveEntities() {
    const p = this.player;
    for (const e of this.entities) {
      if (e.dead || !e.overlaps(p.rect)) continue;
      switch (e.kind) {
        case 'coin': e.dead = true; this.coins++; this.score += COIN_VALUE; this._sfx('coin'); break;
        case 'relief': e.dead = true; this.hazards.relieve(e.relief, 45); this._sfx('relief'); break;
        case 'bahncard': e.dead = true; p.powerTime = 6; p.invuln = Math.max(p.invuln, 0.2); this._sfx('power'); break;
        case 'crowd': break; // bremst nur (oben behandelt)
        case 'walker': case 'bus': this._enemyHit(e); break;
        default: break;
      }
    }
    this.entities = this.entities.filter((e) => !e.dead);
  }

  _enemyHit(e) {
    const p = this.player;
    const stomp = e.stompable && p.vy > 0 && (p.y + p.h) - e.y < 14;
    if (stomp || p.powered) {
      e.dead = true;
      if (stomp) p.bounce();
      this.score += STOMP_VALUE;
      this._sfx('stomp');
    } else if (this._damage()) {
      this._sfx('hit');
    }
  }

  _touchesHazardTile() {
    const p = this.player;
    const pts = [
      [p.x + 2, p.y + p.h - 2], [p.x + p.w - 2, p.y + p.h - 2],
      [p.x + p.w / 2, p.y + p.h - 2],
    ];
    return pts.some(([px, py]) => this.level.isHazardPixel(px, py));
  }

  // Allgemeiner Schaden (Gegner/Gefahr/Überhitzung). Gibt true zurück, wenn er wirkte.
  _damage() {
    if (this.player.hit()) {
      this.lives--;
      this._sfx('hit');
      if (this.lives <= 0) this._gameOver();
      return true;
    }
    return false;
  }

  // Absturz: immer ein Leben, Respawn am Start.
  _fall() {
    this.lives--;
    this._sfx('hit');
    if (this.lives <= 0) { this._gameOver(); return; }
    this.player.reset(this.level.spawn);
    this.player.invuln = 1.4;
    this.hazards.temp = this.hazards.cfg.start;
    this.hazards.crowd = 0;
  }

  _win() {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    const timeBonus = Math.max(0, Math.round(this.levelDef.par - this.elapsed)) * 10;
    const lifeBonus = this.lives * 250;
    const total = this.score + timeBonus + lifeBonus;
    this._sfx('win');
    if (this.cb.onWin) this.cb.onWin({
      levelId: this.levelDef.id,
      coins: this.coins,
      coinScore: this.score,
      timeBonus,
      lifeBonus,
      delayMinutes: this.hazards.delayMinutes,
      total,
    });
  }

  _gameOver() {
    this.finished = true;
    this.running = false;
    this._sfx('gameover');
    if (this.cb.onGameOver) this.cb.onGameOver({
      levelId: this.levelDef.id,
      coins: this.coins,
      score: this.score,
    });
  }

  _updateCamera() {
    const w = this.canvas.width, h = this.canvas.height;
    const targetX = this.player.x + this.player.w / 2 - w / 2;
    this.cam.x = Math.max(0, Math.min(this.level.pixelWidth - w, targetX));
    this.cam.y = Math.max(0, Math.min(this.level.pixelHeight - h, 0));
  }

  _rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  _hudState() {
    const hs = this.hazards.hudState;
    return { lives: this.lives, score: this.score, ...hs };
  }

  _sfx(name) { if (this.cb.onSfx) this.cb.onSfx(name); }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.level.draw(ctx, this.cam, this.elapsed);
    for (const e of this.entities) e.draw(ctx, this.cam);
    this.player.draw(ctx, this.cam);
    this.hazards.drawOverlay(ctx);
  }
}
