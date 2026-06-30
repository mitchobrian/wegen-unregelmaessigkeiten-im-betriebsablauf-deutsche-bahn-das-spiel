/* Tilemap-Parsing, Kollisionsabfrage und Rendering eines Levels. */

export const TILE = 32;

// Zug-Identitäten je Level (Backdrop + Ziel-Zug).
const TRAINS = {
  RB:  { label: 'RB',  body: '#EC0016', text: '#ffffff', stripe: '#ffffff', win: '#1b2230' },
  S:   { label: 'S',   body: '#ffffff', text: '#0a6b3b', stripe: '#008D4F', win: '#243044' },
  ICE: { label: 'ICE', body: '#eef1f4', text: '#EC0016', stripe: '#EC0016', win: '#1b2230' },
};

// Solide (begehbare/blockierende) Tile-Zeichen.
const SOLID = new Set(['#', 'B', '|']);

// Zeichen, die als Entity interpretiert werden (nicht im Terrain-Grid landen).
const ENTITY_CHARS = {
  o: 'coin',
  c: 'cool',
  w: 'warm',
  k: 'bahncard',
  x: 'walker',
  m: 'crowd',
  v: 'bus',
};

export class Level {
  constructor(def) {
    this.def = def;
    this.theme = def.theme; // 'heat' | 'cold' | 'mixed'
    this.train = TRAINS[def.trainType] || TRAINS.RB;
    this.trainName = def.trainName || 'Endstation';
    this.rows = def.map;
    this.height = this.rows.length;
    this.width = Math.max(...this.rows.map((r) => r.length));
    this.spawn = { x: TILE, y: TILE };
    this.goal = null;
    this.entitySpecs = [];

    // Grid mit Solid-Flags + Render-Zeichen aufbauen.
    this.grid = [];
    for (let ty = 0; ty < this.height; ty++) {
      const row = [];
      const line = this.rows[ty];
      for (let tx = 0; tx < this.width; tx++) {
        const ch = line[tx] || ' ';
        if (ch === 'p') {
          this.spawn = { x: tx * TILE, y: ty * TILE };
          row.push(' ');
        } else if (ch === 'G') {
          // Ziel (Zug) markiert eine 2x3-Region ab diesem Tile.
          if (!this.goal) this.goal = { x: tx * TILE, y: (ty - 2) * TILE, w: TILE * 2, h: TILE * 3 };
          row.push(' ');
        } else if (ch === '^') {
          row.push('^'); // statische Gefahr (Gleis/Oberleitung) – nicht solide, aber Schaden
        } else if (ENTITY_CHARS[ch]) {
          this.entitySpecs.push({ type: ENTITY_CHARS[ch], x: tx * TILE, y: ty * TILE });
          row.push(' ');
        } else {
          row.push(SOLID.has(ch) ? ch : ' ');
        }
      }
      this.grid.push(row);
    }

    this.pixelWidth = this.width * TILE;
    this.pixelHeight = this.height * TILE;
  }

  tileAt(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return ' ';
    return this.grid[ty][tx];
  }

  isSolid(tx, ty) {
    return SOLID.has(this.tileAt(tx, ty));
  }

  // Gefahr-Tiles, die bei Berührung Schaden verursachen (Gleisbett/Oberleitung).
  isHazardPixel(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return this.tileAt(tx, ty) === '^';
  }

