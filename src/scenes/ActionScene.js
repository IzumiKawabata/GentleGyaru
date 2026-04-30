/**
 * ActionScene — 行為シーン（Fire/Keep choice 制）
 *
 * - 選択メニューに応じたループアニメ表示（ACT-01/02/03）
 * - FIRE_PROMPT_MS 経過後に choice-group「🔥 Fire / Keep」を表示
 * - Fire: フィニッシュ遷移
 * - Keep: 会話継続（キャラ反応バブル → 数秒後に再 prompt）
 * - キャラ画タップでも反応バブル（任意）
 */

import { getActImage, BGM_FILES, SE_FILES, VOICE_FILES, PLAY_TAP_VOICES } from '../game/GentleGalCharacter.js';
import { hapticsBridge } from '../utils/hapticsBridge.js';
import { ChatBubbles } from '../ui/ChatBubbles.js';
import { renderLoveGauge } from '../ui/LoveGaugeUI.js';

// 入場時のゆっくり暗転 → フェードアウト時間（CSS の transition と揃える）
export const ACTION_BLACKOUT_FADE_MS = 1_600;
// 開始セリフ ① 様子伺い、② 優しいひとこと（受容と優しさが芯のキャラ哲学）
export const ACTION_START_BUBBLE_1_MS = 2_100;
export const ACTION_START_BUBBLE_2_MS = 4_400;
// Fire/Keep prompt はメッセージ駆動: 開始セリフ② が出てから N ms 後に表示
export const FIRE_PROMPT_AFTER_BUBBLE2_MS = 1_800;
// Keep 選んだ後の 3 言タイミング → 次の選択肢
export const KEEP_REPLY_INTERVAL_MS = 1_500;
export const KEEP_REPLY_FIRST_DELAY_MS = 280;
export const KEEP_REPROMPT_AFTER_REPLIES_MS = 1_700; // 3言出し切ってから prompt

const ACT_VOICE_LOOP = [
  VOICE_FILES.ACT_01,
  VOICE_FILES.ACT_02,
  VOICE_FILES.ACT_03,
];

// 開始セリフ ① 様子伺い（メニュー別）
// Gentle シリーズ哲学: 受容と優しさ。征服感ではなく、相手を気遣う・確認する
const START_BUBBLES_1 = [
  // ACT-01 手で
  ['どう...かな？', '緊張してる？', '...大丈夫そう？'],
  // ACT-02 口で
  ['本当に、口でいいの？', '緊張してる？...わたしも、ちょっとね', '...こっち、見ててくれる？'],
  // ACT-03 本番
  ['ほんとに、いいの？', '怖くない...？', '...ちゃんと、こっち見ててね'],
];

// 開始セリフ ② 優しいひとこと（受容・気遣い）
const START_BUBBLES_2 = [
  // ACT-01
  [
    'いきたくなったら...いつでもいいからね',
    '力加減、大丈夫かな？あんまり慣れてないからさ...',
    '無理しないで、ゆっくりで',
  ],
  // ACT-02
  [
    '苦しかったら、すぐ言ってね？',
    'ぜんぶ受け止めるから、安心して？',
    '焦らなくていいよ。任せて',
  ],
  // ACT-03
  [
    '痛かったら、止めるからね？',
    'いつでも止めていいから...無理しないで',
    'ぜんぶ、受け止めるから...大丈夫だよ',
  ],
];

// play中タップ or Keep 選択でのキャラ反応（メニュー進行ごと）
const PLAY_TAP_BUBBLES = [
  ['もー、せっかちじゃん？', 'んっ...そこ?', 'ふふっ、いい感じ〜', 'あ、なに〜照れる'],
  ['んっ...いいよ？', 'もっと、見て', 'はぁ...好きにしていいから', 'やっぱ最高じゃん...'],
  ['もうダメ...', 'いって、いって', 'ん〜っ...！', '激しっ...好き...'],
];

