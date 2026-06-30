/* Die drei DB-Plagen als Spielmechanik: Temperatur (Hitze/Kälte), Überfüllung, Verspätung. */

const THEME_CONFIG = {
  heat: {
    label: 'Hitze 🔥',
    start: 18,
    rate: 7.5,          // Punkte/Sekunde
    color: '#ff6a00',
    relief: 'cool',     // Eis/Ventilator hilft
  },
  cold: {
    label: 'Kälte ❄️',
    start: 18,
    rate: 7.0,
    color: '#37a0ff',
    relief: 'warm',     // Kaffee/Glühwein hilft
  },
  mixed: {
    label: 'Klima 🌡️',
    start: 20,
    rate: 9.0,
    color: '#c026d3',
    relief: 'both',
  },
};

export class Hazards {
  constructor(theme) {
    this.theme = theme;
    this.cfg = THEME_CONFIG[theme] || THEME_CONFIG.heat;
    this.temp = this.cfg.start;       // 0..100 Unwohlsein (zu heiß ODER zu kalt)
    this.crowd = 0;                   // 0..100 Überfüllung
    this.delaySec = 0;                // akkumulierte Spielzeit -> "Verspätung"
    this.swing = 0;                   // für 'mixed': pendelt Hitze<->Kälte
  }

  update(dt, touchingCrowd) {
    this.temp = Math.min(100, this.temp + this.cfg.rate * dt);
    this.delaySec += dt;

    if (touchingCrowd) this.crowd = Math.min(100, this.crowd + 70 * dt);
    else this.crowd = Math.max(0, this.crowd - 45 * dt);

    if (this.theme === 'mixed') this.swing += dt;

    return { overheat: this.temp >= 100 };
  }

  // Eis/Ventilator (cool) bzw. Kaffee/Glühwein (warm) lindern.
  relieve(kind, amount) {
    const r = this.cfg.relief;
    if (r === 'both' || r === kind) this.temp = Math.max(0, this.temp - amount);
  }

  // Überfüllung bremst den Fahrgast um bis zu 45 %.
  get speedFactor() { return 1 - 0.45 * (this.crowd / 100); }

  // Spielzeit als Verspätung in Minuten (gespielt schnell, gefühlt ewig).
  get delayMinutes() { return Math.round(this.delaySec * 1.5); }

  get tempLabel() {
    if (this.theme !== 'mixed') return this.cfg.label;
    return Math.sin(this.swing * 0.4) >= 0 ? 'Hitze 🔥' : 'Kälte ❄️';
  }

  get hudState() {
    return {
      temp: this.temp,
      tempLabel: this.tempLabel,
      tempColor: this.temp > 75 ? '#EC0016' : this.cfg.color,
      crowd: this.crowd,
      delayMinutes: this.delayMinutes,
    };
  }

  // Atmosphärischer Overlay-Effekt, der mit dem Unwohlsein zunimmt.
  drawOverlay(ctx) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const intensity = Math.max(0, (this.temp - 40) / 60); // ab 40 sichtbar
    if (intensity <= 0) return;
    const warm = this.theme === 'cold' ? false : (this.theme === 'mixed' ? Math.sin(this.swing * 0.4) >= 0 : true);
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, warm ? `rgba(220,40,0,${0.55 * intensity})` : `rgba(40,120,255,${0.55 * intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}
