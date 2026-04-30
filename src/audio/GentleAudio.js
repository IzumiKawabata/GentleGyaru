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
  playVoice(filename) {
    if (!filename || this._muted) return;
    const url = resolveAssetUrl(getVoicePath(filename));
    this._safe(() =>
      this._engine.playOneShot?.({
        url,
        volume: this._mix.voice,
        tag: 'voice',
        group: 'voice',
        allowOverlap: false,
      }),
    );
  }

  // === Voice loop（行為中の象徴セリフループ） === //
  startVoiceLoop(filename) {
    this.stopVoiceLoop();
    if (!filename || this._muted) return;
    const url = resolveAssetUrl(getVoicePath(filename));
    this._safe(async () => {
      const ctrl = await this._engine.playLoop?.({
        url,
        volume: this._mix.voice,
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