  // ---------- Rendering ----------
  draw(ctx, cam, t) {
    this._drawBackground(ctx, cam, t);

    const startTx = Math.max(0, Math.floor(cam.x / TILE));
    const endTx = Math.min(this.width, Math.ceil((cam.x + ctx.canvas.width) / TILE) + 1);
    const startTy = Math.max(0, Math.floor(cam.y / TILE));
    const endTy = Math.min(this.height, Math.ceil((cam.y + ctx.canvas.height) / TILE) + 1);

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const ch = this.grid[ty][tx];
        if (ch === ' ') continue;
        const x = Math.round(tx * TILE - cam.x);
        const y = Math.round(ty * TILE - cam.y);
        this._drawTile(ctx, ch, x, y, tx, ty);
      }
    }

    if (this.goal) this._drawGoal(ctx, cam);
  }

  _drawTile(ctx, ch, x, y, tx, ty) {
    if (ch === '^') {
      // Gefahr: Schienenbett / Stromschiene
      ctx.fillStyle = '#5a5f6a';
      ctx.fillRect(x, y + TILE - 8, TILE, 8);
      ctx.fillStyle = '#ffcc00';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 8 + 4, y + TILE - 8);
        ctx.lineTo(x + i * 8, y + TILE);
        ctx.lineTo(x + i * 8 + 8, y + TILE);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }

    // Boden/Block – Bahnsteig-Optik
    const top = this.tileAt(tx, ty - 1);
    const isSurface = !SOLID.has(top);
    if (ch === 'B') {
      ctx.fillStyle = '#9a6b3f';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
      ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE);
    } else if (ch === '|') {
      ctx.fillStyle = '#646973';
      ctx.fillRect(x + TILE / 2 - 4, y, 8, TILE);
    } else {
      // Bahnsteigplatte
      ctx.fillStyle = isSurface ? '#7d8794' : '#5b636e';
      ctx.fillRect(x, y, TILE, TILE);
      if (isSurface) {
        ctx.fillStyle = '#ffd60a'; // taktile Bahnsteigkante
        ctx.fillRect(x, y, TILE, 4);
      }
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Das Ziel: ein klar erkennbarer, abfahrbereiter Zug (Typ je Level) mit Zugzielanzeiger.
  _drawGoal(ctx, cam) {
    const g = this.goal;
    const T = this.train;
    const x = Math.round(g.x - cam.x);
    const y = Math.round(g.y - cam.y);
    const bodyW = g.w + 260;
    const bodyH = g.h;
    const isICE = T.label === 'ICE';

    // Zugzielanzeiger
    const signW = 178, signH = 38, sx = x - 20, sy = y - 58;
    ctx.fillStyle = '#646973';
    ctx.fillRect(x + 6, sy + signH, 4, (y - (sy + signH)));
    ctx.fillStyle = '#0b0e14';
    this._rr(ctx, sx, sy, signW, signH, 5); ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7fd0ff'; ctx.font = '10px Arial';
    ctx.fillText(`${T.label}  ·  Abfahrt`, sx + 10, sy + 10);
    ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 15px Arial';
    ctx.fillText(`» ${this.trainName}`, sx + 10, sy + 25);

    // Zugkörper (ICE mit schräger Nase, sonst kastenförmig)
    ctx.fillStyle = T.body;
    if (isICE) {
      ctx.beginPath();
      ctx.moveTo(x + 30, y);
      ctx.lineTo(x + bodyW, y);
      ctx.lineTo(x + bodyW, y + bodyH);
      ctx.lineTo(x + 4, y + bodyH);
      ctx.quadraticCurveTo(x - 10, y + bodyH * 0.55, x + 30, y);
      ctx.closePath(); ctx.fill();
    } else {
      this._rr(ctx, x - 4, y, bodyW, bodyH, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
      this._rr(ctx, x - 4, y, bodyW, bodyH, 8); ctx.stroke();
    }
    // Akzentstreifen
    ctx.fillStyle = T.stripe;
    ctx.fillRect(x + 28, y + 7, bodyW, 6);
    ctx.fillRect(x + 2, y + bodyH - 13, bodyW, 8);
    // Windschutzscheibe
    ctx.fillStyle = T.win;
    if (isICE) {
      ctx.beginPath();
      ctx.moveTo(x + 34, y + 16); ctx.lineTo(x + 70, y + 16);
      ctx.lineTo(x + 70, y + 42); ctx.lineTo(x + 20, y + 42);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(x + 10, y + 16, 56, 26);
    }
    // Scheinwerfer
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(x + 16, y + bodyH - 22, 5, 0, Math.PI * 2); ctx.fill();
    // Einstiegstür
    ctx.fillStyle = 'rgba(0,0,0,.20)';
    ctx.fillRect(x + 84, y + 14, 22, bodyH - 26);
    // Großes Typ-Label
    ctx.fillStyle = T.text; ctx.font = 'bold 24px Arial';
    ctx.fillText(T.label, x + 120, y + bodyH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // Dezente Bahnhofshalle als Tiefe hinter dem Zug.
  _drawHall(ctx, cam) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const SEG = 190;
    const off = -((cam.x * 0.2) % SEG);
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(0, 58, w, 6);
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 3;
    for (let px = off - SEG; px < w + SEG; px += SEG) {
      ctx.beginPath(); ctx.moveTo(px, 64); ctx.lineTo(px, h * 0.62); ctx.stroke();
    }
  }

  // Das Setting: ein durchgehender Zug am Nachbargleis (Typ je Level).
  _drawTrainBackdrop(ctx, cam) {
    const w = ctx.canvas.width;
    const T = this.train;
    const top = 92, bodyH = 92, SEG = 150;
    const off = -((cam.x * 0.5) % SEG);

    ctx.fillStyle = T.body;
    ctx.fillRect(0, top, w, bodyH);
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2;
    ctx.strokeRect(0, top + 0.5, w, bodyH);
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, top, w, 10);     // Dach
    ctx.fillStyle = T.stripe; ctx.fillRect(0, top + 16, w, 7);          // Streifen
    for (let wx = off - SEG; wx < w + SEG; wx += SEG) {
      ctx.fillStyle = T.win;
      this._rr(ctx, wx + 22, top + 36, 96, 34, 5); ctx.fill();
      ctx.fillStyle = T.text; ctx.font = 'bold 14px Arial';
      ctx.fillText(T.label, wx + 126, top + 60);
    }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, top + bodyH, w, 6);
  }

  // Wetter: kräftiger Schnee (Winter) bzw. Hitzeflimmern (Sommer).
  _drawWeather(ctx, t) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (this.theme === 'cold') {
      const veil = ctx.createLinearGradient(0, 0, 0, h);
      veil.addColorStop(0, 'rgba(255,255,255,.40)');
      veil.addColorStop(0.5, 'rgba(255,255,255,.10)');
      veil.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = veil; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 150; i++) {
        const sz = 2 + (i % 3);
        const drift = Math.sin(t * 1.2 + i) * 10;
        const sx = ((i * 113 + t * (28 + (i % 4) * 16)) % (w + 60)) - 30 + drift;
        const sy = ((i * 71 + t * (80 + (i % 3) * 40)) % (h + 60)) - 30;
        ctx.globalAlpha = 0.55 + (i % 3) * 0.15;
        ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (this.theme === 'heat') {
      ctx.fillStyle = 'rgba(255,228,150,.07)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  _drawBackground(ctx, cam, t) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    let sky1, sky2;
    if (this.theme === 'cold') { sky1 = '#8fa9c4'; sky2 = '#dde8f1'; }
    else if (this.theme === 'mixed') { sky1 = '#6b7280'; sky2 = '#b8c0cc'; }
    else { sky1 = '#4ea3e0'; sky2 = '#bfe3fb'; }
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky1);
    grad.addColorStop(1, sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    this._drawHall(ctx, cam);
    this._drawTrainBackdrop(ctx, cam);
    this._drawWeather(ctx, t);
  }
}
