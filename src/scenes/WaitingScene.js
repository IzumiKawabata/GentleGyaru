/**
 * WaitingScene — 待機画面（白黒ミニマル / チャット内選択肢 / 1ラリー）
 *
 * 1ラリー = キャラ発話 → 選択肢グループ → プレイヤー選択 → キャラ応答 → 次の選択肢
 * すべて bubble-track 内に縦に積まれる。
 *
 * Izumi 2026-05-01 改修:
 *   - フルボイス（1文目・2文目とも voice 再生）
 *   - voice-driven pacing（バブル/遷移はボイス終了を待つ）
 *   - タップで現在ステップを早送り（TapAdvancer）
 *
 * afterFinish モード:
 *   App から show({ afterFinish: true }) で呼ばれた時、フィニッシュ直後の
 *   「まだする？」連続セッション感を出す。
 */

import { getWaitImage, BGM_FILES, VOICE_POOLS } from '../game/GentleGalCharacter.js';
import { canDoMain, recordMainReject } from '../game/GentleGalState.js';
import { ChatBubbles } from '../ui/ChatBubbles.js';
import { renderLoveGauge } from '../ui/LoveGaugeUI.js';
import { TapAdvancer } from '../utils/TapAdvancer.js';

// 起動時の挨拶テンポ（voice 終了後のブレス＝呼吸間）
const BREATH_BEFORE_GREET2_MS = 700;
const BREATH_BEFORE_CHOICES_MS = 900;
// 初回起動時のみ追加遅延: スプラッシュ fade-out (1s) + シーン fade-in (1s) 待ち
const INITIAL_LAUNCH_DELAY_MS = 1500;
// メニュー選択後の余韻（ACCEPT バブル/voice 完了後 → action 遷移）
const POST_ACCEPT_BREATH_MS = 700;
// reject バブル後 → 選択肢再表示
const POST_REJECT_BREATH_MS = 1200;

// 本番選択時、loveGauge 不足での reject バブル（VOICE_POOLS.REJECT と 1:1）
const MAIN_REJECT_BUBBLES = [
  'ん〜...もうちょっと仲良くなってからぁ',
  'もうちょっと、してからね？...楽しみにしてて',
];

// 起動時 1文目（様子伺い）— ランダムプール
const GREETING_BUBBLES_1 = {
  1: ['よろしく〜。あれっ、緊張してる？', 'はじめましてだよね、なんか嬉しいかも〜'],
  2: ['また会えたね...おかえり💕', 'おっ！やっほ～！'],
};

// 起動時 2文目（受容ひとこと）— 固定 1 文 / Stage、voice あり
const GREETING_2_FIXED = {
  1: 'ゆっくりだから、安心して？',
  2: 'ゆっくり時間あるから楽しも...?',
};

// afterFinish 1文目（連続セッション挨拶）— ランダムプール
const AFTER_FINISH_GREETINGS_1 = [
  'いっぱいでたね...',
  'まだちんこガチガチじゃん...',
  'ねぇ....もうちょい付き合ってよ',
];

// afterFinish 2文目 — 固定 1 文、voice あり
const AFTER_FINISH_2_FIXED = 'ふふ...ゆっくり焦らないで';

// メニュー選択肢の絵文字（ノンバーバル原則）
const CHOICE_LABELS = ['✋ 手で', '💋 口で', '💞 本番で'];

const ACCEPT_BUBBLES = [
  ['おっけー、ズボン...降ろしてくれる？', 'まかせて...やさしくしてあげる。'],
  ['口ね。おっけ～', 'ぷるぷるリップで...いいの？嬉しい〜'],
  ['えっ....ん...いい...よ', 'もう～しょうがないなぁ...'],
];

export class WaitingScene {
  constructor({ bus, state, audio }) {
    this.bus = bus;
    this.state = state;
    this.audio = audio;
    this.root = document.getElementById('waiting-scene');
    this.stage = document.getElementById('waiting-stage');
    this.bubbles = new ChatBubbles(document.getElementById('waiting-bubbles'), { max: 10 });

    this._bound = false;
    this._rejectIdx = 0;
    this._acceptIdx = [0, 0, 0];
    this._transitioning = false;
    this._currentChoiceGroup = null;
    this._initialLaunch = true;
    // タップで音声 + 待機を skip
    this._advancer = new TapAdvancer({
      rootEl: this.root,
      onSkip: () => this.audio?.stopVoice(),
    });
    this._currentSequence = null;
  }

  show({ afterFinish = false } = {}) {
    if (!this.root) return;
    this.root.hidden = false;
    requestAnimationFrame(() => { this.root.dataset.shown = 'true'; });
    this._renderStage();
    this.bubbles.clear();
    this._transitioning = false;
    this._currentChoiceGroup = null;
    this._bind();
    this._advancer.bind();
    renderLoveGauge(this.state);

    // 待機 BGM
    this.audio?.startBgm(BGM_FILES.WAIT);

    // 挨拶シーケンス（voice-driven pacing）
    this._currentSequence = this._runGreetingSequence(afterFinish);
  }

  hide() {
    if (this.root) {
      this.root.dataset.shown = 'false';
      this.root.hidden = true;
    }
    this._advancer.unbind();
  }

