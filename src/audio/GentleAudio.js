/**
 * GentleAudio — Gentle Gal 用の薄い音声マネージャー
 *
 * SmartDoll の AudioManager は HapRoom 由来で多機能すぎるため、
 * BGM ループ / Voice ループ・ワンショット / SE ワンショットの3つに絞った薄ラッパーとして新規実装。
 * AudioEngine はそのまま流用。
 *
 * 設計方針:
 *   - 音声ファイル未配置でも壊れない（fetch失敗は黙殺）
 *   - mix（voice/se/bgm）は state から取り、setMix で動的更新可能
 *   - mute は state.muted を反映
 *   - autoplay policy 対応として、最初の user gesture で resume() する想定
 */

import { AudioEngine } from '../core/AudioEngine.js';
import { resolveAssetUrl } from '../core/SecureAssetLoader.js';
import {
  getVoicePath,
  getBgmPath,
  getSePath,
} from '../game/GentleGalCharacter.js';

// Voice loop ducking: バブルボイス再生中は loop を完全に下げる
const LOOP_NORMAL_FACTOR = 0.4;
const LOOP_DUCKED_FACTOR = 0.0;

export class GentleAudio {
  constructor({ state }) {
    this._engine = new AudioEngine();
    this._mix = {
      voice: state?.voiceVolume ?? 0.85,
      se:    state?.seVolume    ?? 0.8,
      bgm:   state?.bgmVolume   ?? 0.6,
    };
    this._muted = !!state?.muted;
    this._engine.setEnabled(!this._muted);

    this._bgmCtrl = null;
    this._voiceLoopCtrl = null;
    this._loopVolumeFactor = LOOP_NORMAL_FACTOR; // 現在のループ通常音量倍率
  }

  /** user gesture で呼ぶ（autoplay policy 回避） */
  resume() {
    try { this._engine.resume?.(); } catch (_) { /* no-op */ }
  }

  setMuted(muted) {
    this._muted = !!muted;
    this._engine.setEnabled(!this._muted);
  }

  setMix(patch = {}) {
    this._mix = { ...this._mix, ...patch };
  }

  // === SE === //
  playSe(filename) {
    if (!filename || this._muted) return;
    const url = resolveAssetUrl(getSePath(filename));
    this._safe(() =>
      this._engine.playOneShot?.({
        url,
        volume: this._mix.se,
        tag: 'se',
        group: 'se',
        allowOverlap: true,
      }),
    );
  }

  // === Voice (one-shot) === //
  // バブルボイス再生中は voice-loop を duck（音量0）→ 終了で復帰。
  // Promise を返す: ボイス自然終了 / stopVoice / mute / safetyTimeout で resolve。
  // safetyTimeout: ボイスファイル不在等で onEnded 不発のとき hang しないための保険。
  playVoice(filename, { safetyTimeoutMs = 8000 } = {}) {
    if (!filename || this._muted) {
      return Promise.resolve();
    }
    const url = resolveAssetUrl(getVoicePath(filename));
    this._duckLoop();
    return new Promise((resolve) => {
      let resolved = false;
      let safetyTimer = null;
      const finalize = () => {
        if (resolved) return;
        resolved = true;
        if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
        this._restoreLoop();
        if (this._currentVoiceResolver === resolve) {
          this._currentVoiceResolver = null;
        }
        resolve();
      };
      // 古い resolver が残っていれば即座に解決（previous voice was stopped）
      if (this._currentVoiceResolver) {
        const prev = this._currentVoiceResolver;
        this._currentVoiceResolver = null;
        prev();
      }
      this._currentVoiceResolver = resolve;
      // 安全弁: ボイス不在 / 再生失敗で onEnded が来ない場合の hang 回避
      safetyTimer = setTimeout(finalize, safetyTimeoutMs);

      let started = false;
      this._safe(() => {
        const result = this._engine.playOneShot?.({
          url,
          volume: this._mix.voice,
          tag: 'voice',
          group: 'voice',
          allowOverlap: false,
          onEnded: finalize,
        });
        started = true;
        return result;
      });
      if (!started) finalize();
    });
  }

  /** 再生中のバブルボイスを停止し、Promise も解決させる */
  stopVoice() {
    this._engine.stopByTag?.('voice');
    if (this._currentVoiceResolver) {
      const r = this._currentVoiceResolver;
      this._currentVoiceResolver = null;
      this._restoreLoop();
      r();
    }
  }

  /** loop voice を一時的に音量 0 に下げる（バブルボイス開始時） */
  _duckLoop() {
    if (this._voiceLoopCtrl) {
      this._engine.updateVolumeByTag?.('voice-loop', this._mix.voice * LOOP_DUCKED_FACTOR);
    }
  }

  /** loop voice を通常音量に戻す（バブルボイス終了時） */
  _restoreLoop() {
    if (this._voiceLoopCtrl) {
      this._engine.updateVolumeByTag?.('voice-loop', this._mix.voice * this._loopVolumeFactor);
    }
  }

  // === Voice loop（行為中の ambient 喘ぎ声ループ） === //
  // volumeFactor: bubble voice (one-shot) と干渉しないよう低めに設定。
  // デフォルト 0.4（ambient = フォアグラウンド bubble の半分以下）。
  // playVoice 中は自動で 0 に duck され、終了で復帰する。
  startVoiceLoop(filename, { volumeFactor = LOOP_NORMAL_FACTOR } = {}) {
    this.stopVoiceLoop();
    if (!filename || this._muted) return;
    this._loopVolumeFactor = volumeFactor;
    const url = resolveAssetUrl(getVoicePath(filename));
    this._safe(async () => {
      const ctrl = await this._engine.playLoop?.({
        url,
        volume: this._mix.voice * volumeFactor,
        tag: 'voice-loop',
        group: 'voice',
      });
      if (ctrl) this._voiceLoopCtrl = ctrl;
    });
  }

  stopVoiceLoop() {
    if (this._voiceLoopCtrl) {
      try { this._voiceLoopCtrl.stop(); } catch (_) {}
      this._voiceLoopCtrl = null;
    }
  }

  // === BGM loop === //
  startBgm(filename) {
    this.stopBgm();
    if (!filename || this._muted) return;
    const url = resolveAssetUrl(getBgmPath(filename));
    this._safe(async () => {
      const ctrl = await this._engine.playLoop?.({
        url,
        volume: this._mix.bgm,
        tag: 'bgm',
        group: 'bgm',
      });
      if (ctrl) this._bgmCtrl = ctrl;
    });
  }

  stopBgm() {
    if (this._bgmCtrl) {
      try { this._bgmCtrl.stop(); } catch (_) {}
      this._bgmCtrl = null;
    }
  }

  stopAll() {
    this.stopBgm();
    this.stopVoiceLoop();
  }

  /** Promise/exception を黙殺するヘルパ（音声ファイル未配置を許容） */
  _safe(fn) {
    try {
      const r = fn();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (_) { /* no-op */ }
  }
}
