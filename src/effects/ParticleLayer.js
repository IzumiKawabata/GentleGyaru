/**
 * ParticleLayer — グローバル粒子レイヤー (Izumi 2026-04-26 v2「particle 全体的に」)
 *
 * 軽量パーティクル: 30〜45 個の小さな丸点が画面下から上へ漂う dust/firefly 風。
 * ホーム画面の白基調を壊さない透過 + ほのかな淡色 (薄ピンク + 薄ラベンダー混合)。
 *
 * Pixi.js 8 を使うが、SmartDoll のメリーゴーランドは CSS 3D で動いているため
 * Pixi 側は完全に独立した <canvas> オーバーレイ (#fx-particles) として動く。
 * pointer-events:none で UI を一切妨げない。
 *
 * 公開 API:
 *   - new ParticleLayer({ canvas }).start()
 *   - layer.burst(x, y, opts) … ガチャ等のド派手演出時に粒子を集中放出
 *   - layer.stop()
 *   - layer.destroy()
 */

import { Application, Container, Graphics } from 'pixi.js';

/** Graphics に小さなハート形を描く (中心 0,0 / 半径 r 程度) */
function drawHeart(g, color, alpha, r) {
  const s = r;
  // 2 つの丸 + 下の三角形でハート形
  g.circle(-s * 0.5, -s * 0.25, s * 0.55).fill({ color, alpha });
  g.circle( s * 0.5, -s * 0.25, s * 0.55).fill({ color, alpha });
  g.poly([-s * 1.05, 0,  s * 1.05, 0,  0, s * 1.25]).fill({ color, alpha });
}

/** 4 点光輝の sparkle (ガチャトークンのアイコンメタファー / ロール権利を象徴) */
function drawSparkle(g, color, alpha, r) {
  // 中央のひし形 + 微小な丸でキラリ感
  g.poly([0, -r * 1.4,  r * 0.45, 0,  0, r * 1.4,  -r * 0.45, 0]).fill({ color, alpha });
  g.poly([-r * 1.4, 0,  0, r * 0.45,  r * 1.4, 0,  0, -r * 0.45]).fill({ color, alpha });
  g.circle(0, 0, r * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.9 });
}

// Izumi 2026-04-26 v5「全体的に癒し / セロトニンっぽい」: 強いコーラルから
// パステル淡色 (淡ピンク / 淡ラベンダー / クリーム / 白) に変更し、彩度を下げる
const PALETTE = [
  0xfde4ec, // 淡ピンク
  0xffd9e3, // 桜色
  0xe8d8ff, // 淡ラベンダー
  0xfff4d6, // クリーム
  0xffffff, // 白
  0xffffff,
];

const AMBIENT_COUNT = 30; // 36 → 30、空間に余白を残す
const AMBIENT_SPEED_MIN = 0.10;
const AMBIENT_SPEED_MAX = 0.42;
const AMBIENT_RADIUS_MIN = 1.4;
const AMBIENT_RADIUS_MAX = 3.0;

export class ParticleLayer {
  constructor({ canvas } = {}) {
    this.canvas = canvas || document.getElementById('fx-particles');
    this.app = null;
    this.ambientLayer = null;
    this.burstLayer = null;
    this.particles = [];
    this.bursts = [];
    this._lastT = 0;
    this._running = false;
    this._resizeBound = () => this._resize();
  }

  async start() {
    if (this._running || !this.canvas) return;
    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    this.ambientLayer = new Container();
    this.burstLayer = new Container();
    this.app.stage.addChild(this.ambientLayer);
    this.app.stage.addChild(this.burstLayer);

    for (let i = 0; i < AMBIENT_COUNT; i++) {
      this._spawnAmbient(/*initial*/ true);
    }

    this.app.ticker.add((ticker) => this._tick(ticker.deltaMS));
    window.addEventListener('resize', this._resizeBound);
    this._running = true;
  }

  stop() {
    if (!this._running) return;
    this.app?.ticker?.stop();
    window.removeEventListener('resize', this._resizeBound);
    this._running = false;
  }

  destroy() {
    this.stop();
    if (this.app) {
      try { this.app.destroy(true, { children: true }); } catch (_) {}
    }
    this.app = null;
    this.particles = [];
    this.bursts = [];
  }

