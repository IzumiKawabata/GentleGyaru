/**
 * AudioEngine - Web Audio API + HTMLAudioフォールバック
 * 低レベルの音声再生エンジン
 * マスターゲインノードで全体音量を即座に制御
 */
import { loadResolvedAsArrayBuffer, loadResolvedAsset } from './SecureAssetLoader.js';

const AudioContextClass =
  typeof window !== 'undefined'
    ? window.AudioContext || window.webkitAudioContext
    : null;

export class AudioEngine {
  constructor() {
    this.context = null;
    this._masterGain = null;
    this._masterVol = 1;
    this.bufferCache = new Map();
    this.bufferPromises = new Map();
    this.activeControllers = new Set();
    this.htmlFallbacks = new Map();
    this.enabled = true;
    this.paused = false;
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (this.enabled === next) return;
    this.enabled = next;
    if (!next) {
      this.stopAll();
      if (this.context?.state === 'running') {
        this.context.suspend().catch(() => {});
      }
    } else {
      if (!this.paused) this.resume();
    }
  }

  /** マスターボリュームを即座に変更（0=ミュート, 1=通常） */
  setMasterVolume(vol) {
    this._masterVol = vol;
    if (this._masterGain && this.context) {
      this._masterGain.gain.setTargetAtTime(vol, this.context.currentTime, 0.02);
    }
    // HTML Audio フォールバックのボリュームも更新
    for (const c of this.activeControllers) {
      if (c._htmlAudio) {
        c._htmlAudio.volume = (c._baseVol ?? 1) * vol;
      }
    }
  }

  get masterOutput() {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    if (!this._masterGain) {
      this._masterGain = ctx.createGain();
      this._masterGain.gain.value = this._masterVol;
      this._masterGain.connect(ctx.destination);
    }
    return this._masterGain;
  }

  ensureContext() {
    if (!AudioContextClass) return null;
    if (!this.context) {
      try {
        this.context = new AudioContextClass();
      } catch {
        this.context = null;
      }
    }
    return this.context;
  }

  resume() {
    if (!this.enabled || this.paused) return;
    const ctx = this.ensureContext();
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  }

  warm() {
    const ctx = this.ensureContext();
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  }

  pauseAll() {
    if (this.paused) return;
    this.paused = true;
    for (const c of this.activeControllers) {
      c.pause?.();
    }
    if (this.context?.state === 'running') {
      this.context.suspend().catch(() => {});
    }
  }

  resumeAll() {
    if (!this.paused) return;
    this.paused = false;
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    for (const c of this.activeControllers) {
      c.resume?.();
    }
  }

  async loadBuffer(url) {
    if (this.bufferCache.has(url)) return this.bufferCache.get(url);
    if (this.bufferPromises.has(url)) return this.bufferPromises.get(url);
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const promise = loadResolvedAsArrayBuffer(url)
      .then((ab) => {
        if (!ab) throw new Error('Failed to load audio');
        return ctx.decodeAudioData(ab);
      })
      .then((buf) => {
        this.bufferCache.set(url, buf);
        this.bufferPromises.delete(url);
        return buf;
      })
      .catch(() => {
        this.bufferPromises.delete(url);
        return null;
      });
    this.bufferPromises.set(url, promise);
    return promise;
  }

  stopMatching(predicate = null) {
    for (const c of Array.from(this.activeControllers)) {
      if (!c) continue;
      if (predicate && !predicate(c)) continue;
      c.stop();
    }
  }

  stopAll() { this.stopMatching(); }
  stopByTag(tag) { if (tag) this.stopMatching((c) => c.tag === tag); }
  stopByGroup(group) { if (group) this.stopMatching((c) => c.group === group); }

  /** タグで再生中の音声のボリュームを更新 */
  updateVolumeByTag(tag, volume) {
    if (!tag) return;
    for (const c of this.activeControllers) {
      if (c?.tag === tag) {
        if (c._gainNode && this.context) {
          c._gainNode.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
        }
        if (c._htmlAudio) {
          c._baseVol = volume;
          c._htmlAudio.volume = volume * this._masterVol;
        }
      }
    }
  }

