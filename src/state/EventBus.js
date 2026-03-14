/** EventBus — lightweight pub/sub for cross-module communication */
class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const handlers = this.events.get(eventName);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
  }

  emit(eventName, data) {
    const handlers = this.events.get(eventName);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

export const eventBus = new EventBus();