  /** 中心 (x, y) から半径方向に粒子爆発 (ガチャ抽選時など)
   *  @param {{ count?: number, speed?: number, life?: number, palette?: number[],
   *            gravity?: number, shape?: 'dot'|'heart', size?: number, spin?: boolean }} opts
   */
  burst(x, y, opts = {}) {
    if (!this._running || !this.burstLayer) return;
    const count = opts.count ?? 60;
    const speedBase = opts.speed ?? 6;
    const life = opts.life ?? 900;
    const palette = opts.palette || PALETTE;
    const gravity = opts.gravity ?? 0;
    const shape = opts.shape || 'dot';
    const sizeBase = opts.size ?? null;
    const spin = opts.spin ?? false;
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const color = palette[(Math.random() * palette.length) | 0];
      const r = sizeBase
        ? sizeBase * (0.7 + Math.random() * 0.6)
        : AMBIENT_RADIUS_MIN + Math.random() * (AMBIENT_RADIUS_MAX - AMBIENT_RADIUS_MIN) + 1;
      if (shape === 'heart') {
        drawHeart(g, color, 1, r);
      } else if (shape === 'sparkle') {
        drawSparkle(g, color, 1, r);
      } else {
        g.circle(0, 0, r).fill({ color, alpha: 1 });
      }
      g.x = x; g.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = speedBase * (0.5 + Math.random());
      this.burstLayer.addChild(g);
      this.bursts.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        age: 0,
        gravity,
        spinV: spin ? (Math.random() - 0.5) * 0.3 : 0,
      });
    }
  }

  /** Izumi 2026-04-26 v5「中央 from ぶわ〜じゃなくて下からぶわ〜〜！が良い」:
   *  画面下端からランダム x 位置で粒子を生成し、上方向に立ち上る噴水効果。
   *  心理: 下から上のベクトルは「祝福が舞い上がる」感、セロトニン的な穏やかさ。
   *
   *  @param {{ count?: number, life?: number, size?: number, shape?: string,
   *            palette?: number[], speedY?: number, spread?: number, gravity?: number,
   *            xRange?: [number, number] }} opts
   */
  fountainUp(opts = {}) {
    if (!this._running || !this.burstLayer) return;
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const count = opts.count ?? 30;
    const life = opts.life ?? 2200;
    const sizeBase = opts.size ?? 6;
    const shape = opts.shape || 'heart';
    const palette = opts.palette || PALETTE;
    const speedY = opts.speedY ?? 3.2;       // 上向き初速度の中央値
    const spread = opts.spread ?? 0.7;       // 横方向ゆらぎ強度
    const gravity = opts.gravity ?? -0.05;   // 軽く負 (徐々に減速・浮く)
    const [xMin, xMax] = opts.xRange || [w * 0.08, w * 0.92];
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const color = palette[(Math.random() * palette.length) | 0];
      const r = sizeBase * (0.7 + Math.random() * 0.6);
      if (shape === 'heart') drawHeart(g, color, 1, r);
      else if (shape === 'sparkle') drawSparkle(g, color, 1, r);
      else g.circle(0, 0, r).fill({ color, alpha: 1 });
      // 下端から少しずつ ずらしてスポーン (バラつきで「ぶわ〜」感)
      g.x = xMin + Math.random() * (xMax - xMin);
      g.y = h + 8 + Math.random() * 30;
      const vx = (Math.random() - 0.5) * spread;
      const vy = -(speedY * (0.7 + Math.random() * 0.6));
      this.burstLayer.addChild(g);
      this.bursts.push({
        g, vx, vy, life, age: 0, gravity, spinV: 0,
      });
    }
  }

  _spawnAmbient(initial = false) {
    if (!this.app || !this.ambientLayer) return;
    const g = new Graphics();
    const color = PALETTE[(Math.random() * PALETTE.length) | 0];
    const r = AMBIENT_RADIUS_MIN + Math.random() * (AMBIENT_RADIUS_MAX - AMBIENT_RADIUS_MIN);
    g.circle(0, 0, r).fill({ color, alpha: 0.55 });
    g.x = Math.random() * this.app.renderer.width;
    g.y = initial ? Math.random() * this.app.renderer.height : this.app.renderer.height + 8;
    this.ambientLayer.addChild(g);
    this.particles.push({
      g,
      vy: -(AMBIENT_SPEED_MIN + Math.random() * (AMBIENT_SPEED_MAX - AMBIENT_SPEED_MIN)),
      vx: (Math.random() - 0.5) * 0.18,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  _tick(deltaMS) {
    if (!this.app) return;
    const dt = Math.min(deltaMS, 60);
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;

    // ambient
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.g.x += p.vx * dt * 0.06 * 16;
      p.g.y += p.vy * dt * 0.06 * 16;
      p.pulse += dt * 0.004;
      p.g.alpha = 0.35 + 0.25 * Math.sin(p.pulse);
      if (p.g.y < -10 || p.g.x < -10 || p.g.x > w + 10) {
        this.ambientLayer.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
        this._spawnAmbient(false);
      }
    }

    // bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const t = b.age / b.life;
      if (t >= 1) {
        this.burstLayer.removeChild(b.g);
        b.g.destroy();
        this.bursts.splice(i, 1);
        continue;
      }
      b.g.x += b.vx * dt * 0.06 * 16;
      b.g.y += b.vy * dt * 0.06 * 16 + b.gravity * (b.age / 1000);
      b.g.alpha = 1 - t;
      const sc = 1 + t * 0.5;
      b.g.scale.set(sc);
      if (b.spinV) b.g.rotation += b.spinV * dt * 0.06;
    }
  }

  _resize() {
    if (!this.app) return;
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
  }
}
