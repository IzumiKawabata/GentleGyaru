/**
 * WaitingScene — 待機画面（白黒ミニマル / チャット内選択肢 / 1ラリー）
 *
 * 1ラリー = キャラ発話 → 選択肢グループ → プレイヤー選択 → キャラ応答 → 次の選択肢
 * すべて bubble-track 内に縦に積まれる。
 *
 * afterFinish モード:
 *   App から show({ afterFinish: true }) で呼ばれた時、フィニッシュ直後の
 *   「まだする？」連続セッション感を出す（時間スキップなし）。
 */

import { getWaitImage, BGM_FILES, SE_FILES, VOICE_FILES } from '../game/GentleGalCharacter.js';
import { canDoMain, recordMainReject } from '../game/GentleGalState.js';
import { ChatBubbles } from '../ui/ChatBubbles.js';
import { renderLoveGauge } from '../ui/LoveGaugeUI.js';

// エンディングのテンポ感（afterglow1=1.6s, afterglow2=5.2s 等）と揃える
const TRANSITION_MS = 2200;

// 起動時の挨拶テンポ（駛馬 = テンポ速め。ActionScene 開始セリフより速い）
const GREET_BUBBLE_1_MS = 0;
const GREET_BUBBLE_2_MS = 1000;
const GREET_CHOICES_MS  = 2000;

// 本番選択時、loveGauge 不足での reject バブル
// 進捗を絵文字（💗）で示す
const MAIN_REJECT_BUBBLES = [
  'ん〜...もうちょっと仲良くなってからぁ',
  'まだ早いって。あとちょっとで本気出してあげる',
  'もうちょっと焦らされないと、ね？',
];

// 起動時2セリフ: ① 様子伺い → ② 受容/気遣いひとこと（ActionScene と同じ哲学）
const GREETING_BUBBLES_1 = {
  1: ['よろしく〜。なに、緊張してる？', 'はじめまして？...かな', 'ふふっ、なんか緊張する〜'],
  2: ['お、戻ってきたんだ', 'また会えた...嬉しい', 'おっ、よく来たじゃん'],
};

const GREETING_BUBBLES_2 = {
  1: ['ゆっくりでいいよ、無理しないで', '焦らなくていいから、ね？', '気楽にいこ？'],
  2: ['今日もよろしくね', '今日はなにしよっか', 'ゆっくり時間あるからさ'],
};

// フィニッシュ直後の連続セッション挨拶（時間スキップなし）
const AFTER_FINISH_GREETINGS_1 = [
  'ふぅ...まだする？',
  'まだ余裕じゃん？',
  'もう一回いっとく？',
  'ね、もうちょい付き合ってよ',
];

const AFTER_FINISH_GREETINGS_2 = [
  '焦らせないで、ね？',
  'ゆっくり、付き合ってあげる',
  '無理しないでよ？',
  'いつでも止めていいからね',
];

// メニュー選択肢の絵文字（ノンバーバル原則）
const CHOICE_LABELS = ['✋ 手で', '💋 口で', '💞 本番で'];

const ACCEPT_BUBBLES = [
  ['任せて〜...指、すっごく丁寧にいくね', 'やさしくしてあげる', 'ふふ、じゃ手だしな？'],
  ['ん〜...いいよ、口で。', 'リップ落ちちゃうけど、ま、いっか', 'ちょっと、目つぶってて'],
  ['本気でいくの？...いいよ、ちゃんと受け止める', 'ここまで来たら全部あげる', 'もう、しょうがないな〜'],
];

export class WaitingScene {
  constructor({ bus, state, audio }) {
    this.bus = bus;
    this.state = state;
    this.audio = audio;
    this.root = document.getElementById('waiting-scene');
    this.stage = document.getElementById('waiting-stage');
    this.resetBtn = document.getElementById('reset-btn');
    this.bubbles = new ChatBubbles(document.getElementById('waiting-bubbles'), { max: 10 });

    this._bound = false;
    this._rejectIdx = 0;
    this._acceptIdx = [0, 0, 0];
    this._transitioning = false;
    this._currentChoiceGroup = null;
    this._greetTimers = [];
  }

