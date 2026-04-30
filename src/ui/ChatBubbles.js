/**
 * ChatBubbles — チャットアプリ風の左右バブル + 選択肢グループ表示
 *
 * 1ラリー = チャット履歴の流れの中に「キャラ発話 → 選択肢 → プレイヤー発話 → キャラ応答」が
 * 縦に積まれていく。選択肢も bubble-track 内の DOM ノードとして並ぶ。
 *
 * 使い方:
 *   const bubbles = new ChatBubbles(document.getElementById('waiting-bubbles'));
 *   bubbles.push('char',   'よろしく〜');
 *   const group = bubbles.pushChoices([
 *     { label: '手で', locked: false },
 *     { label: '口で', locked: true  },
 *     { label: '本番で', locked: true },
 *   ], (idx) => { ... });
 *   bubbles.markChoicesSpent(group); // 選択後にグレーアウト
 *
 * 古いバブルは max 件で自動 trim。
 */

const DEFAULT_MAX = 8;

export class ChatBubbles {
  constructor(trackEl, { max = DEFAULT_MAX } = {}) {
    this.track = trackEl;
    this.max = max;
  }

  push(side, text) {
    if (!this.track || !text) return null;
    const el = document.createElement('div');
    el.className = `chat-bubble chat-bubble--${side === 'player' ? 'player' : 'char'}`;
    el.textContent = text;
    this.track.appendChild(el);
    this._trim();
    return el;
  }

  /**
   * 選択肢グループをチャット内に挿入する。
   * @param {Array<{label:string, conditional?:boolean, icon?:string}>} items
   * @param {(idx:number, item:object) => void} onPick
   * @param {{variant?: 'numbered' | 'actions'}} opts
   *   - 'numbered' (default): 1. 2. 3. ... 数字付き
   *   - 'actions': Fire/Keep のようなアクションペア。番号なし、横並び
   * @returns {HTMLElement} group element
   */
  pushChoices(items, onPick, opts = {}) {
    if (!this.track || !Array.isArray(items)) return null;
    const variant = opts.variant || 'numbered';
    const group = document.createElement('div');
    group.className = `choice-group choice-group--${variant}`;
    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-bubble';
      btn.dataset.choice = String(idx);
      if (item.conditional) btn.dataset.conditional = 'true';

      if (variant === 'numbered') {
        const num = document.createElement('span');
        num.className = 'choice-num';
        num.textContent = `${idx + 1}.`;
        btn.appendChild(num);
      }

      if (item.icon) {
        const icon = document.createElement('span');
        icon.className = 'choice-lock';
        icon.textContent = item.icon;
        btn.appendChild(icon);
      }

      const label = document.createElement('span');
      label.className = 'choice-label';
      label.textContent = item.label;
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        if (typeof onPick === 'function') onPick(idx, item);
      });
      group.appendChild(btn);
    });
    this.track.appendChild(group);
    this._trim();
    return group;
  }

  /** 選択肢グループを「使用済み」にする（タップ無効化のみ、見た目はそのまま） */
  markChoicesSpent(group) {
    if (!group) return;
    group.dataset.spent = 'true';
  }

  /**
   * 選択された idx だけ残して他は折りたたみアニメーションで消す。
   * 残った1つには data-chosen="true" が付き、CSS でアクセントカラーに塗られる。
   */
  keepOnly(group, idx) {
    if (!group) return;
    group.dataset.spent = 'true';
    Array.from(group.children).forEach((btn, i) => {
      if (i !== idx) {
        btn.classList.add('choice-bubble--vanish');
      } else {
        btn.dataset.chosen = 'true';
      }
    });
  }

  clear() {
    if (!this.track) return;
    while (this.track.firstChild) {
      this.track.removeChild(this.track.firstChild);
    }
  }

  _trim() {
    while (this.track.children.length > this.max) {
      this.track.removeChild(this.track.firstChild);
    }
  }
}
