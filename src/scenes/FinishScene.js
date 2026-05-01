/**
 * FinishScene — フィニッシュ演出 + 余韻セリフ + 約束 + 深ブラックアウト
 *
 * Izumi 2026-05-01 改修:
 *   - フルボイス（afterglow + promise とも voice）
 *   - voice-driven pacing
 *   - タップで現在ステップ早送り
 *
 * フェーズ:
 *   show:                          フィニッシュ画像 + flash + vignette
 *   1.6s afterglow （or rushed/patient）voice 終了待ち
 *   ブレス
 *   promise voice 終了待ち
 *   ブレス → blackout 開始（2.0s フェード）
 *   blackout 完了で finish:complete
 */

import { VOICE_POOLS } from '../game/GentleGalCharacter.js';
import { ChatBubbles } from '../ui/ChatBubbles.js';
import { TapAdvancer } from '../utils/TapAdvancer.js';

export const FINISH_AFTERGLOW_DELAY_MS = 1600;
export const FINISH_BREATH_MS          = 1200;
export const FINISH_BLACKOUT_FADE_MS   = 2000;
export const FINISH_HOLD_AFTER_BLACKOUT_MS = 800;

// 余韻セリフ: 即座の反応（VOICE_POOLS.AFTERGLOW1 と 1:1）
const AFTERGLOW_1_BUBBLES = [
  ['んっ....びゅーびゅーでてる...', 'あっ...すっごい量...'],
  ['んくっ...いっぱい出たじゃん', 'んぅ...すっごい濃いね'],
  ['はぁ...はぁ...あんたとするの...好きかも...'],
];

// gain=0（早 Fire）特別反応
const AFTERGLOW_RUSHED = [
  'ふふ...いっぱい貯めてたんだね',
  'もうちょっと一緒にいてくれてもいいのに〜',
];

// gain=2（焦らし Keep 多めボーナス）
const AFTERGLOW_PATIENT = [
  'ふぅ...ありがと、ゆっくり付き合ってくれて',
  'なんか、嬉しかった...焦らせなくて',
];

// 約束 — 固定 1 文、voice あり
const PROMISE_FIXED = 'ね、もうちょい一緒にいよ';

export class FinishScene {
  constructor({ bus, state, audio }) {
    this.bus = bus;
    this.state = state;
    this.audio = audio;
    this.root = document.getElementById('finish-scene');
    this.stage = document.getElementById('finish-stage');
    this.blackout = document.getElementById('deep-blackout');
    this.bubbles = new ChatBubbles(document.getElementById('finish-bubbles'), { max: 3 });

    this._afterglowIdx = [0, 0, 0];
    this._sequenceCancelled = false;

    this._advancer = new TapAdvancer({
      rootEl: this.root,
      onSkip: () => this.audio?.stopVoice(),
    });
  }

  show({ menuIndex = 0, gain = 1, keepCount = 0 } = {}) {
    if (!this.root) return;
    this.root.hidden = false;
    requestAnimationFrame(() => { this.root.dataset.shown = 'true'; });
    this._currentGain = gain;
    this._currentKeepCount = keepCount;
    this._currentMenuIndex = menuIndex;
    this._sequenceCancelled = false;
    this._renderStage(menuIndex);
    this._resetBlackout();
    this.bubbles.clear();

    // BGM 停止 + voice ループ停止
    this.audio?.stopBgm();
    this.audio?.stopVoiceLoop();

    this._advancer.bind();
    this._runFinishSequence();
  }

  hide() {
    if (this.root) {
      this.root.dataset.shown = 'false';
      this.root.hidden = true;
    }
    this._sequenceCancelled = true;
    this._resetBlackout();
    this._advancer.unbind();
    this.bubbles.clear();
  }

  _isAlive() {
    return !this._sequenceCancelled && !this.root?.hidden;
  }

  _renderStage(menuIndex) {
    if (!this.stage) return;
    const n = String(Math.max(0, Math.min(2, menuIndex)) + 1).padStart(2, '0');
    this.stage.style.backgroundImage = `url("assets/images/finish/fin-${n}.webp")`;
  }

  /**
   * フィニッシュシーケンス: afterglow → ブレス → promise → ブレス → blackout → 遷移
   */
  async _runFinishSequence() {
    // afterglow までの待ち（演出時間）
    await this._advancer.sleep(FINISH_AFTERGLOW_DELAY_MS);
    if (!this._isAlive()) return;

    // afterglow 1 (gain によって rushed / patient / 通常)
    const m = Math.max(0, Math.min(2, this._currentMenuIndex));
    let pool, voicePool;
    if (this._currentGain >= 2) {
      pool = AFTERGLOW_PATIENT;
      voicePool = VOICE_POOLS.PATIENT;
    } else if (this._currentGain === 0 && this._currentMenuIndex !== 2 && this._currentKeepCount === 0) {
      pool = AFTERGLOW_RUSHED;
      voicePool = VOICE_POOLS.RUSHED;
    } else {
      pool = AFTERGLOW_1_BUBBLES[m] || AFTERGLOW_1_BUBBLES[0];
      voicePool = VOICE_POOLS.AFTERGLOW1[m] || VOICE_POOLS.AFTERGLOW1[0];
    }
    const idx = this._afterglowIdx[m] % pool.length;
    this._afterglowIdx[m]++;
    this.bubbles.push('char', pool[idx]);
    await this._advancer.step(this.audio?.playVoice(voicePool[idx]) ?? Promise.resolve());
    if (!this._isAlive()) return;

    // ブレス → promise
    await this._advancer.sleep(FINISH_BREATH_MS);
    if (!this._isAlive()) return;

    // promise: 固定 1 文 + voice
    this.bubbles.push('char', PROMISE_FIXED);
    await this._advancer.step(this.audio?.playVoice(VOICE_POOLS.PROMISE) ?? Promise.resolve());
    if (!this._isAlive()) return;

    // ブレス → blackout 開始（2.0s フェード）→ 完了で finish:complete
    await this._advancer.sleep(FINISH_BREATH_MS);
    if (!this._isAlive()) return;
    this._activateBlackout();
    await this._advancer.sleep(FINISH_BLACKOUT_FADE_MS + FINISH_HOLD_AFTER_BLACKOUT_MS);
    if (!this._isAlive()) return;
    this.bus.emit('finish:complete');
  }

  _activateBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'true';
  }

  _resetBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'false';
  }
}