  show({ afterFinish = false } = {}) {
    if (!this.root) return;
    this.root.hidden = false;
    // 次フレームで data-shown を立てて 1s フェードイン
    requestAnimationFrame(() => { this.root.dataset.shown = 'true'; });
    this._renderStage();
    this.bubbles.clear();
    this._transitioning = false;
    this._currentChoiceGroup = null;
    this._cancelGreetTimers();
    this._bind();
    renderLoveGauge(this.state);

    // 起動時/帰還時も ActionScene と同じテンポ感: ① 様子伺い → ② 気遣い → 選択肢
    const [g1, g2] = this._chooseGreetingPair(afterFinish);
    this._greetTimers.push(setTimeout(() => this.bubbles.push('char', g1), GREET_BUBBLE_1_MS));
    this._greetTimers.push(setTimeout(() => this.bubbles.push('char', g2), GREET_BUBBLE_2_MS));
    this._greetTimers.push(setTimeout(() => this._renderChoices(), GREET_CHOICES_MS));

    // 待機 BGM 開始 + 挨拶ボイス
    this.audio?.startBgm(BGM_FILES.WAIT);
    const greetingFile = this.state.affectionStage === 2
      ? VOICE_FILES.WAIT_STAGE_2
      : VOICE_FILES.WAIT_STAGE_1;
    setTimeout(() => this.audio?.playVoice(greetingFile), 200);
  }

  hide() {
    if (this.root) {
      this.root.dataset.shown = 'false';
      this.root.hidden = true;
    }
    this._cancelGreetTimers();
  }

  _cancelGreetTimers() {
    for (const t of this._greetTimers) clearTimeout(t);
    this._greetTimers = [];
  }

  _renderStage() {
    if (!this.stage) return;
    const url = getWaitImage(this.state.affectionStage);
    this.stage.style.backgroundImage = `url("${url}")`;
  }

  _chooseGreetingPair(afterFinish) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (afterFinish) {
      return [pick(AFTER_FINISH_GREETINGS_1), pick(AFTER_FINISH_GREETINGS_2)];
    }
    const stage = this.state.affectionStage === 2 ? 2 : 1;
    return [pick(GREETING_BUBBLES_1[stage]), pick(GREETING_BUBBLES_2[stage])];
  }

  _scheduleChoices(delay = 0) {
    this._greetTimers.push(setTimeout(() => this._renderChoices(), delay));
  }

  _renderChoices() {
    const mainOk = canDoMain(this.state);
    // ACT-03 は conditional だけ伝える。ラベルは固定（ゲージ進捗は左上の love-gauge UI で表現）
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
    if (this._bound) return;
    this._bound = true;

    this.resetBtn?.addEventListener('click', () => {
      const now = Date.now();
      if (this._lastResetTap && now - this._lastResetTap < 600) {
        this.bus.emit('request:reset');
        this._lastResetTap = 0;
      } else {
        this._lastResetTap = now;
        this.bubbles.push('char', '本当に消す？もう1回タップで...');
      }
    });
  }

  _onChoiceTap(menuIndex) {
    if (this._transitioning) return;

    this.audio?.resume();
    this.audio?.playSe(SE_FILES.TAP);

    // ACT-03 本番は loveGauge MAX 必須。不足なら reject
    if (menuIndex === 2 && !canDoMain(this.state)) {
      this._handleMainReject(menuIndex);
      return;
    }
    this._handleAccept(menuIndex);
  }

  _handleAccept(menuIndex) {
    this._transitioning = true;

    // 選んだ選択肢以外はアニメーションで折りたたみ消去
    this.bubbles.keepOnly(this._currentChoiceGroup, menuIndex);
    this._currentChoiceGroup = null;

    // プレイヤー発話 → 280ms後にキャラOK系 → 1秒余韻 → action 遷移
    setTimeout(() => {
      const pool = ACCEPT_BUBBLES[menuIndex] || ACCEPT_BUBBLES[0];
      const idx = this._acceptIdx[menuIndex] % pool.length;
      this._acceptIdx[menuIndex]++;
      this.bubbles.push('char', pool[idx]);
    }, 280);

    setTimeout(() => {
      this.bus.emit('request:action', { menuIndex });
    }, 280 + TRANSITION_MS);
  }

  _handleMainReject(menuIndex) {
    // 「本番で」を選んだが loveGauge < MAX → reject + ゲージ-1（強要ペナルティ）
    // ゲージ可視化は左上の love-gauge UI に任せ、バブルは reject セリフのみ
    this.bubbles.keepOnly(this._currentChoiceGroup, menuIndex);
    recordMainReject(this.state);
    renderLoveGauge(this.state);

    const text = MAIN_REJECT_BUBBLES[this._rejectIdx % MAIN_REJECT_BUBBLES.length];
    this._rejectIdx++;
    setTimeout(() => {
      this.bubbles.push('char', text);
      this.audio?.playVoice(VOICE_FILES.REJECT_LOCKED);
      // 新しい選択肢グループを再提示
      this._scheduleChoices(1700);
    }, 320);
  }
}
