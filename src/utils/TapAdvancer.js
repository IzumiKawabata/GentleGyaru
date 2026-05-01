/**
 * TapAdvancer — タップで現在ステップをスキップする interruptible 進行コントローラ
 *
 * ボイス→バブル→遷移を await 駆動の async sequence で書く時に、
 * 各 await を「タップで早送り可能」にするためのラッパー。
 *
 * 使い方:
 *   const advancer = new TapAdvancer({
 *     rootEl: document.getElementById('action-scene'),
 *     // タップで stop すべき副作用（ボイス停止など）
 *     onSkip: () => audio.stopVoice(),
 *     // .choice-bubble クリックは伝播させる（選択肢タップは skip にしない）
 *   });
 *   advancer.bind();
 *
 *   // sleep を skip 可能にする
 *   await advancer.sleep(1500);
 *
 *   // ボイス再生 + skip 可能（playVoice() の Promise を渡す）
 *   await advancer.step(audio.playVoice('greet1/s1.wav'));
 *
 *   advancer.unbind();  // hide() 時に解除
 *
 * 設計:
 *   - 各 step / sleep は「自然終了」または「skip()」で resolve
 *   - skip() を呼ぶと現在の 1 ステップだけ進む（連続 skip すると次々進む）
 *   - .choice-bubble, .reset-btn, .audio-toggle のクリックは skip 対象外
 */

const SKIP_IGNORE_SELECTORS = [
  '.choice-bubble',
  '.reset-btn',
  '.audio-toggle',
];

export class TapAdvancer {
  constructor({ rootEl, onSkip = null } = {}) {
    this.rootEl = rootEl;
    this.onSkip = onSkip;
    this._currentResolver = null;
    this._currentTimer = null;
    this._bound = false;
    this._handler = (ev) => {
      // 選択肢など特定要素のクリックは skip しない
      const target = ev.target;
      if (target && typeof target.closest === 'function') {
        for (const sel of SKIP_IGNORE_SELECTORS) {
          if (target.closest(sel)) return;
        }
      }
      this.skip();
    };
  }

  bind() {
    if (this._bound || !this.rootEl) return;
    this._bound = true;
    this.rootEl.addEventListener('click', this._handler);
  }

  unbind() {
    if (!this._bound || !this.rootEl) return;
    this._bound = false;
    this.rootEl.removeEventListener('click', this._handler);
    // 残った step / sleep を解決
    this.skip();
  }

  /**
   * skip 可能な sleep。タップ or 時間経過のどちらか早い方で resolve。
   */
  sleep(ms) {
    return new Promise((resolve) => {
      const finish = () => {
        if (this._currentTimer) {
          clearTimeout(this._currentTimer);
          this._currentTimer = null;
        }
        if (this._currentResolver === resolve) this._currentResolver = null;
        resolve();
      };
      this._currentResolver = finish;
      this._currentTimer = setTimeout(finish, ms);
    });
  }

  /**
   * Promise を skip 可能にラップ。タップ or 自然完了のどちらか早い方で resolve。
   * 例: await advancer.step(audio.playVoice(file));
   */
  step(promise) {
    return new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        if (this._currentResolver === resolve) this._currentResolver = null;
        resolve();
      };
      this._currentResolver = finish;
      Promise.resolve(promise).then(finish, finish);
    });
  }

  /** タップで現在ステップを早送り */
  skip() {
    const r = this._currentResolver;
    if (r) {
      this._currentResolver = null;
      try { this.onSkip?.(); } catch (_) {}
      r();
    }
  }
}