  /**
   * 挨拶シーケンス: 1文目 (voice) → ブレス → 2文目 (voice) → ブレス → 選択肢
   * voice 終了で次へ進む。タップでボイス + 待機 skip。
   */
  async _runGreetingSequence(afterFinish) {
    const { texts: [g1Text, g2Text], voices: [g1Voice, g2Voice] } =
      this._chooseGreetingPair(afterFinish);

    // 初回起動時のみ待機（splash fade 後）
    if (this._initialLaunch && !afterFinish) {
      await this._advancer.sleep(INITIAL_LAUNCH_DELAY_MS);
    }
    this._initialLaunch = false;
    if (!this._isAlive()) return;

    // 1文目: バブル + voice → 終了待ち
    this.bubbles.push('char', g1Text);
    await this._advancer.step(this.audio?.playVoice(g1Voice) ?? Promise.resolve());
    if (!this._isAlive()) return;

    // ブレス
    await this._advancer.sleep(BREATH_BEFORE_GREET2_MS);
    if (!this._isAlive()) return;

    // 2文目: バブル + voice → 終了待ち
    this.bubbles.push('char', g2Text);
    await this._advancer.step(this.audio?.playVoice(g2Voice) ?? Promise.resolve());
    if (!this._isAlive()) return;

    // ブレス → 選択肢
    await this._advancer.sleep(BREATH_BEFORE_CHOICES_MS);
    if (!this._isAlive()) return;
    this._renderChoices();
  }

  _isAlive() {
    return !this.root?.hidden && !this._transitioning;
  }

  _renderStage() {
    if (!this.stage) return;
    const url = getWaitImage(this.state.affectionStage);
    this.stage.style.backgroundImage = `url("${url}")`;
  }

  _chooseGreetingPair(afterFinish) {
    const pickIdx = (arr) => Math.floor(Math.random() * arr.length);
    if (afterFinish) {
      const i1 = pickIdx(AFTER_FINISH_GREETINGS_1);
      return {
        texts:  [AFTER_FINISH_GREETINGS_1[i1], AFTER_FINISH_2_FIXED],
        voices: [VOICE_POOLS.AFTER_FINISH_1[i1], VOICE_POOLS.AFTER_FINISH_2],
      };
    }
    const stage = this.state.affectionStage === 2 ? 2 : 1;
    const pool1 = GREETING_BUBBLES_1[stage];
    const i1 = pickIdx(pool1);
    return {
      texts:  [pool1[i1], GREETING_2_FIXED[stage]],
      voices: [VOICE_POOLS.GREET1[stage][i1], VOICE_POOLS.GREET2[stage]],
    };
  }

  _renderChoices() {
    const mainOk = canDoMain(this.state);
    const items = CHOICE_LABELS.map((label, i) => (
      i === 2 ? { label, conditional: !mainOk } : { label }
    ));
    this._currentChoiceGroup = this.bubbles.pushChoices(
      items,
      (idx) => this._onChoiceTap(idx),
      { variant: 'actions' },
    );
  }

  _bind() {
    // リセットボタン廃止（Izumi 2026-05-01）。bind 不要だが将来用に no-op 残す。
    if (this._bound) return;
    this._bound = true;
  }

  _onChoiceTap(menuIndex) {
    if (this._transitioning) return;
    this.audio?.resume();

    if (menuIndex === 2 && !canDoMain(this.state)) {
      this._handleMainReject(menuIndex);
      return;
    }
    this._handleAccept(menuIndex);
  }

  /**
   * メニュー受諾: ACCEPT バブル + voice 終了 → ブレス → action 遷移
   */
  async _handleAccept(menuIndex) {
    this._transitioning = true;
    this.bubbles.keepOnly(this._currentChoiceGroup, menuIndex);
    this._currentChoiceGroup = null;

    const m = Math.max(0, Math.min(2, menuIndex));
    const pool = ACCEPT_BUBBLES[m];
    const voicePool = VOICE_POOLS.ACCEPT[m];
    const idx = this._acceptIdx[m] % pool.length;
    this._acceptIdx[m]++;

    // 280ms の余白でプレイヤー選択の余韻 → ACCEPT バブル + voice
    await this._advancer.sleep(280);
    this.bubbles.push('char', pool[idx]);
    await this._advancer.step(this.audio?.playVoice(voicePool[idx]) ?? Promise.resolve());
    await this._advancer.sleep(POST_ACCEPT_BREATH_MS);

    this.bus.emit('request:action', { menuIndex });
  }

  /**
   * 本番強要拒否: reject バブル + voice 終了 → ブレス → 選択肢再表示
   */
  async _handleMainReject(menuIndex) {
    this.bubbles.keepOnly(this._currentChoiceGroup, menuIndex);
    recordMainReject(this.state);
    renderLoveGauge(this.state);

    const idx = this._rejectIdx % MAIN_REJECT_BUBBLES.length;
    const text = MAIN_REJECT_BUBBLES[idx];
    const voice = VOICE_POOLS.REJECT[idx];
    this._rejectIdx++;

    await this._advancer.sleep(320);
    this.bubbles.push('char', text);
    await this._advancer.step(this.audio?.playVoice(voice) ?? Promise.resolve());
    await this._advancer.sleep(POST_REJECT_BREATH_MS);

    this._renderChoices();
  }
}
