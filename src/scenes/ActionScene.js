/**
 * ActionScene — 行為シーン（Fire/Keep choice 制）
 *
 * Izumi 2026-05-01 改修:
 *   - フルボイス（start1/start2/keep[0]/keep[1] すべて voice）
 *   - voice-driven pacing（バブル/Fire prompt はボイス終了を待つ）
 *   - タップで現在ステップ早送り（TapAdvancer）
 *
 * - 選択メニューに応じたループアニメ表示（ACT-01/02/03）
 * - プレイ中 ambient ループ voice（act-loop/m{0,1,2}）
 * - 開始 voice → ② ボイス → Fire/Keep prompt
 * - Fire: フィニッシュ遷移
 * - Keep: 2 行返し → 再 prompt
 */

import { getActImage, BGM_FILES, SE_FILES, VOICE_POOLS } from '../game/GentleGalCharacter.js';
import { hapticsBridge } from '../utils/hapticsBridge.js';
import { ChatBubbles } from '../ui/ChatBubbles.js';
import { TapAdvancer } from '../utils/TapAdvancer.js';

// 入場時のゆっくり暗転 → フェードアウト時間（CSS の transition と揃える）
// 2s（finish→home の deep-blackout 2s フェードと揃える）
export const ACTION_BLACKOUT_FADE_MS = 2_000;
// 開始セリフ前の暗転明け待ち（暗転 fade-out + 200ms 余韻）
const ENTRY_PRE_BUBBLE_MS = 2_200;
// バブル間のブレス
const BUBBLE_BREATH_MS = 600;
// Fire prompt 出現前の余韻（start2 ボイス終了から）
const FIRE_PROMPT_GAP_MS = 1_200;
// Keep 後の N 言タイミング
const KEEP_REPLY_BREATH_MS = 600;
const KEEP_REPROMPT_AFTER_REPLIES_MS = 1_200;

// 開始セリフ ① 様子伺い（メニュー別、VOICE_POOLS.START1 と 1:1）
const START_BUBBLES_1 = [
  ['力加減だいじょぶ？', 'どう...かな？', 'かちかちだね...'],
  ['んっ…おっきい...', 'ちゃんと？...きもちいい？', 'リラックスしてね...'],
  ['ん...やさしくね...'],
];

// 開始セリフ ② 受容ひとこと（固定 1 文 / メニュー、VOICE_POOLS.START2 と 1:1）
const START_2_FIXED = [
  'いきたくなったら...いつでもいいからね',
  'いきそうになったら、そのまま出してね。',
  'そのまま、きてっ',
];

// Keep 返し（メニュー別、固定順序、VOICE_POOLS.KEEP[m][0/1] と 1:1）
const KEEP_REPLIES_POOL = [
  ['まだガチガチじゃん〜...どんだけ溜まってたの？', 'ね、もうちょい付き合って？'],
  ['んっ...まだ硬いね', 'もうちょい...口で、いいよ？'],
  ['ん...このまま、もっと...', 'もうちょっと、こうしてよ'],
];

export class ActionScene {
  constructor({ bus, state, audio }) {
    this.bus = bus;
    this.state = state;
    this.audio = audio;
    this.root = document.getElementById('action-scene');
    this.stage = document.getElementById('action-stage');
    this.blackout = document.getElementById('action-blackout');
    this.bubbles = new ChatBubbles(document.getElementById('action-bubbles'), { max: 3 });

    this.currentMenuIndex = 0;
    this.keepCount = 0;
    this._start1Idx = [0, 0, 0];
    this._currentPromptGroup = null;
    this._sequenceCancelled = false;

    this._advancer = new TapAdvancer({
      rootEl: this.root,
      onSkip: () => this.audio?.stopVoice(),
    });
  }

  show({ menuIndex = 0 } = {}) {
    if (!this.root) return;
    this.currentMenuIndex = menuIndex;
    this.keepCount = 0;
    this._sequenceCancelled = false;
    this.root.hidden = false;
    requestAnimationFrame(() => { this.root.dataset.shown = 'true'; });
    this._renderStage(menuIndex);
    this._currentPromptGroup = null;
    this.bubbles.clear();

    // 行為 BGM + ambient 喘ぎ声ループ
    this.audio?.startBgm(BGM_FILES.ACT);
    const m = Math.max(0, Math.min(2, menuIndex));
    this.audio?.startVoiceLoop(VOICE_POOLS.ACT_LOOP[m]);

    // 入場時のゆっくり暗転フェードアウト
    this._activateBlackout();
    setTimeout(() => this._fadeOutBlackout(), 50);

    this._advancer.bind();
    this._runStartSequence(menuIndex);
  }

