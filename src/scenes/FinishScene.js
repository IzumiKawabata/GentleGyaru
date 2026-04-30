/**
 * FinishScene — フィニッシュ演出 + 余韻セリフ×2 + 約束 + 深ブラックアウト
 *
 * フェーズ（Izumi 2026-04-30 余韻拡張版）:
 *   0.0s  show: フィニッシュ画像 + finish-flash + vignette
 *   1.6s  余韻セリフ① （メニュー別、即座の反応）
 *   5.2s  余韻セリフ② （メニュー別、噛みしめる感じ）
 *   8.4s  最下位の約束（次の予感）
 *   11.0s deep-blackout 開始（2.0s かけて opacity 0→1）
 *   13.0s 自動遷移 (finish:complete)
 *
 * 状態の昇格（affectionStage 1→2、completedActs/menuUnlocked 更新）は
 * App.js の _gotoFinish 内で recordFinish() を介して既に実施済み。
 *
 * App は finish:complete を受けて、WaitingScene を show({ afterFinish: true })
 * で開く。「まだする？」連続セッション挨拶モード。
 */

import { VOICE_FILES } from '../game/GentleGalCharacter.js';
import { ChatBubbles } from '../ui/ChatBubbles.js';

export const FINISH_AFTERGLOW_1_MS = 1600;
export const FINISH_AFTERGLOW_2_MS = 5200;
export const FINISH_PROMISE_MS     = 8400;
export const FINISH_BLACKOUT_MS    = 11000;
export const FINISH_DURATION_MS    = 13000;

// 余韻セリフ①: 即座の反応（keepCount による反応の出し分け）
const AFTERGLOW_1_BUBBLES = [
  // ACT-01 (手の余韻)
  ['ふぅ...指つかれた？', 'んっ...そんなにビュッてさ', '手、汚しちゃったね'],
  // ACT-02 (口の余韻)
  ['んくっ...いっぱい出たじゃん', '口紅、よれちゃったかも', 'ふぅ...濃いね'],
  // ACT-03 (本番の余韻)
  ['はぁ...すご、いっぱい...', 'ぜんぶ受け止めた、よ', '...ちょっと動けない'],
];

// gain=0（早 Fire、加点なし）の特別反応: 「えっ、もう？」感
const AFTERGLOW_RUSHED = [
  'えっ...もう？早かったね？',
  'ふふっ、せっかちさん',
  'もうちょっと一緒にいてくれてもいいのに〜',
];

// gain=2（焦らし Keep 多めボーナス）の特別反応: 受容の温度感UP
const AFTERGLOW_PATIENT = [
  'ふぅ...ありがと、ゆっくり付き合ってくれて',
  'なんか、嬉しかった...焦らせなくて',
  'ね、こういうの、好き',
];

// 余韻セリフ②: 噛みしめる感じ
const AFTERGLOW_2_BUBBLES = [
  // ACT-01
  ['ネイル汚しちゃった、ま、また塗ればいっか', 'んふっ...意外と元気だね？', 'こんなにいっぱい貯めてたの？'],
  // ACT-02
  ['味...覚えちゃったかも', '飲んじゃった、けど黙っといて', 'ティッシュ、ある？'],
  // ACT-03
  ['ぜんぶ、ナカに...', 'はぁ...しばらくこのままでいい？', '溶けちゃった...動けない'],
];

const PROMISE_BUBBLES = [
  'ね、もうちょい一緒にいよ',
  '...次は何しよっか',
  'こんなに気持ちよくしちゃって、責任とってよ？',
  'まだ、いっぱい時間あるよ',
];

export class FinishScene {
  constructor({ bus, state, audio }) {
    this.bus = bus;
    this.state = state;
    this.audio = audio;
    this.root = document.getElementById('finish-scene');
    this.stage = document.getElementById('finish-stage');
    this.blackout = document.getElementById('deep-blackout');
    // 他シーンと同様に縦スタック（afterglow1 + afterglow2 + promise が積まれる）
    this.bubbles = new ChatBubbles(document.getElementById('finish-bubbles'), { max: 4 });

    this._timers = [];
    this._afterglow1Idx = [0, 0, 0];
    this._afterglow2Idx = [0, 0, 0];
    this._promiseIdx = 0;
  }

  show({ menuIndex = 0, gain = 1, keepCount = 0 } = {}) {
    if (!this.root) return;
    this.root.hidden = false;
    requestAnimationFrame(() => { this.root.dataset.shown = 'true'; });
    this._currentGain = gain;
    this._currentKeepCount = keepCount;
    this._renderStage(menuIndex);
    this._resetBlackout();
    this.bubbles.clear();
    this._cancelTimers();

    // BGM 停止 + フィニッシュボイス
    this.audio?.stopBgm();
    this.audio?.stopVoiceLoop();
    this.audio?.playVoice(VOICE_FILES.FINISH);

    // フェーズタイマー
    this._timers.push(setTimeout(() => this._showAfterglow1(menuIndex), FINISH_AFTERGLOW_1_MS));
    this._timers.push(setTimeout(() => this._showAfterglow2(menuIndex), FINISH_AFTERGLOW_2_MS));
    this._timers.push(setTimeout(() => this._showPromise(),             FINISH_PROMISE_MS));
    this._timers.push(setTimeout(() => this._activateBlackout(),        FINISH_BLACKOUT_MS));
    this._timers.push(setTimeout(() => this.bus.emit('finish:complete'), FINISH_DURATION_MS));
  }

  hide() {
    if (this.root) {
      this.root.dataset.shown = 'false';
      this.root.hidden = true;
    }
    this._cancelTimers();
    this._resetBlackout();
    this.bubbles.clear();
  }

  _renderStage(menuIndex) {
    if (!this.stage) return;
    const n = String(Math.max(0, Math.min(2, menuIndex)) + 1).padStart(2, '0');
    this.stage.style.backgroundImage = `url("assets/images/finish/fin-${n}.webp")`;
  }

  _showAfterglow1(menuIndex) {
    // gain による特別反応（早 Fire は「えっ、もう？」、焦らし Keep は「ありがと」）
    let pool;
    if (this._currentGain >= 2) {
      pool = AFTERGLOW_PATIENT;
    } else if (this._currentGain === 0 && menuIndex !== 2 && this._currentKeepCount === 0) {
      // ACT-03 は加点なし設計なので除外、純粋な早 Fire のみ
      pool = AFTERGLOW_RUSHED;
    } else {
      pool = AFTERGLOW_1_BUBBLES[Math.max(0, Math.min(2, menuIndex))] || AFTERGLOW_1_BUBBLES[0];
    }
    const idx = this._afterglow1Idx[menuIndex] % pool.length;
    this._afterglow1Idx[menuIndex]++;
    this.bubbles.push('char', pool[idx]);
  }

  _showAfterglow2(menuIndex) {
    const pool = AFTERGLOW_2_BUBBLES[Math.max(0, Math.min(2, menuIndex))] || AFTERGLOW_2_BUBBLES[0];
    const idx = this._afterglow2Idx[menuIndex] % pool.length;
    this._afterglow2Idx[menuIndex]++;
    this.bubbles.push('char', pool[idx]);
  }

  _showPromise() {
    const idx = this._promiseIdx % PROMISE_BUBBLES.length;
    this._promiseIdx++;
    this.bubbles.push('char', PROMISE_BUBBLES[idx]);
  }

  _activateBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'true';
  }

  _resetBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'false';
  }

  _cancelTimers() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  }
}
