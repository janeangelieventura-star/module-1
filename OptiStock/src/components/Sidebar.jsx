import { Link, useLocation } from "react-router-dom";
import { MODULE_URLS } from "../config";
import {
  PackageSearch,
  Box,
  ClipboardList,
  Tags,
  Truck,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

const navItems = [
  { to: "/inventory-hub", label: "Inventory Hub", icon: Box },
  { to: "/stock-adjustments", label: "Stock Adjustments", icon: ClipboardList },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
];

function ModuleLink({ href, icon: Icon, label }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-3 text-[#57534E] hover:bg-[#EFE9DF] rounded-xl font-bold transition-all cursor-pointer group"
      >
        <Icon size={18} className="group-hover:text-[#1A1A1A] transition-colors" />
        {label}
        <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-[#A8A29E] group-hover:text-[#1A1A1A]">↗</span>
      </a>
    );
  }

  return (
    <div className="relative group">
      <div className="flex items-center gap-3 px-4 py-3 text-[#A8A29E] rounded-xl font-bold cursor-not-allowed opacity-50">
        <Icon size={18} />
        {label}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-[#1A1A1A] text-[#FFFFFF] text-[10px] font-black uppercase tracking-wider rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Not configured
      </div>
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#FAF7F2] border-r border-[#E7E5E4] hidden lg:flex flex-col relative z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <Link to="/inventory-hub" className="pt-6 pb-2 px-6 flex flex-col items-center gap-1 mb-1 group cursor-pointer">
        <div className="w-12 h-12 bg-[#D96B5E] rounded-xl flex items-center justify-center shadow-sm group-hover:bg-[#C45A4D] transition-colors">
          <PackageSearch size={24} className="text-[#FFFFFF]" />
        </div>
        <span className="text-[#1A1A1A] font-black text-xl tracking-tight">OptiStock</span>
      </Link>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">Menu</p>

        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-md"
                  : "text-[#57534E] hover:bg-[#EFE9DF]"
              }`}
            >
              <Icon size={18} className={isActive ? "text-[#7BB8A7]" : ""} />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 pb-1">
          <div className="border-t border-[#E7E5E4] mb-3" />
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#A8A29E]">Integrated</p>
        </div>

        <ModuleLink href={MODULE_URLS.POS} icon={ShoppingCart} label="POS Terminal" />
        <ModuleLink href={MODULE_URLS.DASHBOARD} icon={BarChart3} label="Dashboard" />
      </nav>

      <div className="p-6 border-t border-[#E7E5E4]">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#57534E]">
          System v3.5
        </p>
      </div>
    </aside>
  );
}
