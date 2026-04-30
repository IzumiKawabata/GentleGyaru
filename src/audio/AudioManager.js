/**
 * AudioManager - 音声管理
 *
 * AudioEngineの薄いラッパーとして
 * ボリュームミックスとSE再生URLの解決のみを担当。
 * Phase 5: BGMループ再生・ルーム別BGM切替を追加。
 *
 * ボイス再生はViewerScreen → AudioEngine.playOneShot() で直接行う。
 */
import { resolveAssetUrl } from '../core/SecureAssetLoader.js';
import { pickCategory, hasPattern, EffortRepeatGuard } from './EffortVoice.js';

// ルーム別BGM（将来的にファイル追加時に差し替え）
const ROOM_BGM = {
  'main-floor': null,      // BGMファイル追加後に 'bgm/bar-ambience.mp3' 等を指定
  'staff-room': null,      // v12b: スタッフの息抜きBGM予定
  'hunting-field': null,   // v12b: 風音＋鳥声のambient予定
  'hap-town-commercial': null, // v13: 商業地区 退廃的アンビエント予定
  'hap-town-alley': null,      // v13: 路地裏 緊張感ある低音予定
  'hap-town-park': null,       // v13: 公園 桜＋風 ノスタルジック予定
  'vip-1': null,
  'lobby': null,
};

// 状態別BGM（戦闘・救出などの特殊状態）
const STATE_BGM = {
  combat: null,    // v13: 戦闘BGM。アクション感ある打楽器系予定
  rescue: null,    // v13: 救出イベントBGM。緊張感+感情的予定
};

// Rushモード専用 ambient BGM（時間帯別）— P2-3
// 初期は全 null。easy 部門で生成され次第 'bgm/rush-{period}.mp3' を充填
const RUSH_AMBIENT_BGM = {
  dawn: null,
  day: null,
  evening: null,
  night: null,
  latenight: null,
};

export class AudioManager {
  constructor({ audioEngine, eventBus }) {
    this._audio = audioEngine;
    this._bus = eventBus;
    this._mix = { master: 1, voice: 1, se: 1 };
    this._enabled = true;
    this._bgmController = null;
    this._currentBgmRoom = null;
    this._stateBgmController = null;
    this._stateBgmActive = null;
    // Effort voice の反復抑制（キャラごとに個別に持つ）
    this._effortGuards = new Map();
    // 直近再生時刻（過剰連打防止）
    this._lastEffortAt = 0;
  }

  setEnabled(enabled) {
    this._enabled = Boolean(enabled);
    this._audio.setEnabled(this._enabled);
  }

  setMix(mix) {
    this._mix = { ...this._mix, ...mix };
    if (mix.master !== undefined) {
      this._audio.setMasterVolume(mix.master);
    }
    if (mix.voice !== undefined) {
      this._audio.updateVolumeByTag('voice', this._vol('voice', 0.8));
    }
  }

  /** SE再生（解決済みURL） */
  playSe(resolvedUrl) {
    if (!resolvedUrl || !this._enabled) return;
    this._audio.playOneShot({
      url: resolvedUrl,
      volume: this._vol('se', 0.3),
      allowOverlap: true,
      tag: 'se',
      group: 'se',
    });
  }

  /** ドアSE再生 */
  playDoorSe() {
    const url = resolveAssetUrl('se/open-door.mp3');
    this.playSe(url);
  }

  /** じゃんけん結果SE */
  playGambleResult(result) {
    if (result === 'win') {
      this.playSe(resolveAssetUrl('se/door-chime.mp3')); // 勝利チャイム
    } else if (result === 'lose') {
      this.playSe(resolveAssetUrl('se/alarm.wav')); // 敗北
    }
  }

