/* Tilemap-Parsing, Kollisionsabfrage und Rendering eines Levels. */

export const TILE = 32;

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

  _drawGoal(ctx, cam) {
    const g = this.goal;
    const x = Math.round(g.x - cam.x);
    const y = Math.round(g.y - cam.y);
    // Abfahrender Zug am Bahnsteigende
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 6, y, g.w + 12, g.h);
    ctx.fillStyle = '#EC0016';
    ctx.fillRect(x - 6, y, g.w + 12, 10);
    ctx.fillRect(x - 6, y + g.h - 14, g.w + 12, 14);
    ctx.fillStyle = '#2b3038';
    ctx.fillRect(x + 2, y + 18, g.w + 0, 20); // Fenster
    ctx.fillStyle = '#222';
    ctx.fillText('🚆', x + 6, y + g.h - 22);
  }

  _drawBackground(ctx, cam, t) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    let sky1, sky2;
    if (this.theme === 'cold') { sky1 = '#9fb6cc'; sky2 = '#dfe9f2'; }
    else if (this.theme === 'mixed') { sky1 = '#6b7280'; sky2 = '#b8c0cc'; }
    else { sky1 = '#4ea3e0'; sky2 = '#bfe3fb'; }
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky1);
    grad.addColorStop(1, sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Parallax: ferne Gebäude / Bahnhofshalle
    const px = -(cam.x * 0.3) % 240;
    ctx.fillStyle = this.theme === 'cold' ? 'rgba(90,110,130,.5)' : 'rgba(70,90,120,.4)';
    for (let i = -1; i < w / 240 + 2; i++) {
      const bx = px + i * 240;
      ctx.fillRect(bx, h - 220, 90, 160);
      ctx.fillRect(bx + 110, h - 270, 70, 210);
    }

    // Schnee oder Hitzeflimmern als Atmosphäre
    if (this.theme === 'cold') {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 60; i++) {
        const sx = (i * 137 + (t * 30) % 400) % w;
        const sy = (i * 89 + t * 60) % h;
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (this.theme === 'heat') {
      ctx.fillStyle = 'rgba(255,255,200,.05)';
      ctx.fillRect(0, 0, w, h);
    }
  }
}