// Keep 選んだ後に 3言ずつランダムに繰り出すフレーズプール（メニュー別）
// 受容と優しさ哲学: 焦らせない、無理させない、ゆっくり
const KEEP_REPLIES_POOL = [
  // ACT-01 (手の余裕)
  [
    'まだ？...じゃ、もう少し',
    'ふふっ、焦らないで',
    'まだいける？',
    '焦らなくていいよ、ね？',
    'ゆっくりで、いいから',
    'ぜんぜん、待ってあげる',
    'いつでも、出していいよ',
  ],
  // ACT-02 (口の余裕)
  [
    'しょうがないな〜...もうちょい？',
    'まだ余裕？すごっ',
    'まだ我慢できるんだ',
    'ふふっ、頑張るね',
    'いいよ、もうちょい',
    '焦らせないでね？',
    'いつでも、口に出して',
  ],
  // ACT-03 (本番の余裕)
  [
    'まだ我慢できるんだ...偉いよ',
    '待ってあげる、ね',
    'いつでも、ナカで',
    'もうちょい一緒に...',
    '焦らないで、ぜんぶ受け止めるから',
    'いいよ、好きなだけ',
    'ね、こっち見て？',
  ],
];

function pickThreeUnique(pool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

const TAP_COOLDOWN_MS = 800;

export class ActionScene {
  constructor({ bus, state, audio }) {
    this.bus = bus;
    this.state = state;
    this.audio = audio;
    this.root = document.getElementById('action-scene');
    this.stage = document.getElementById('action-stage');
    this.tapZone = document.getElementById('action-tap-zone');
    this.blackout = document.getElementById('action-blackout');
    // 開始セリフ2本 + Fire/Keep prompt = 3 が見えるよう max=3
    this.bubbles = new ChatBubbles(document.getElementById('action-bubbles'), { max: 3 });

    this.currentMenuIndex = 0;
    this.keepCount = 0;          // Fire するまでに Keep を選んだ回数（焦らしボーナスの根拠）
    this._promptTimer = null;
    this._startTimers = [];
    this._keepReplyTimers = [];
    this._currentPromptGroup = null;
    this._bound = false;
    this._tapBubbleIdx = 0;
    this._start1Idx = [0, 0, 0];
    this._start2Idx = [0, 0, 0];
    this._lastTapAt = 0;
  }

  show({ menuIndex = 0 } = {}) {
    if (!this.root) return;
    this.currentMenuIndex = menuIndex;
    this.keepCount = 0;          // 入場時にリセット
    this.root.hidden = false;
    requestAnimationFrame(() => { this.root.dataset.shown = 'true'; });
    this._renderStage(menuIndex);
    this._cancelPromptTimer();
    this._cancelStartTimers();
    this._cancelKeepReplyTimers();
    this._currentPromptGroup = null;
    this._bind();
    this.bubbles.clear();
    this._tapBubbleIdx = 0;

    // 行為 BGM へ切替 + 行為象徴ボイスループ開始
    this.audio?.startBgm(BGM_FILES.ACT);
    this.audio?.startVoiceLoop(ACT_VOICE_LOOP[Math.max(0, Math.min(2, menuIndex))]);

    // 入場時のゆっくり暗転フェードアウト（FinishScene の対称）
    this._activateBlackout();
    this._startTimers.push(setTimeout(() => this._fadeOutBlackout(), 50));

    // 暗転明け後に開始セリフ① 様子伺い → ② 優しいひとこと
    // Fire/Keep prompt はセリフ②駆動（_showStartBubble2 内で発火）
    this._startTimers.push(setTimeout(
      () => this._showStartBubble1(menuIndex),
      ACTION_START_BUBBLE_1_MS,
    ));
    this._startTimers.push(setTimeout(
      () => this._showStartBubble2(menuIndex),
      ACTION_START_BUBBLE_2_MS,
    ));
  }

  hide() {
    if (this.root) {
      this.root.dataset.shown = 'false';
      this.root.hidden = true;
    }
    this._cancelPromptTimer();
    this._cancelStartTimers();
    this._cancelKeepReplyTimers();
    this._activateBlackout(); // 次回 show 時に再び暗転スタート
    this.audio?.stopVoiceLoop();
    this.bubbles?.clear();
  }

  _cancelKeepReplyTimers() {
    for (const t of this._keepReplyTimers) clearTimeout(t);
    this._keepReplyTimers = [];
  }

  _activateBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'true';
  }

  _fadeOutBlackout() {
    if (this.blackout) this.blackout.dataset.active = 'false';
  }

  _showStartBubble1(menuIndex) {
    const pool = START_BUBBLES_1[Math.max(0, Math.min(2, menuIndex))];
    const idx = this._start1Idx[menuIndex] % pool.length;
    this._start1Idx[menuIndex]++;
    this.bubbles.push('char', pool[idx]);
  }

  _showStartBubble2(menuIndex) {
    const pool = START_BUBBLES_2[Math.max(0, Math.min(2, menuIndex))];
    const idx = this._start2Idx[menuIndex] % pool.length;
    this._start2Idx[menuIndex]++;
    this.bubbles.push('char', pool[idx]);
    // メッセージ駆動: セリフ② 表示完了から N ms 後に Fire/Keep prompt
    this._scheduleFirePrompt(FIRE_PROMPT_AFTER_BUBBLE2_MS);
  }

  _cancelStartTimers() {
    for (const t of this._startTimers) clearTimeout(t);
    this._startTimers = [];
  }

  _renderStage(menuIndex) {
    if (!this.stage) return;
    const url = getActImage(menuIndex);
    this.stage.style.backgroundImage = `url("${url}")`;
  }

  _scheduleFirePrompt(delay) {
    this._cancelPromptTimer();
    this._promptTimer = setTimeout(() => this._showFirePrompt(), delay);
  }

  _cancelPromptTimer() {
    if (this._promptTimer) {
      clearTimeout(this._promptTimer);
      this._promptTimer = null;
    }
  }

  _showFirePrompt() {
    if (this._currentPromptGroup) return;
    this.audio?.playSe(SE_FILES.FIRE_APPEAR);
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

  _onPromptPick(idx) {
    const group = this._currentPromptGroup;
    this._currentPromptGroup = null;
    this.bubbles.keepOnly(group, idx);

    if (idx === 0) {
      // Fire
      this._cancelPromptTimer();
      this.audio?.playSe(SE_FILES.TAP);
      this.audio?.stopVoiceLoop();
      if (typeof hapticsBridge?.fire === 'function') hapticsBridge.fire();
      this.bus.emit('request:finish');
    } else {
      // Keep: keepCount++、3言を順次 → 出し切ったら再 prompt
      this.keepCount++;
      this.audio?.playSe(SE_FILES.TAP);
      this._cancelKeepReplyTimers();
      const pool = KEEP_REPLIES_POOL[Math.max(0, Math.min(2, this.currentMenuIndex))];
      const replies = pickThreeUnique(pool);
      replies.forEach((text, i) => {
        const delay = KEEP_REPLY_FIRST_DELAY_MS + i * KEEP_REPLY_INTERVAL_MS;
        this._keepReplyTimers.push(setTimeout(() => this.bubbles.push('char', text), delay));
      });
      const lastReplyAt = KEEP_REPLY_FIRST_DELAY_MS + (replies.length - 1) * KEEP_REPLY_INTERVAL_MS;
      this._scheduleFirePrompt(lastReplyAt + KEEP_REPROMPT_AFTER_REPLIES_MS);
    }
  }

  _bind() {
    if (this._bound) return;
    this._bound = true;
    this.tapZone?.addEventListener('click', () => this._onPlayTap());
  }

  _onPlayTap() {
    const now = Date.now();
    if (now - this._lastTapAt < TAP_COOLDOWN_MS) return;
    this._lastTapAt = now;

    this.audio?.resume();
    const voice = PLAY_TAP_VOICES[Math.floor(Math.random() * PLAY_TAP_VOICES.length)];
    this.audio?.playVoice(voice);

    const pool = PLAY_TAP_BUBBLES[Math.max(0, Math.min(2, this.currentMenuIndex))];
    const text = pool[this._tapBubbleIdx % pool.length];
    this._tapBubbleIdx++;
    this.bubbles?.push('char', text);

    if (typeof hapticsBridge?.tap === 'function') hapticsBridge.tap();
  }
}