  /** ルーム別BGM切替 */
  switchRoomBgm(roomId) {
    if (this._currentBgmRoom === roomId) return;
    this._currentBgmRoom = roomId;

    // 既存BGM停止
    if (this._bgmController) {
      this._bgmController.stop();
      this._bgmController = null;
    }

    const bgmPath = ROOM_BGM[roomId];
    if (!bgmPath) return;

    const url = resolveAssetUrl(bgmPath);
    this._audio.playLoop({
      url,
      volume: this._vol('se', 0.15), // BGMは控えめ
      tag: 'bgm',
      group: 'bgm',
    }).then(ctrl => {
      this._bgmController = ctrl;
    });
  }

  /**
   * 非言語ボイス再生（Q-H008）
   * category: 'moan'|'gasp'|'sigh'|'laugh'|'climax'
   * charId: 'c01'|'c02'|'c03' — キャラ別ディレクトリを選択。null時は 'rina' をデフォルト使用
   * id: 1始まりの番号。省略時はランダム選択
   *
   * ファイル構造: voice/non_verbal/{charDir}/{category}/{filename}.wav
   * charId → charDir: c01→miku, c02→rina, c03→akane, その他→rina（fallback）
   */
  playNonVerbal(category, charId, id) {
    if (!this._enabled) return;

    // キャラ別の保有ファイル数（0=未収録・スキップ）
    const CHAR_COUNTS = {
      miku:  { moan: 8, gasp: 5, sigh: 4, laugh: 5, climax: 4 },
      rina:  { moan: 8, gasp: 5, sigh: 4, laugh: 5, climax: 4 },
      akane: { moan: 8, gasp: 5, sigh: 4, laugh: 5, climax: 4 },
    };
    const CHAR_DIR = { c01: 'miku', c02: 'rina', c03: 'akane' };

    const dir = CHAR_DIR[charId] || 'rina';
    const counts = CHAR_COUNTS[dir];
    const max = counts[category] ?? 0;
    if (!max) return;

    const num = id ?? (Math.floor(Math.random() * max) + 1);
    const pad = String(num).padStart(2, '0');
    const filename = `${category}-${pad}`;
    const path = `voice/non_verbal/${dir}/${category}/${filename}.wav`;
    const url = resolveAssetUrl(path);
    this._audio.playOneShot({
      url,
      volume: this._vol('voice', 0.55),
      allowOverlap: false,
      tag: 'voice',
      group: 'nv',
    });
  }

  /**
   * 汎用エフォートボイス再生（Q-H008 / EffortVoice パターンシステム）
   *
   * @param {string} patternId  INTRO_GREETING / INTRO_REACT / LOOP_CUE / LOOP_AMBIENT /
   *                            LOOP_PEAK / FIRE_CLIMAX / OUTRO_AFTER / NPC_REACT_COIN / HIT_REACT
   * @param {string} charId     'c01' | 'c02' | 'c03'
   * @param {object} [opts]
   * @param {number} [opts.minIntervalMs=250]  前回再生からこの時間未満なら skip
   * @param {number} [opts.volume]             0-1 の音量上書き（指定時は voice mix を無視しない）
   *
   * 抽選 → anti-repeat 1回リトライ → playNonVerbal に委譲。
   * パターン未定義・キャラ未収録カテゴリの場合は静かに no-op。
   */
  playEffort(patternId, charId, opts = {}) {
    if (!this._enabled) return;
    if (!hasPattern(patternId)) {
      console.warn(`[EffortVoice] unknown pattern: ${patternId}`);
      return;
    }

    // 連打ガード
    const now = Date.now();
    const minInterval = opts.minIntervalMs ?? 250;
    if (now - this._lastEffortAt < minInterval) return;

    // 反復抑制ガードをキャラごとに持つ
    const guardKey = `${charId}:${patternId}`;
    let guard = this._effortGuards.get(guardKey);
    if (!guard) {
      guard = new EffortRepeatGuard(2);
      this._effortGuards.set(guardKey, guard);
    }

    // 抽選（連続同カテゴリなら1回だけリトライ）
    let category = pickCategory(patternId, charId);
    if (category && guard.shouldRepick(category)) {
      const retry = pickCategory(patternId, charId);
      if (retry) category = retry;
    }
    if (!category) return;

    guard.push(category);
    this._lastEffortAt = now;
    this.playNonVerbal(category, charId);
  }