  hide() {
    if (this.root) {
      this.root.dataset.shown = 'false';
      this.root.hidden = true;
    }
    this._sequenceCancelled = true;
    this._activateBlackout();
    this.audio?.stopVoiceLoop();
    this._advancer.unbind();
    this.bubbles?.clear();
  }

  _isAlive() {
    return !this._sequenceCancelled && !this.root?.hidden;
  }

  _activateBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'true';
  }

  _fadeOutBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'false';
  }

  _renderStage(menuIndex) {
    if (!this.stage) return;
    this.stage.style.backgroundImage = `url("${getActImage(menuIndex)}")`;
  }

  /**
   * 開始シーケンス: 暗転明け → start1 → ブレス → start2 → ブレス → Fire/Keep prompt
   */
  async _runStartSequence(menuIndex) {
    const m = Math.max(0, Math.min(2, menuIndex));

    // 暗転明け待ち
    await this._advancer.sleep(ENTRY_PRE_BUBBLE_MS);
    if (!this._isAlive()) return;

    // start1: ランダムプール
    const pool1 = START_BUBBLES_1[m];
    const voicePool1 = VOICE_POOLS.START1[m];
    const idx1 = this._start1Idx[m] % pool1.length;
    this._start1Idx[m]++;
    this.bubbles.push('char', pool1[idx1]);
    await this._advancer.step(this.audio?.playVoice(voicePool1[idx1]) ?? Promise.resolve());
    if (!this._isAlive()) return;

    // ブレス
    await this._advancer.sleep(BUBBLE_BREATH_MS);
    if (!this._isAlive()) return;

    // start2: 固定 1 文 + voice
    this.bubbles.push('char', START_2_FIXED[m]);
    await this._advancer.step(this.audio?.playVoice(VOICE_POOLS.START2[m]) ?? Promise.resolve());
    if (!this._isAlive()) return;

    // Fire/Keep prompt
    await this._advancer.sleep(FIRE_PROMPT_GAP_MS);
    if (!this._isAlive()) return;
    this._showFirePrompt();
  }

  _showFirePrompt() {
    if (this._currentPromptGroup) return;
    if (typeof hapticsBridge?.tap === 'function') hapticsBridge.tap();
    this._currentPromptGroup = this.bubbles.pushChoices(
      [
        { label: 'Fire', icon: '🔥' },
        { label: 'Keep' },
      ],
      (idx) => this._onPromptPick(idx),
      { variant: 'actions' },
    );
  }

  async _onPromptPick(idx) {
    const group = this._currentPromptGroup;
    this._currentPromptGroup = null;
    this.bubbles.keepOnly(group, idx);

    if (idx === 0) {
      // Fire: splash.mp3 + finish 遷移
      this.audio?.playSe(SE_FILES.SPLASH);
      if (typeof hapticsBridge?.fire === 'function') hapticsBridge.fire();
      this.bus.emit('request:finish');
    } else {
      // Keep: 2行返し（1文目 voice、2文目 voice）→ 再 prompt
      this.keepCount++;
      const m = Math.max(0, Math.min(2, this.currentMenuIndex));
      const pool = KEEP_REPLIES_POOL[m];
      const voicePool = VOICE_POOLS.KEEP[m];

      // 1文目: voice 終了待ち
      await this._advancer.sleep(280);
      if (!this._isAlive()) return;
      this.bubbles.push('char', pool[0]);
      await this._advancer.step(this.audio?.playVoice(voicePool[0]) ?? Promise.resolve());
      if (!this._isAlive()) return;

      await this._advancer.sleep(KEEP_REPLY_BREATH_MS);
      if (!this._isAlive()) return;

      // 2文目: voice 終了待ち
      this.bubbles.push('char', pool[1]);
      await this._advancer.step(this.audio?.playVoice(voicePool[1]) ?? Promise.resolve());
      if (!this._isAlive()) return;

      await this._advancer.sleep(KEEP_REPROMPT_AFTER_REPLIES_MS);
      if (!this._isAlive()) return;
      this._showFirePrompt();
    }
  }
}
