import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { wsManager } from "../services/websocket";
import { CheckCircle2, Info, X } from "lucide-react";
import { showLockoutAlert } from "../utils/swalHelper";

const WebSocketContext = createContext(null);

const TOAST_DURATION = 5000;

const POS_POLL_INTERVAL = 10000;
const LOCK_POLL_INTERVAL = 5000;

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
  const posSaleIdRef = useRef(0);

  const showToast = useCallback((message, icon) => {
    const id = ++toastIdRef.current;
    const now = Date.now();
    if (now - lastToastTimeRef.current < DEBOUNCE_MS) {
      Object.values(timerRefs.current).forEach(t => clearTimeout(t));
      timerRefs.current = {};
      setToasts([{ id, message, icon, isClosing: false }]);
    } else {
      setToasts(prev => [...prev, { id, message, icon, isClosing: false }]);
    }
    lastToastTimeRef.current = now;
    timerRefs.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timerRefs.current[id];
    }, TOAST_DURATION + 300);
  }, []);

  const clearToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timerRefs.current[id];
    }, 300);
  }, []);

  const handleAccountLocked = useCallback((remainingSeconds) => {
    localStorage.removeItem('user');
    showLockoutAlert(remainingSeconds);
    setTimeout(() => { window.location.href = '/?locked=' + remainingSeconds; }, 500);
  }, []);

  useEffect(() => {
    wsManager.connect();
    const unsubscribe = wsManager.subscribe((data) => {
      if (data.type === 'pos_sale') {
        const id = ++toastIdRef.current;
        const now = Date.now();
        const message = (
          <span>
            <CheckCircle2 size={18} className="text-[#7BB8A7] inline mr-2" />
            May bumili! ₱{data.total_amount} — {data.cashier_name || 'POS'}
          </span>
        );
        if (now - lastToastTimeRef.current < DEBOUNCE_MS) {
          Object.values(timerRefs.current).forEach(t => clearTimeout(t));
          timerRefs.current = {};
          setToasts([{ id, message, icon: null, isClosing: false }]);
        } else {
          setToasts(prev => [...prev, { id, message, icon: null, isClosing: false }]);
        }
        lastToastTimeRef.current = now;
        timerRefs.current[id] = setTimeout(() => clearToast(id), TOAST_DURATION);
        setNotifRefreshKey(prev => prev + 1);
        return;
      }

      const id = ++toastIdRef.current;
      const now = Date.now();
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
      unsubscribe();
      wsManager.disconnect();
    };
  }, []);

  const isLoginPage = () => window.location.pathname === '/' || window.location.pathname === '/login';

  useEffect(() => {
    let mounted = true;
    let lastId = parseInt(localStorage.getItem('posSaleLastId') || '0', 10);

    async function poll() {
      if (isLoginPage()) return;
      try {
        const base = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${base}/pos-sales/recent/?last_id=${lastId}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!mounted) return;
        if (!res.ok) return;
        const data = await res.json();
        if (data.sales && data.sales.length > 0) {
          lastId = data.last_id;
          localStorage.setItem('posSaleLastId', String(lastId));
          for (const sale of data.sales) {
            if (!mounted) break;
            showToast(
              <span><CheckCircle2 size={18} className="text-[#7BB8A7] inline mr-2" />May bumili! ₱{sale.total_amount} — {sale.cashier_name || 'POS'}</span>,
              null
            );
            setNotifRefreshKey(prev => prev + 1);
          }
        }
      } catch {
        // offline, retry later
      }
    }

    const initialDelay = setTimeout(poll, 5000);
    const interval = setInterval(poll, POS_POLL_INTERVAL);

    return () => {
      mounted = false;
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkLock() {
      if (isLoginPage()) return;
      const base = import.meta.env.VITE_API_URL || '/api';
      try {
        const res = await fetch(`${base}/check-lock/`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!mounted) return;
        const data = await res.json();
        if (!mounted) return;
        if (data.locked && data.remaining_seconds > 0) {
          handleAccountLocked(data.remaining_seconds);
        }
      } catch {
        // offline, skip
      }
    }

    const interval = setInterval(checkLock, LOCK_POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [handleAccountLocked]);

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