  async playOneShot({ url, volume = 1, allowOverlap = false, tag = 'sfx', group = 'se', onEnded = null }) {
    if (!url || !this.enabled) return null;
    const ctx = this.ensureContext();
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    const dest = this.masterOutput;
    if (!ctx || !dest) return this._playWithHtml({ url, volume, allowOverlap, tag, group, onEnded });
    const buffer = await this.loadBuffer(url);
    if (!buffer) return this._playWithHtml({ url, volume, allowOverlap, tag, group, onEnded });

    if (!allowOverlap) this.stopByTag(tag);

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(dest);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);

    let finished = false;
    let stopped = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      source.onended = null;
      try { source.disconnect(); } catch {}
      try { gainNode.disconnect(); } catch {}
      this.activeControllers.delete(controller);
      if (!stopped) onEnded?.();
    };
    const controller = {
      url, tag, group, _gainNode: gainNode,
      stop: () => {
        if (finished) return;
        stopped = true;
        try { source.stop(); } catch {}
        cleanup();
      },
    };
    source.onended = cleanup;
    this.activeControllers.add(controller);
    source.start();
    return controller;
  }

  async playLoop({ url, volume = 1, tag = 'loop', group = 'se' }) {
    if (!url || !this.enabled) return null;
    const ctx = this.ensureContext();
    const dest = this.masterOutput;
    if (!ctx || !dest) return this._playLoopWithHtml({ url, volume, tag, group });
    const buffer = await this.loadBuffer(url);
    if (!buffer) return this._playLoopWithHtml({ url, volume, tag, group });

    this.stopByTag(tag);

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(dest);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      try { source.disconnect(); } catch {}
      try { gainNode.disconnect(); } catch {}
      this.activeControllers.delete(controller);
    };
    const controller = {
      url, tag, group, _gainNode: gainNode,
      stop: () => {
        if (finished) return;
        finished = true;
        try { source.stop(); } catch {}
        cleanup();
      },
    };
    this.activeControllers.add(controller);
    source.start();
    return controller;
  }

  async _playLoopWithHtml({ url, volume, tag, group }) {
    if (!url || !this.enabled) return null;
    const blobUrl = await loadResolvedAsset(url).catch(() => url);
    const audio = new Audio(blobUrl);
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.loop = true;
    audio.volume = volume * this._masterVol;
    const controller = {
      url, tag, group,
      _htmlAudio: audio,
      _baseVol: volume,
      _paused: false,
      pause() {
        if (this._paused) return;
        this._paused = true;
        try { audio.pause(); } catch {}
      },
      resume() {
        if (!this._paused) return;
        this._paused = false;
        audio.play().catch(() => {});
      },
      stop: () => {
        try { audio.pause(); audio.currentTime = 0; } catch {}
        this.activeControllers.delete(controller);
      },
    };
    if (this.paused) {
      controller._paused = true;
    } else {
      audio.play().catch(() => {});
    }
    this.activeControllers.add(controller);
    return controller;
  }

  async _playWithHtml({ url, volume, allowOverlap, tag, group, onEnded }) {
    if (!url || !this.enabled) return null;
    let audio = allowOverlap ? null : this.htmlFallbacks.get(url);
    if (!audio) {
      const blobUrl = await loadResolvedAsset(url).catch(() => url);
      audio = new Audio(blobUrl);
      audio.preload = 'auto';
      audio.playsInline = true;
      if (!allowOverlap) this.htmlFallbacks.set(url, audio);
    }
    try { audio.pause(); audio.currentTime = 0; } catch {}
    audio.volume = volume * this._masterVol;

    let finished = false;
    let stopped = false;
    let controller;
    const finalize = () => {
      if (finished) return;
      finished = true;
      audio.removeEventListener('ended', finalize);
      this.activeControllers.delete(controller);
      if (!stopped) onEnded?.();
    };
    controller = {
      url, tag, group,
      _htmlAudio: audio,
      _baseVol: volume,
      _paused: false,
      pause() {
        if (this._paused) return;
        this._paused = true;
        try { audio.pause(); } catch {}
      },
      resume() {
        if (!this._paused) return;
        this._paused = false;
        audio.play().catch(() => {});
      },
      stop: () => {
        if (finished) return;
        finished = true;
        stopped = true;
        try { audio.pause(); audio.currentTime = 0; } catch {}
        audio.removeEventListener('ended', finalize);
        this.activeControllers.delete(controller);
      },
    };
    audio.addEventListener('ended', finalize, { once: true });
    this.activeControllers.add(controller);
    if (this.paused) {
      controller._paused = true;
      return controller;
    }
    audio.play().catch(() => {});
    return controller;
  }
}
