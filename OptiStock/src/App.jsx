import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { api } from "./services/api";
import { wsManager } from "./services/websocket";
import { WebSocketProvider } from "./context/WebSocketProvider";

import LoginPage from "./pages/LoginPage";
import InventoryHub from "./pages/InventoryHub";
import StockAdjustments from "./pages/StockAdjustments";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Notifications from "./pages/Notifications";
import Archives from "./pages/Archives";

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await api.getMe();
        if (!cancelled) {
          setAuthenticated(true);
          wsManager.connect();
        }
      } catch {
        localStorage.removeItem('user');
        if (!cancelled) setAuthenticated(false);
        wsManager.disconnect();
      }
      if (!cancelled) setChecking(false);
    };
    if (localStorage.getItem('user')) {
      check();
    } else {
      setChecking(false);
      setAuthenticated(false);
      wsManager.disconnect();
    }
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (checking) return null;
  if (!authenticated) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <WebSocketProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/inventory-hub" element={<ProtectedRoute><InventoryHub /></ProtectedRoute>} />
        <Route path="/stock-adjustments" element={<ProtectedRoute><StockAdjustments /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/archives" element={<ProtectedRoute><Archives /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WebSocketProvider>
  );
}

export default App;
