/**
 * App — Gentle Gal の3画面ルーター
 *
 * waiting → action → finish → waiting のループを管理。
 * SmartDoll の App.js を単体キャラ・3シーン用に簡略化。
 */

import { EventBus } from '../core/EventBus.js';
import { WaitingScene } from '../scenes/WaitingScene.js';
import { ActionScene } from '../scenes/ActionScene.js';
import { FinishScene } from '../scenes/FinishScene.js';
import { loadState, saveState, resetState, recordFinish } from '../game/GentleGalState.js';
import { hapticsBridge } from '../utils/hapticsBridge.js';
import { GentleAudio } from '../audio/GentleAudio.js';
import { renderLoveGauge } from '../ui/LoveGaugeUI.js';

const ROUTE = {
  WAITING: 'waiting',
  ACTION:  'action',
  FINISH:  'finish',
};

export class App {
  constructor() {
    this.bus = new EventBus();
    this.state = loadState();
    this.route = ROUTE.WAITING;

    if (typeof hapticsBridge?.setEnabled === 'function') {
      hapticsBridge.setEnabled(this.state.hapticsOn);
    }

    this.audio = new GentleAudio({ state: this.state });

    this.waiting = new WaitingScene({ bus: this.bus, state: this.state, audio: this.audio });
    this.action  = new ActionScene({  bus: this.bus, state: this.state, audio: this.audio });
    this.finish  = new FinishScene({  bus: this.bus, state: this.state, audio: this.audio });
  }

  start() {
    // メニュータップで行為遷移
    this.bus.on('request:action', ({ menuIndex }) => this._gotoAction(menuIndex));
    // 発射タップでフィニッシュ遷移
    this.bus.on('request:finish', () => this._gotoFinish());
    // フィニッシュ完了で待機帰還（連続セッション「まだする？」モード）
    this.bus.on('finish:complete', () => this._gotoWaiting({ afterFinish: true }));
    // リセット
    this.bus.on('request:reset', () => this._reset());

    this._gotoWaiting();
  }

  _gotoWaiting({ afterFinish = false } = {}) {
    this.action.hide();
    this.finish.hide();
    this.route = ROUTE.WAITING;
    this.state.currentScene = 'waiting';
    this._setRouteAttr();
    saveState(this.state);
    this.waiting.show({ afterFinish });
    renderLoveGauge(this.state);
  }

  _gotoAction(menuIndex) {
    this.waiting.hide();
    this.finish.hide();
    this.route = ROUTE.ACTION;
    this.state.currentScene = 'action';
    this._setRouteAttr();
    saveState(this.state);
    this.action.show({ menuIndex });
    renderLoveGauge(this.state);
  }

  _gotoFinish() {
    const menuIndex = this.action.currentMenuIndex;
    const keepCount = this.action.keepCount || 0;
    this.waiting.hide();
    this.action.hide();
    this.route = ROUTE.FINISH;
    this.state.currentScene = 'finish';
    this._setRouteAttr();
    // 状態昇格 + keepCount を加味した愛情ゲージ加算
    const result = recordFinish(this.state, menuIndex, { keepCount });
    saveState(this.state);
    this.finish.show({ menuIndex, gain: result?.gain ?? 0, keepCount });
    renderLoveGauge(this.state);
  }

  _setRouteAttr() {
    const root = document.getElementById('app');
    if (root) root.dataset.route = this.route;
  }

  _reset() {
    const fresh = resetState();
    Object.assign(this.state, fresh);
    if (typeof hapticsBridge?.setEnabled === 'function') {
      hapticsBridge.setEnabled(this.state.hapticsOn);
    }
    this.audio?.setMuted(this.state.muted);
    this.audio?.stopAll();
    this._gotoWaiting();
  }
}