  /**
   * 合成銃声SE（アセット不要、Web Audio API で直接合成）
   * weaponId: 'handgun' | 'shotgun'
   */
  playGunshot(weaponId = 'handgun') {
    if (!this._enabled) return;
    const ctx = this._audio.ensureContext();
    if (!ctx) return;
    const dest = this._audio.masterOutput;
    if (!dest) return;

    const isShotgun = weaponId === 'shotgun';
    const duration = isShotgun ? 0.18 : 0.10;
    const freqCenter = isShotgun ? 350 : 500;
    const peakVol = isShotgun ? 0.55 : 0.38;

    // ノイズバースト（白ノイズ＋指数減衰）
    const sampleCount = Math.ceil(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.18));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freqCenter;
    filter.Q.value = 0.7;

    const gainNode = ctx.createGain();
    const volBase = peakVol * this._vol('se', 1);
    gainNode.gain.setValueAtTime(volBase, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);
    noise.start();
    noise.stop(ctx.currentTime + duration + 0.01);
  }

  /**
   * 状態別BGM切替（戦闘・救出）
   * state: 'combat' | 'rescue' | null（null で通常ルームBGMに戻す）
   * 通常ルームBGMは一時停止し、状態BGMを前面に流す。
   * 状態終了時（null）に停止 → ルームBGM再開。
   */
  setStateBgm(state) {
    if (this._stateBgmActive === state) return;
    this._stateBgmActive = state;

    // 既存の状態BGM停止
    if (this._stateBgmController) {
      this._stateBgmController.stop();
      this._stateBgmController = null;
    }

    if (!state) {
      // 戦闘終了 → ルームBGM再開（同じルームで再度 switchRoomBgm 呼び出し）
      const room = this._currentBgmRoom;
      this._currentBgmRoom = null;
      if (room) this.switchRoomBgm(room);
      return;
    }

    // ルームBGMを一時停止
    if (this._bgmController) {
      this._bgmController.stop();
      this._bgmController = null;
    }

    const bgmPath = STATE_BGM[state];
    if (!bgmPath) return;

    const url = resolveAssetUrl(bgmPath);
    this._audio.playLoop({
      url,
      volume: this._vol('se', 0.22),
      tag: 'bgm-state',
      group: 'bgm',
    }).then(ctrl => {
      this._stateBgmController = ctrl;
    });
  }

  /** リロードSE（alarm.wav 流用） */
  playReload() {
    this.playSe(resolveAssetUrl('se/alarm.wav'));
  }

  /**
   * Rushモード ambient BGM 切替（時間帯別）
   * period: 'dawn' | 'day' | 'evening' | 'night' | 'latenight' | null
   * RUSH_AMBIENT_BGM に未充填（null）の period は何もしない（asset 待ち）
   */
  setRushAmbientPeriod(period) {
    if (this._rushAmbientPeriod === period) return;
    this._rushAmbientPeriod = period;

    if (this._rushAmbientController) {
      this._rushAmbientController.stop();
      this._rushAmbientController = null;
    }

    if (!period) return;
    const bgmPath = RUSH_AMBIENT_BGM[period];
    if (!bgmPath) return;

    const url = resolveAssetUrl(bgmPath);
    this._audio.playLoop({
      url,
      volume: this._vol('se', 0.18),
      tag: 'bgm-rush-ambient',
      group: 'bgm',
    }).then((ctrl) => {
      this._rushAmbientController = ctrl;
    });
  }

  /** 現在のボイスボリュームを返す */
  getVoiceVolume() {
    return this._vol('voice', 0.8);
  }

  destroy() {
    this._audio.stopAll();
    this._bgmController = null;
    this._stateBgmController = null;
  }

  _vol(group, base = 1) {
    const master = this._mix.master ?? 1;
    const level = this._mix[group] ?? 1;
    return Math.max(0, base * master * level);
  }
}
