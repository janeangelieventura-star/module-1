import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/DashboardLayout";
import {
  Box,
  ClipboardList,
  Tags,
  Truck,
  Bell,
  Menu,
} from "lucide-react";

const navItems = [
  { to: "/inventory-hub", label: "Hub", icon: Box },
  { to: "/stock-adjustments", label: "Stock", icon: ClipboardList },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#FFFFFF] border-t border-[#E7E5E4] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 py-1">
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer"
        >
          <Menu size={20} className="text-[#57534E]" />
          <span className="text-[8px] font-black uppercase tracking-wider text-[#A8A29E]">Menu</span>
        </button>

        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                isActive ? "text-[#1A1A1A]" : "text-[#A8A29E]"
              }`}
            >
              <Icon size={20} className={isActive ? "text-[#7BB8A7]" : ""} />
              <span className={`text-[8px] font-black uppercase tracking-wider ${isActive ? "text-[#1A1A1A]" : "text-[#A8A29E]"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <Link
          to="/notifications"
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
            location.pathname === "/notifications" ? "text-[#1A1A1A]" : "text-[#A8A29E]"
          }`}
        >
          <Bell size={20} className={location.pathname === "/notifications" ? "text-[#7BB8A7]" : ""} />
          <span className={`text-[8px] font-black uppercase tracking-wider ${location.pathname === "/notifications" ? "text-[#1A1A1A]" : "text-[#A8A29E]"}`}>
            Alerts
          </span>
        </Link>
      </div>
    </div>
  );
}
