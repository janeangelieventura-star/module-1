import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { wsManager } from "../services/websocket";
import { CheckCircle2, Info, X } from "lucide-react";

const WebSocketContext = createContext(null);

const TOAST_DURATION = 5000;

function getActionIcon(action) {
  if (action === 'created') return <CheckCircle2 size={18} className="text-[#7BB8A7]" />;
  if (action === 'updated') return <Info size={18} className="text-[#7BB8A7]" />;
  return <Info size={18} className="text-[#D96B5E]" />;
}

function getModelLabel(model) {
  const labels = { Product: 'Product', Category: 'Category', Supplier: 'Supplier', StockLedger: 'Stock', Notification: 'Notification' };
  return labels[model] || model;
}

function formatEventMessage(data) {
  const label = getModelLabel(data.model);
  const action = data.action;
  if (data.model === 'StockLedger') {
    return `Stock updated: ${data.name || 'adjustment recorded'}`;
  }
  return `${label} ${action}: ${data.name || data.id || ''}`;
}

const DEBOUNCE_MS = 1500;

export function WebSocketProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const timerRefs = useRef({});
  const lastToastTimeRef = useRef(0);
  const [notifRefreshKey, setNotifRefreshKey] = useState(0);

  const clearToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timerRefs.current[id];
    }, 300);
  }, []);

  useEffect(() => {
    console.log('🔌 WebSocketProvider: Initializing WebSocket connection');
    wsManager.connect();
    const unsubscribe = wsManager.subscribe((data) => {
      console.log('✅ WebSocket event received:', data);
      const id = ++toastIdRef.current;
      const now = Date.now();

      // Debounce: if within DEBOUNCE_MS of the last toast, replace instead of stack
      if (now - lastToastTimeRef.current < DEBOUNCE_MS) {
        Object.values(timerRefs.current).forEach(t => clearTimeout(t));
        timerRefs.current = {};
        setToasts([{
          id, message: formatEventMessage(data), icon: getActionIcon(data.action), isClosing: false,
        }]);
      } else {
        setToasts(prev => [...prev, {
          id, message: formatEventMessage(data), icon: getActionIcon(data.action), isClosing: false,
        }]);
      }
      lastToastTimeRef.current = now;
      timerRefs.current[id] = setTimeout(() => clearToast(id), TOAST_DURATION);

      setNotifRefreshKey(prev => prev + 1);
    });

    return () => {
      console.log('🧪 WebSocketProvider: Cleaning up');
      unsubscribe();
      wsManager.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ notifRefreshKey }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-[#1A1A1A] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden min-w-[320px] max-w-[400px] origin-right ${
              toast.isClosing ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {toast.icon}
                <span className="text-sm font-bold tracking-wide truncate">{toast.message}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clearToast(toast.id); }}
                className="text-[#A8A29E] hover:text-[#FFFFFF] transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-1 bg-[#333333] w-full">
              <div className="h-full bg-[#7BB8A7] animate-progress-bar" />
            </div>
          </div>
        ))}
      </div>
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
