/**
 * EventBus - シンプルなpub/subシステム
 * モジュール間の疎結合を実現する
 */
export class EventBus {
  constructor() {
    this._handlers = new Map(); // event -> Set<handler>
  }

  /**
   * イベントを購読する
   * @returns {() => void} 購読解除関数
   */
  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * 一度だけ受け取る購読
   * @returns {() => void} 購読解除関数
   */
  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, data) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  clear() {
    this._handlers.clear();
  }
}
