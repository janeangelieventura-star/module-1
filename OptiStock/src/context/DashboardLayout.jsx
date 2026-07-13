import { createContext, useContext, useState } from "react";
import Sidebar from "../components/Sidebar";
import MobileBottomNav from "../components/MobileBottomNav";

const SidebarContext = createContext();

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar, setSidebarOpen }}>
      <div className="min-h-screen bg-[#EFE9DF] font-sans flex text-[#1A1A1A] overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-[0.03] bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 pb-16 lg:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </SidebarContext.Provider>
  );
}
