class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.url = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/events/';
  }

  get connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.connected || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) return;
    console.log('[WS] 🔌 Connecting to', this.url);
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => console.log('[WS] ✅ Connected');
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] 📩 Event received:', data);
          this.listeners.forEach(cb => {
            try { cb(data); } catch (e) { console.error('[WS] ❌ Listener error:', e, data); }
          });
        } catch { console.warn('[WS] Malformed message', event.data); }
      };
      this.ws.onclose = (e) => {
        console.log('[WS] 🚪 Disconnected (code:', e.code, ')');
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
      this.ws.onerror = (e) => console.error('[WS] ❌ WebSocket error:', e);
    } catch (e) { console.error('[WS] ❌ Connection failed:', e); }
  }

  disconnect() {
    console.log('[WS] ⛔ Disconnecting');
    clearTimeout(this.reconnectTimer);
    if (this.ws) { this.ws.onclose = null; this.ws.close(); }
    this.ws = null;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    console.log('[WS] ➕ Listener added, total:', this.listeners.size);
    return () => {
      this.listeners.delete(callback);
      console.log('[WS] ➖ Listener removed, total:', this.listeners.size);
    };
  }
}

export const wsManager = new WebSocketManager();
