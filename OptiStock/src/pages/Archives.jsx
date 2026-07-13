import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout, { useSidebar } from "../context/DashboardLayout";
import NotificationDetailModal from "../components/NotificationDetailModal";
import { useWebSocket } from "../context/WebSocketProvider";
import { showSignoutConfirm } from "../utils/swalHelper";
import {
  Search, Bell, Edit, AlertCircle, X, Box, Truck, Tags,
  CheckCircle2, Info, LogOut, ArchiveRestore, Archive, Menu,
} from "lucide-react";

const TABS = [
  { key: 'products', label: 'Products', icon: Box },
  { key: 'suppliers', label: 'Suppliers', icon: Truck },
  { key: 'categories', label: 'Categories', icon: Tags },
];

function Archives() {
  const [notifications, setNotifications] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('products');

  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState([]);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);

  const [permDeleteTarget, setPermDeleteTarget] = useState(null);
  const [permDeleteType, setPermDeleteType] = useState(null);

  // Dropdown States
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailModalClosing, setDetailModalClosing] = useState(false);

  // Refs
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "success", isClosing: false });
  const toastTimeout = useRef(null);
  const toastExitTimeout = useRef(null);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const showToast = (message, type = "success") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastExitTimeout.current) clearTimeout(toastExitTimeout.current);
    setToast({ show: false, message: "", type, isClosing: false });
    setTimeout(() => {
      setToast({ show: true, message, type, isClosing: false });
      toastTimeout.current = setTimeout(() => {
        setToast(prev => ({ ...prev, isClosing: true }));
        toastExitTimeout.current = setTimeout(() => {
          setToast({ show: false, message: "", type: "success", isClosing: false });
        }, 300);
      }, 4700);
    }, 50);
  };

  const manuallyCloseToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastExitTimeout.current) clearTimeout(toastExitTimeout.current);
    setToast(prev => ({ ...prev, isClosing: true }));
    toastExitTimeout.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "success", isClosing: false });
    }, 300);
  };

  const loadArchivedData = useCallback(async () => {
    setLoadingTab(true);
    try {
      const [prodRes, supRes, catRes] = await Promise.all([
        api.getArchivedProducts(),
        api.getArchivedSuppliers(),
        api.getArchivedCategories(),
      ]);
      setArchivedProducts(prodRes.results || prodRes);
      setArchivedSuppliers(supRes.results || supRes);
      setArchivedCategories(catRes.results || catRes);
    } catch (err) {
      showToast('Failed to load archives.', 'error');
    }
    setLoadingTab(false);
  }, []);

  const loadData = useCallback(async (skipLoading) => {
    if (!skipLoading) setPageLoading(true);
    try {
      const [notifRes] = await Promise.all([api.getNotifications()]);
      setNotifications(notifRes.results || notifRes);
      await loadArchivedData();
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      if (!skipLoading) setPageLoading(false);
    }
  }, [loadArchivedData]);

  useEffect(() => { loadData(); }, [loadData]);

  const { notifRefreshKey } = useWebSocket();
  useEffect(() => { loadData(true); }, [notifRefreshKey]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.getNotifications();
        setNotifications(res.results || res);
      } catch (e) { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifDropdownOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDetailModal = (notification) => {
    setSelectedNotification(notification);
    setDetailModalClosing(false);
  };

  const closeDetailModal = () => {
    setDetailModalClosing(true);
    setTimeout(() => {
      setSelectedNotification(null);
      setDetailModalClosing(false);
    }, 300);
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) { console.error(err); }
  };

  const deleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleUnarchive = async (type, id) => {
    try {
      if (type === 'products') {
        await api.unarchiveProduct(id);
        setArchivedProducts(archivedProducts.filter(p => p.id !== id));
      } else if (type === 'suppliers') {
        await api.unarchiveSupplier(id);
        setArchivedSuppliers(archivedSuppliers.filter(s => s.id !== id));
      } else if (type === 'categories') {
        await api.unarchiveCategory(id);
        setArchivedCategories(archivedCategories.filter(c => c.id !== id));
      }
      showToast('Item restored successfully.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openPermDeleteConfirm = (type, id) => {
    setPermDeleteType(type);
    setPermDeleteTarget(id);
  };

  const confirmPermanentDelete = async () => {
    if (!permDeleteTarget || !permDeleteType) return;
    try {
      if (permDeleteType === 'products') {
        await api.permanentDeleteProduct(permDeleteTarget);
        setArchivedProducts(archivedProducts.filter(p => p.id !== permDeleteTarget));
      } else if (permDeleteType === 'suppliers') {
        await api.permanentDeleteSupplier(permDeleteTarget);
        setArchivedSuppliers(archivedSuppliers.filter(s => s.id !== permDeleteTarget));
      } else if (permDeleteType === 'categories') {
        await api.permanentDeleteCategory(permDeleteTarget);
        setArchivedCategories(archivedCategories.filter(c => c.id !== permDeleteTarget));
      }
      setPermDeleteTarget(null);
      setPermDeleteType(null);
      showToast('Item permanently deleted.');
    } catch (err) {
      showToast(err.message, 'error');
      setPermDeleteTarget(null);
      setPermDeleteType(null);
    }
  };

  const currentItems = useMemo(() => {
    if (activeTab === 'products') return archivedProducts;
    if (activeTab === 'suppliers') return archivedSuppliers;
    return archivedCategories;
  }, [activeTab, archivedProducts, archivedSuppliers, archivedCategories]);

  const renderTable = () => {
    if (loadingTab) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#E7E5E4] border-t-[#1A1A1A] rounded-full animate-spin"></div>
        </div>
      );
    }

    if (currentItems.length === 0) {
      return (
        <div className="py-24 text-center">
          <ArchiveRestore size={56} className="mx-auto text-[#A8A29E] mb-4" />
          <p className="text-[#57534E] font-bold text-xl">No archived {activeTab}</p>
          <p className="text-[#A8A29E] text-sm mt-1">Archived items will appear here.</p>
        </div>
      );
    }

    if (activeTab === 'products') {
      return (
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[32%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#E7E5E4]">
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">SKU</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Product</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Category</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Stock</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Supplier</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]">
            {archivedProducts.map(p => (
              <tr key={p.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-mono text-xs font-bold text-[#57534E] bg-[#EFE9DF] px-2 py-1 rounded border border-[#E7E5E4]">{p.sku}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="font-bold text-[#1A1A1A]">{p.name}</span>
                </td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{p.category_name || '-'}</td>
                <td className="py-4 px-4">
                  <span className="text-sm font-black text-[#D96B5E]">{p.stock}</span>
                </td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{p.supplier_name || '-'}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUnarchive('products', p.id)}
                      className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button onClick={() => openPermDeleteConfirm('products', p.id)}
                      className="px-3 py-2 bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#D96B5E] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FAD2CB]/60 transition-all cursor-pointer flex items-center gap-1">
                      <Archive size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'suppliers') {
      return (
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[25%]" />
            <col className="w-[25%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#E7E5E4]">
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Company</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Contact Person</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Email</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Phone</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]">
            {archivedSuppliers.map(s => (
              <tr key={s.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-bold text-[#1A1A1A]">{s.company_name}</span>
                </td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{s.contact_person || '-'}</td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{s.email || '-'}</td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{s.phone || '-'}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUnarchive('suppliers', s.id)}
                      className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button onClick={() => openPermDeleteConfirm('suppliers', s.id)}
                      className="px-3 py-2 bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#D96B5E] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FAD2CB]/60 transition-all cursor-pointer flex items-center gap-1">
                      <Archive size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'categories') {
      return (
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[40%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#E7E5E4]">
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Name</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Description</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]">
            {archivedCategories.map(c => (
              <tr key={c.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                <td className="py-4 px-4">
                  <span className="font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Tags size={14} className="text-[#A8A29E]" />
                    {c.name}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{c.description || '-'}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUnarchive('categories', c.id)}
                      className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button onClick={() => openPermDeleteConfirm('categories', c.id)}
                      className="px-3 py-2 bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#D96B5E] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FAD2CB]/60 transition-all cursor-pointer flex items-center gap-1">
                      <Archive size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  };

  return (
    <DashboardLayout>
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 lg:p-6 lg:px-10 border-b border-[#E7E5E4] bg-[#FAF7F2]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => useSidebar().toggleSidebar()}
            className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[#EFE9DF] transition-all cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Data Recovery</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A]">Archives</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
              className={`relative p-2.5 border rounded-full transition-all shadow-sm cursor-pointer flex items-center justify-center ${
                isNotifDropdownOpen
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] border-[#E7E5E4] text-[#1A1A1A] hover:bg-[#FAF7F2]'
              }`}
            >
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <span className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 ${isNotifDropdownOpen ? 'bg-[#D96B5E] border-[#1A1A1A]' : 'bg-[#D96B5E] border-[#FFFFFF]'}`}></span>
              )}
            </button>
            <div className={`absolute top-full right-0 mt-3 w-80 sm:w-[340px] bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-200 origin-top-right ${isNotifDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
              <div className="p-4 border-b border-[#E7E5E4] bg-[#FAF7F2] flex items-center justify-between shrink-0">
                <h3 className="font-black text-[#1A1A1A] text-sm">Notifications</h3>
                {unreadNotifCount > 0 && (
                  <span className="text-[10px] font-black bg-[#D96B5E]/10 text-[#D96B5E] px-2 py-0.5 rounded-full uppercase tracking-wider">{unreadNotifCount} New</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto max-h-[50vh] custom-scrollbar overscroll-contain">
                {notifications.slice(0, 8).map(notif => {
                  const notifType = notif.type === 'sale' ? 'success' : ['stock_alert','error'].includes(notif.type) ? 'warning' : 'info';
                  return (
                    <div key={notif.id} onClick={() => { openDetailModal(notif); setIsNotifDropdownOpen(false); }}
                      className={`p-4 border-b border-[#E7E5E4] last:border-b-0 hover:bg-[#FAF7F2] transition-colors cursor-pointer flex items-start gap-3 ${notif.is_read ? 'opacity-70 bg-[#FAF7F2]/50' : 'bg-[#FFFFFF]'}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        notifType === 'warning' ? 'bg-[#FAD2CB]/40 text-[#D96B5E]' :
                        notifType === 'success' ? 'bg-[#C3ECE3]/40 text-[#7BB8A7]' :
                        'bg-[#EFE9DF] text-[#57534E]'}`}>
                        {notifType === 'warning' ? <AlertCircle size={16} strokeWidth={2.5} /> :
                         notifType === 'success' ? <CheckCircle2 size={16} strokeWidth={2.5} /> :
                         <Info size={16} strokeWidth={2.5} />}
                      </div>
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="text-sm font-bold text-[#1A1A1A] leading-tight">{notif.title}</span>
                        <span className="text-xs text-[#57534E] leading-snug mt-1">{notif.message}</span>
                        <span className="text-[10px] text-[#A8A29E] font-black mt-2 uppercase tracking-wider">{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</span>
                      </div>
                      {!notif.is_read && <div className="w-2 h-2 rounded-full bg-[#D96B5E] shrink-0 mt-2"></div>}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-[#E7E5E4] bg-[#FFFFFF] shrink-0">
                <Link to="/notifications" className="block w-full py-2.5 text-center text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#FAF7F2] hover:bg-[#EFE9DF] rounded-xl transition-colors cursor-pointer">
                  View All Notifications
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-[#E7E5E4] relative" ref={profileRef}>
            <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center font-black text-[#FFFFFF] text-sm shadow-sm hover:bg-[#57534E] transition-all cursor-pointer">
              AD
            </button>
            <div className={`absolute top-full right-0 mt-3 w-52 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-200 origin-top-right ${isProfileDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
              <div className="p-3 border-b border-[#E7E5E4] bg-[#FAF7F2]">
                <p className="text-xs font-bold text-[#57534E]">Signed in as</p>
                <p className="text-sm font-black text-[#1A1A1A] truncate">{currentUser.name || 'Admin'}</p>
                <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider mt-0.5">{currentUser.role || ''}</p>
              </div>
              <button onClick={() => { setIsProfileDropdownOpen(false); showSignoutConfirm(api, navigate); }}
                className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#D96B5E] hover:bg-[#FAD2CB]/20 transition-all text-left cursor-pointer">
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
        <div className="bg-[#FFFFFF] rounded-3xl shadow-sm border border-[#E7E5E4] flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-[#E7E5E4] bg-[#FAF7F2]">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    isActive
                      ? 'text-[#1A1A1A] border-[#1A1A1A] bg-[#FFFFFF]'
                      : 'text-[#A8A29E] border-transparent hover:text-[#57534E] hover:bg-[#FFFFFF]/50'
                  }`}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Table area */}
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px]">
              <div className="p-6">{renderTable()}</div>
            </div>
          </div>

        </div>
      </div>

      {/* PERMANENT DELETE CONFIRMATION */}
      {permDeleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm animate-backdrop-in">
          <div className="bg-[#FFFFFF] rounded-[2rem] w-full max-w-sm p-8 pt-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-modal-in">
            <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#D96B5E]" />
            <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/20 z-10 pointer-events-none" />
            <div className="relative z-20 flex flex-col items-center mt-2 w-full">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm bg-[#FFFFFF] border-[#FAD2CB] text-[#D96B5E]">
                <AlertCircle size={44} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] uppercase tracking-tight mb-3 leading-none">Delete Permanently?</h2>
              <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                This action cannot be undone. The {permDeleteType === 'products' ? 'product' : permDeleteType === 'suppliers' ? 'supplier' : 'category'} will be permanently removed from the system.
              </p>
              <div className="w-full flex gap-3">
                <button type="button" onClick={() => { setPermDeleteTarget(null); setPermDeleteType(null); }}
                  className="w-full px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={confirmPermanentDelete}
                  className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#D96B5E] hover:bg-[#C45A4D] text-[#FFFFFF] cursor-pointer">
                  <Archive size={16} /> Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[110] bg-[#1A1A1A] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden min-w-[320px] max-w-md origin-right ${
          toast.isClosing ? "animate-toast-out" : "animate-toast-in"}`}>
          <div className="flex items-start justify-between px-5 py-4 gap-4">
            <div className="flex items-start gap-3">
              {toast.type === "error" ? (
                <AlertCircle size={20} className="text-[#D96B5E] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={20} className="text-[#7BB8A7] shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col">
                {toast.type === "error" && (
                  <span className="text-[10px] uppercase tracking-widest text-[#D96B5E] font-black mb-0.5">Error</span>
                )}
                <span className="text-sm font-bold tracking-wide leading-snug">{toast.message}</span>
              </div>
            </div>
            <button onClick={manuallyCloseToast} className="text-[#A8A29E] hover:text-[#FFFFFF] transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10 shrink-0 mt-0.5"><X size={16} /></button>
          </div>
          <div className="h-1 bg-[#333333] w-full">
            <div className={`h-full animate-progress-bar ${toast.type === "error" ? "bg-[#D96B5E]" : "bg-[#7BB8A7]"}`}></div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: transparent transparent; transition: scrollbar-color 0.3s ease; }
        .custom-scrollbar:hover { scrollbar-color: #D6D3D1 transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #D6D3D1; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #A8A29E; }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalZoomIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalZoomOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(10px); } }
        .animate-backdrop-in { animation: modalFadeIn 0.3s ease-out forwards; }
        .animate-modal-in { animation: modalZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-backdrop-out { animation: modalFadeOut 0.3s ease-in forwards; }
        .animate-modal-out { animation: modalZoomOut 0.3s ease-in forwards; }
        @keyframes toastIn { 0% { opacity: 0; transform: translateX(80px) scale(0.6); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes toastOut { 0% { opacity: 1; transform: translateX(0) scale(1); } 100% { opacity: 0; transform: translateX(60px) scale(0.3); } }
        @keyframes progressBarShrink { from { width: 100%; } to { width: 0%; } }
        .animate-toast-in { animation: toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-toast-out { animation: toastOut 0.35s cubic-bezier(0.55, 0, 1, 0.4) forwards; }
        .animate-progress-bar { animation: progressBarShrink 5s linear forwards; }
      `}</style>

      <NotificationDetailModal
        notification={selectedNotification}
        isClosing={detailModalClosing}
        onClose={closeDetailModal}
        onMarkRead={markAsRead}
        onDelete={deleteNotification}
      />
    </DashboardLayout>
  );
}

export default Archives;
