import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout, { useSidebar } from "../context/DashboardLayout";
import NotificationDetailModal from "../components/NotificationDetailModal";
import { useWebSocket } from "../context/WebSocketProvider";
import { showSignoutConfirm } from "../utils/swalHelper";
import ArchivesModal from "../components/ArchivesModal";
import {
  PackageSearch,
  Search,
  Bell,
  Plus,
  AlertCircle,
  X,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  ChevronDown,
  Info,
  LogOut,
  ArchiveRestore,
  Trash2,
  Download,
  Menu
} from "lucide-react";

function StockAdjustments() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  
  // Dropdown States
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailModalClosing, setDetailModalClosing] = useState(false);

  // Refs for Click Outside
  const filterRef = useRef(null);
  const productSelectRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  
  // Modal & Animation States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formError, setFormError] = useState("");

  // Toast Notification State & Refs for Timers
  const [toast, setToast] = useState({ show: false, message: "", isClosing: false });
  const toastTimeout = useRef(null);
  const toastExitTimeout = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    productId: "",
    type: "Stock In",
    quantity: "",
    reason: ""
  });

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [archivedModalClosing, setArchivedModalClosing] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState(null);
  const [isArchivesModalOpen, setIsArchivesModalOpen] = useState(false);
  const [archivesModalClosing, setArchivesModalClosing] = useState(false);
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const loadData = useCallback(async (skipLoading) => {
    if (!skipLoading) setPageLoading(true);
    try {
      const [prodRes, logRes, notifRes] = await Promise.all([
        api.getProductDropdown(), api.getStockLedger(), api.getNotifications(),
      ]);
      setProducts(prodRes.results || prodRes);
      setLogs(logRes.results || logRes);
      setNotifications(notifRes.results || notifRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      if (!skipLoading) setPageLoading(false);
    }
  }, []);

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

  // Handle click outside for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterDropdownOpen(false);
      if (productSelectRef.current && !productSelectRef.current.contains(event.target)) setIsProductDropdownOpen(false);
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
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = (log.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (log.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "All" || log.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, searchQuery, typeFilter]);

  // Handlers
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(""); 
  };

  const openModal = () => {
    setFormData({ productId: "", type: "Stock In", quantity: "", reason: "" });
    setFormError("");
    setIsProductDropdownOpen(false);
    setIsModalOpen(true);
    setIsClosing(false);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300); 
  };

  const showToast = (message) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastExitTimeout.current) clearTimeout(toastExitTimeout.current);
    
    setToast({ show: false, message: "", isClosing: false });
    
    setTimeout(() => {
      setToast({ show: true, message, isClosing: false });
      toastTimeout.current = setTimeout(() => {
        setToast(prev => ({ ...prev, isClosing: true }));
        toastExitTimeout.current = setTimeout(() => {
          setToast({ show: false, message: "", isClosing: false });
        }, 300);
      }, 4700);
    }, 50);
  };

  const manuallyCloseToast = () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (toastExitTimeout.current) clearTimeout(toastExitTimeout.current);

    setToast(prev => ({ ...prev, isClosing: true }));
    toastExitTimeout.current = setTimeout(() => {
      setToast({ show: false, message: "", isClosing: false });
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.productId) {
      setFormError("Please select a valid product from the dropdown.");
      return;
    }

    const qtyChange = parseInt(formData.quantity);
    if (isNaN(qtyChange) || qtyChange <= 0) {
      setFormError("Quantity must be a number greater than 0.");
      return;
    }

    if (formData.reason.length > 60) {
      setFormError("Reason / Remarks must be 60 characters or fewer.");
      return;
    }

    try {
      const payload = {
        product: formData.productId,
        type: formData.type,
        qty: qtyChange,
        user: "EMP-018",
        notes: formData.reason,
      };
      const result = await api.createStockLedger(payload);
      setLogs([result, ...logs]);
      // Refresh product list to get updated stock
      const freshProducts = await api.getProductDropdown();
      setProducts(freshProducts.results || freshProducts);
      closeModal();
      showToast(`Successfully recorded ${formData.type}.`);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const openArchivedModal = async () => {
    setIsArchivedModalOpen(true);
    setArchivedLoading(true);
    try {
      const res = await api.getArchivedProducts();
      setArchivedProducts(res.results || res);
    } catch (err) {
      // fail silently - toast not always available
    }
    setArchivedLoading(false);
  };

  const closeArchivedModal = () => {
    setArchivedModalClosing(true);
    setTimeout(() => {
      setIsArchivedModalOpen(false);
      setArchivedModalClosing(false);
    }, 300);
  };

  const handleUnarchive = async (id) => {
    try {
      await api.unarchiveProduct(id);
      setArchivedProducts(archivedProducts.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permDeleteTarget) return;
    try {
      await api.permanentDeleteProduct(permDeleteTarget);
      setArchivedProducts(archivedProducts.filter(p => p.id !== permDeleteTarget));
      setPermDeleteTarget(null);
    } catch (err) {
      console.error(err);
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Audit Trail</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A]">Stock Adjustments</h1>
          </div>
        </div>

          <div className="flex items-center gap-4">
            
            {/* --- NOTIFICATION DROPDOWN --- */}
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
                
                {/* Header */}
                <div className="p-4 border-b border-[#E7E5E4] bg-[#FAF7F2] flex items-center justify-between shrink-0">
                  <h3 className="font-black text-[#1A1A1A] text-sm">Notifications</h3>
                  {unreadNotifCount > 0 && (
                    <span className="text-[10px] font-black bg-[#D96B5E]/10 text-[#D96B5E] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {unreadNotifCount} New
                    </span>
                  )}
                </div>

                {/* Previews List - WITH overscroll-contain */}
                <div className="flex-1 overflow-y-auto max-h-[50vh] custom-scrollbar overscroll-contain">
                  {notifications.slice(0, 8).map(notif => (
                    <div 
                        key={notif.id} 
                        onClick={() => { openDetailModal(notif); setIsNotifDropdownOpen(false); }}
                        className={`p-4 border-b border-[#E7E5E4] last:border-b-0 hover:bg-[#FAF7F2] transition-colors cursor-pointer flex items-start gap-3 ${notif.is_read ? 'opacity-70 bg-[#FAF7F2]/50' : 'bg-[#FFFFFF]'}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.type === 'warning' ? 'bg-[#FAD2CB]/40 text-[#D96B5E]' : 
                        notif.type === 'success' ? 'bg-[#C3ECE3]/40 text-[#7BB8A7]' : 
                        'bg-[#EFE9DF] text-[#57534E]'
                      }`}>
                        {notif.type === 'warning' ? <AlertCircle size={16} strokeWidth={2.5} /> : 
                         notif.type === 'success' ? <CheckCircle2 size={16} strokeWidth={2.5} /> : 
                         <Info size={16} strokeWidth={2.5} />}
                      </div>
                      
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="text-sm font-bold text-[#1A1A1A] leading-tight">{notif.title}</span>
                        <span className="text-xs text-[#57534E] leading-snug mt-1">{notif.message}</span>
                        <span className="text-[10px] text-[#A8A29E] font-black mt-2 uppercase tracking-wider">{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</span>
                      </div>
                      
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-[#D96B5E] shrink-0 mt-2"></div>
                      )}
                    </div>
                  ))}
                  {pageLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="p-4 border-b border-[#E7E5E4] flex items-start gap-3 animate-pulse">
                        <div className="w-9 h-9 rounded-full bg-[#EFE9DF] shrink-0 mt-0.5" />
                        <div className="flex-1 pr-2 space-y-2 py-1">
                          <div className="h-3 bg-[#EFE9DF] rounded w-3/4" />
                          <div className="h-2.5 bg-[#EFE9DF] rounded w-full" />
                          <div className="h-2 bg-[#EFE9DF] rounded w-1/4" />
                        </div>
                      </div>
                    ))
                  ) : notifications.length === 0 && (
                    <div className="p-8 text-center text-[#57534E] text-sm font-medium">
                      You're all caught up!
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="p-3 border-t border-[#E7E5E4] bg-[#FFFFFF] shrink-0">
                  <Link 
                    to="/notifications" 
                    className="block w-full py-2.5 text-center text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#FAF7F2] hover:bg-[#EFE9DF] rounded-xl transition-colors cursor-pointer"
                  >
                    View All Notifications
                  </Link>
                </div>

              </div>
            </div>
            {/* ----------------------------- */}

            <div className="flex items-center gap-3 pl-4 border-l border-[#E7E5E4] relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center font-black text-[#FFFFFF] text-sm shadow-sm hover:bg-[#57534E] transition-all cursor-pointer"
              >
                AD
              </button>

              <div className={`absolute top-full right-0 mt-3 w-52 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-200 origin-top-right ${isProfileDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                <div className="p-3 border-b border-[#E7E5E4] bg-[#FAF7F2]">
                  <p className="text-xs font-bold text-[#57534E]">Signed in as</p>
                  <p className="text-sm font-black text-[#1A1A1A] truncate">{currentUser.name || 'Admin'}</p>
                  <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-wider mt-0.5">{currentUser.role || ''}</p>
                </div>

                <button
                  onClick={() => { setIsProfileDropdownOpen(false); setIsArchivesModalOpen(true); setArchivesModalClosing(false); }}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#FAF7F2] transition-all border-b border-[#E7E5E4] text-left cursor-pointer w-full"
                >
                  <ArchiveRestore size={18} className="text-[#57534E]" />
                  View Archives
                </button>

                <button
                  onClick={() => { setIsProfileDropdownOpen(false); showSignoutConfirm(api, navigate); }}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#D96B5E] hover:bg-[#FAD2CB]/20 transition-all text-left cursor-pointer"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">

          <div className="bg-[#FFFFFF] rounded-3xl shadow-sm border border-[#E7E5E4] flex flex-col relative z-10 overflow-hidden">
            
            <div className="p-5 sm:p-6 border-b border-[#E7E5E4] flex flex-col lg:flex-row gap-4 justify-between items-center bg-[#FAF7F2] relative z-30">
              
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" />
                <input 
                  type="text" 
                  placeholder="Search item or reason..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] shadow-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                
                {/* --- CUSTOM TYPE FILTER DROPDOWN --- */}
                <div className="relative w-full sm:w-auto min-w-[170px]" ref={filterRef}>
                  <div 
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#1A1A1A] rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-between"
                  >
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" />
                    <span className="text-sm font-bold text-[#1A1A1A] truncate mr-2">
                      {typeFilter === "All" ? "All Types" : typeFilter}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#57534E] shrink-0 transition-transform duration-300 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  <div className={`absolute top-full left-0 right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top w-full min-w-[170px] ${isFilterDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                    {['All', 'Stock In', 'Stock Out'].map((option) => (
                      <div 
                        key={option}
                        onClick={() => {
                          setTypeFilter(option);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`mx-2 my-1 px-4 py-2.5 text-sm font-bold cursor-pointer transition-all rounded-full flex items-center justify-start text-left ${
                          typeFilter === option 
                            ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                            : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {option === 'All' ? 'All Types' : option}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => api.exportStockLedgerCSV()}
                  title="Export CSV"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] hover:bg-[#EFE9DF] text-[#57534E] hover:text-[#1A1A1A] rounded-xl font-black uppercase tracking-widest text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Download size={16} /> CSV
                </button>

                <button 
                  onClick={openModal}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#57534E] text-[#FFFFFF] rounded-xl font-black uppercase tracking-widest text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} /> Record Adjustment
                </button>

              </div>
            </div>
            
            {pageLoading ? (
              <div className="w-full overflow-x-auto custom-scrollbar">
                <div className="min-w-[900px] animate-pulse">
                  <div className="bg-[#FAF7F2] border-b border-[#E7E5E4]">
                    <div className="h-12 bg-[#EFE9DF] rounded" />
                  </div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-6 p-5 border-b border-[#E7E5E4] bg-[#FFFFFF] items-center">
                      <div className="h-4 bg-[#EFE9DF] rounded w-[15%]" />
                      <div className="h-4 bg-[#EFE9DF] rounded w-[30%]" />
                      <div className="h-6 bg-[#EFE9DF] rounded w-[15%]" />
                      <div className="h-6 bg-[#EFE9DF] rounded w-[15%]" />
                      <div className="h-4 bg-[#EFE9DF] rounded w-[25%]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full overflow-x-auto custom-scrollbar">
                <div className="min-w-[900px]">
                
                <div className="bg-[#FAF7F2] border-b border-[#E7E5E4] relative z-20">
                  <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[15%]" />
                      <col className="w-[30%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[25%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Date & Time</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Product</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Type</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Qty Changed</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Reason / Remarks</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="overflow-y-auto h-[500px] w-full custom-scrollbar relative z-10 bg-[#FFFFFF]">
                  <table className="w-full text-left border-collapse table-fixed responsive-table-stock">
                    <colgroup>
                      <col className="w-[15%]" />
                      <col className="w-[30%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[25%]" />
                    </colgroup>
                    <tbody className="divide-y divide-[#E7E5E4]">
                      {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAF7F2]/50 transition-colors bg-[#FFFFFF]">
                          <td className="py-4 px-6 text-sm text-[#57534E] font-medium whitespace-nowrap" data-label="Date">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                          </td>
                          <td className="py-4 px-6 font-bold text-[#1A1A1A]" data-label="Product">{log.product_name}</td>
                          <td className="py-4 px-6" data-label="Type">
                            {log.type === "Stock In" ? (
                              <span className="flex items-center gap-1.5 w-fit text-[10px] font-black uppercase tracking-wider text-[#7BB8A7] bg-[#C3ECE3]/40 px-2.5 py-1 rounded-md border border-[#C3ECE3]">
                                <ArrowUpRight size={14} strokeWidth={3} /> {log.type}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 w-fit text-[10px] font-black uppercase tracking-wider text-[#D96B5E] bg-[#FAD2CB]/40 px-2.5 py-1 rounded-md border border-[#FAD2CB]">
                                <ArrowDownRight size={14} strokeWidth={3} /> {log.type}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6" data-label="Qty">
                            <span className={`text-base font-black ${log.type === "Stock In" ? "text-[#7BB8A7]" : "text-[#D96B5E]"}`}>
                              {log.type === "Stock In" ? "+" : "-"}{log.qty}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-[#57534E] italic" data-label="Notes">"{log.notes}"</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-[#57534E] font-medium">
                            No adjustment records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
            )}

          </div>
        </div>

      {/* --- ADJUSTMENT MODAL --- */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`bg-[#FFFFFF] w-full max-w-lg rounded-3xl shadow-2xl flex flex-col relative ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            
            <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] rounded-t-3xl flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-[#1A1A1A]">Record Stock Adjustment</h2>
              <button 
                onClick={closeModal}
                className="text-[#57534E] hover:text-[#1A1A1A] p-2 bg-transparent rounded-full hover:bg-[#EFE9DF] transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1">
              {formError && (
                <div className="bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#9A2E22] px-4 py-3 rounded-xl mb-6 text-sm font-bold flex items-start gap-2 shadow-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="adjustmentForm" onSubmit={handleSubmit} className="space-y-5">
                
                {/* --- CUSTOM PRODUCT DROPDOWN --- */}
                <div className="relative" ref={productSelectRef}>
                  <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Select Product</label>
                  <div 
                    onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                    className={`w-full px-4 py-3 bg-[#FAF7F2] border rounded-xl flex items-center justify-between cursor-pointer transition-all ${isProductDropdownOpen ? 'border-[#1A1A1A] ring-2 ring-[#1A1A1A]/20' : 'border-[#E7E5E4] hover:border-[#1A1A1A]'}`}
                  >
                    <span className={`text-sm font-bold truncate ${formData.productId ? 'text-[#1A1A1A]' : 'text-[#A8A29E]'}`}>
                      {formData.productId 
                        ? `${products.find(p => p.id === formData.productId)?.name} (Current Stock: ${products.find(p => p.id === formData.productId)?.stock})`
                        : "-- Choose an item --"}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-[#57534E] shrink-0 transition-transform duration-300 ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  <div className={`absolute top-full left-0 right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar overscroll-contain transition-all duration-200 origin-top ${isProductDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                    {products.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setFormData({ ...formData, productId: p.id });
                          setIsProductDropdownOpen(false);
                          setFormError("");
                        }}
                        className={`mx-2 my-1 px-4 py-3 text-sm font-bold cursor-pointer transition-all rounded-full flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left ${
                          formData.productId === p.id 
                            ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                            : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-black px-2.5 py-1 rounded-full transition-colors ${
                          formData.productId === p.id 
                            ? 'bg-[#FFFFFF] text-[#7BB8A7] shadow-sm' 
                            : (p.stock > 0 ? 'bg-[#C3ECE3]/50 text-[#7BB8A7]' : 'bg-[#FAD2CB]/50 text-[#D96B5E]')
                        }`}>
                          Stock: {p.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Type</label>
                    <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E7E5E4]">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "Stock In" })}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                          formData.type === "Stock In" ? "bg-[#1A1A1A] text-[#FFFFFF] shadow-sm" : "text-[#57534E] hover:text-[#1A1A1A]"
                        }`}
                      >
                        Stock In
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "Stock Out" })}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                          formData.type === "Stock Out" ? "bg-[#D96B5E] text-[#FFFFFF] shadow-sm" : "text-[#57534E] hover:text-[#D96B5E]"
                        }`}
                      >
                        Stock Out
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Quantity Change</label>
                    <input 
                      type="number" required name="quantity" value={formData.quantity} onChange={handleInputChange} min="1"
                      className="w-full px-4 py-2.5 bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB8A7] transition-all text-base font-black text-[#1A1A1A]"
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Reason / Remarks</label>
                  <textarea 
                    required name="reason" value={formData.reason} onChange={handleInputChange} maxLength={60}
                    className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] min-h-[100px] resize-none"
                    placeholder="e.g., Damaged item disposed, found extra inventory..."
                  />
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-[#E7E5E4] bg-[#FAF7F2] rounded-b-3xl flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-6 py-3 bg-[#FFFFFF] border border-[#E7E5E4] text-[#1A1A1A] rounded-xl font-black uppercase text-xs tracking-widest shadow-sm hover:bg-[#EFE9DF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" form="adjustmentForm"
                className="px-6 py-3 bg-[#1A1A1A] text-[#FFFFFF] rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-[#57534E] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                Submit Adjustment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION --- */}
      {toast.show && (
        <div 
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[110] bg-[#1A1A1A] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden min-w-[320px] origin-right ${
            toast.isClosing ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-[#7BB8A7]" />
              <span className="text-sm font-bold tracking-wide">{toast.message}</span>
            </div>
            <button 
              onClick={manuallyCloseToast} 
              className="text-[#A8A29E] hover:text-[#FFFFFF] transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="h-1 bg-[#333333] w-full">
            <div className="h-full bg-[#7BB8A7] animate-progress-bar"></div>
          </div>
        </div>
      )}

      {/* --- ARCHIVED PRODUCTS MODAL --- */}
      {isArchivedModalOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${archivedModalClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`bg-[#FFFFFF] w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] ${archivedModalClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            
            <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] rounded-t-3xl flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-[#1A1A1A]">Archived Products</h2>
                <p className="text-xs text-[#57534E] font-medium mt-1">Manage permanently deleted or restored items</p>
              </div>
              <button onClick={closeArchivedModal} className="text-[#57534E] hover:text-[#1A1A1A] p-2 bg-transparent rounded-full hover:bg-[#EFE9DF] transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain p-6">
              {archivedLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-[#E7E5E4] border-t-[#1A1A1A] rounded-full animate-spin"></div>
                </div>
              ) : archivedProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <ArchiveRestore size={48} className="mx-auto text-[#A8A29E] mb-4" />
                  <p className="text-[#57534E] font-bold text-lg">No archived products</p>
                  <p className="text-[#A8A29E] text-sm mt-1">Archived items will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[35%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[#E7E5E4]">
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">SKU</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Product</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Cost</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Stock</th>
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
                            <span className="text-xs text-[#57534E] block">{p.category_name}</span>
                          </td>
                          <td className="py-4 px-4 text-sm font-bold text-[#1A1A1A]">₱{p.cost_price}</td>
                          <td className="py-4 px-4">
                            <span className="text-sm font-black text-[#D96B5E]">{p.stock}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUnarchive(p.id)}
                                className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <ArchiveRestore size={14} /> Restore
                              </button>
                              <button
                                onClick={() => setPermDeleteTarget(p.id)}
                                className="px-3 py-2 bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#D96B5E] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FAD2CB]/60 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E7E5E4] bg-[#FAF7F2] rounded-b-3xl flex justify-end shrink-0">
              <button onClick={closeArchivedModal} className="px-6 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] text-[#1A1A1A] rounded-xl font-black uppercase text-xs tracking-widest shadow-sm hover:bg-[#EFE9DF] transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PERMANENT DELETE CONFIRMATION --- */}
      {permDeleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm animate-backdrop-in">
          <div className="bg-[#FFFFFF] rounded-[2rem] w-full max-w-sm p-8 pt-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-modal-in">
            <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#D96B5E]" />
            <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/20 z-10 pointer-events-none" />

            <div className="relative z-20 flex flex-col items-center mt-2 w-full">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm bg-[#FFFFFF] border-[#FAD2CB] text-[#D96B5E]">
                <AlertCircle size={44} strokeWidth={2.5} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] uppercase tracking-tight mb-3 leading-none">
                Delete Permanently?
              </h2>
              <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                This action cannot be undone. All transaction history linked to this product will be permanently removed.
              </p>

              <div className="w-full flex gap-3">
                <button
                  type="button"
                  onClick={() => setPermDeleteTarget(null)}
                  className="w-full px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#D96B5E] hover:bg-[#C45A4D] text-[#FFFFFF] cursor-pointer"
                >
                  <Trash2 size={16} /> Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ArchivesModal
        isOpen={isArchivesModalOpen}
        isClosing={archivesModalClosing}
        onClose={() => { setArchivesModalClosing(true); setTimeout(() => { setIsArchivesModalOpen(false); setArchivesModalClosing(false); }, 300); }}
      />

      <style>{`
        /* EXACT Scrollbar styles */
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: transparent transparent; transition: scrollbar-color 0.3s ease; }
        .custom-scrollbar:hover { scrollbar-color: #D6D3D1 transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #D6D3D1; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #A8A29E; }

        /* Modal animations */
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalZoomIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalZoomOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(10px); } }
        .animate-backdrop-in { animation: modalFadeIn 0.3s ease-out forwards; }
        .animate-modal-in { animation: modalZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-backdrop-out { animation: modalFadeOut 0.3s ease-in forwards; }
        .animate-modal-out { animation: modalZoomOut 0.3s ease-in forwards; }

        /* Toast entry and exit animations */
        @keyframes toastIn {
          0% { opacity: 0; transform: translateX(80px) scale(0.6); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          0% { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(60px) scale(0.3); }
        }
        @keyframes progressBarShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
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

export default StockAdjustments;