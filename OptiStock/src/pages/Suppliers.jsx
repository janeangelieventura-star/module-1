import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout, { useSidebar } from "../context/DashboardLayout";
import NotificationDetailModal from "../components/NotificationDetailModal";
import { useWebSocket } from "../context/WebSocketProvider";
import { showSignoutConfirm } from "../utils/swalHelper";
import {
  Search,
  Bell,
  Plus,
  Edit,
  Archive,
  AlertCircle,
  X,
  Truck,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ArrowDownAZ,
  Info,
  LogOut,
  ArchiveRestore,
  Menu
} from "lucide-react";

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  
  // UI & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Company (A-Z)");
  
  // Dropdown States
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailModalClosing, setDetailModalClosing] = useState(false);

  // Refs
  const sortRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Modal & Animation States
  const [isClosing, setIsClosing] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, supplier: null });
  
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formError, setFormError] = useState("");

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "success", isClosing: false });
  const toastTimeout = useRef(null);
  const toastExitTimeout = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: ""
  });

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [archivedModalClosing, setArchivedModalClosing] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState(null);
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const loadData = useCallback(async (skipLoading) => {
    if (!skipLoading) setPageLoading(true);
    try {
      const [supRes, notifRes] = await Promise.all([
        api.getSuppliers(), api.getNotifications(),
      ]);
      setSuppliers(supRes.results || supRes);
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
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortDropdownOpen(false);
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

  // Filtered & Sorted Suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    let filtered = suppliers.filter(supplier => 
      supplier.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      supplier.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === "Company (A-Z)") {
      filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
    } else if (sortBy === "Company (Z-A)") {
      filtered.sort((a, b) => b.company_name.localeCompare(a.company_name));
    } else if (sortBy === "Most Products") {
      filtered.sort((a, b) => b.products_supplied - a.products_supplied);
    }

    return filtered;
  }, [suppliers, searchQuery, sortBy]);

  // Toast Handlers
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

  // Modal Handlers
  const closeAllModals = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFormModalOpen(false);
      setDeleteModalConfig({ isOpen: false, supplier: null });
      setIsClosing(false);
    }, 300);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError("");
  };

  const openAddModal = () => {
    setFormData({ companyName: "", contactPerson: "", email: "", phone: "", address: "" });
    setEditingSupplier(null);
    setFormError("");
    setIsFormModalOpen(true);
    setIsClosing(false);
  };

  const openEditModal = (supplier) => {
    setFormData({ 
      companyName: supplier.company_name, 
      contactPerson: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address
    });
    setEditingSupplier(supplier);
    setFormError("");
    setIsFormModalOpen(true);
    setIsClosing(false);
  };

  const openDeleteModal = (supplier) => {
    if (supplier.products_supplied > 0) {
      showToast(`Cannot delete "${supplier.company_name}". There are ${supplier.products_supplied} products currently linked to this supplier.`, "error");
      return;
    }
    setDeleteModalConfig({ isOpen: true, supplier });
    setIsClosing(false);
  };

  // Submit Form Action
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const cleanName = formData.companyName.trim();
    if (!cleanName) {
      setFormError("Company name cannot be empty.");
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(cleanName)) {
      setFormError("Company name: letters, numbers, and spaces only.");
      return;
    }
    if (cleanName.length > 40) {
      setFormError("Company name must be 40 characters or fewer.");
      return;
    }
    if (!/^[a-zA-Z ]+$/.test(formData.contactPerson)) {
      setFormError("Contact person: letters and spaces only.");
      return;
    }
    if (formData.contactPerson.length > 40) {
      setFormError("Contact person must be 40 characters or fewer.");
      return;
    }
    if (formData.email.length > 40) {
      setFormError("Email must be 40 characters or fewer.");
      return;
    }
    if (!/^\d{11}$/.test(formData.phone)) {
      setFormError("Phone number must be exactly 11 digits.");
      return;
    }
    if (formData.address.length > 50) {
      setFormError("Address must be 50 characters or fewer.");
      return;
    }

    try {
      if (editingSupplier) {
        const updated = await api.updateSupplier(editingSupplier.id, {
          company_name: cleanName,
          contact_person: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        });
        setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? updated : s));
        closeAllModals();
        showToast(`Supplier "${cleanName}" successfully updated.`, "success");
      } else {
        const newSupplier = await api.createSupplier({
          company_name: cleanName,
          contact_person: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
        });
        setSuppliers([newSupplier, ...suppliers]);
        closeAllModals();
        showToast(`Supplier "${cleanName}" successfully registered.`, "success");
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Confirm Delete Action
  const confirmDelete = async () => {
    if (!deleteModalConfig.supplier) return;
    const deletedName = deleteModalConfig.supplier.company_name;
    try {
      await api.deleteSupplier(deleteModalConfig.supplier.id);
      setSuppliers(suppliers.filter(s => s.id !== deleteModalConfig.supplier.id));
      closeAllModals();
      showToast(`Supplier "${deletedName}" has been permanently removed.`, "success");
    } catch (err) {
      showToast(err.message, "error");
      closeAllModals();
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Partner Directory</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A]">Suppliers</h1>
          </div>
        </div>

          <div className="flex items-center gap-4">
            
            {/* --- NOTIFICATION DROPDOWN PREVIEW --- */}
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
                  {notifications.slice(0, 8).map(notif => {
                    const notifType = notif.type === 'sale' ? 'success' : ['stock_alert','error'].includes(notif.type) ? 'warning' : 'info';
                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => { openDetailModal(notif); setIsNotifDropdownOpen(false); }}
                        className={`p-4 border-b border-[#E7E5E4] last:border-b-0 hover:bg-[#FAF7F2] transition-colors cursor-pointer flex items-start gap-3 ${notif.is_read ? 'opacity-70 bg-[#FAF7F2]/50' : 'bg-[#FFFFFF]'}`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          notifType === 'warning' ? 'bg-[#FAD2CB]/40 text-[#D96B5E]' : 
                          notifType === 'success' ? 'bg-[#C3ECE3]/40 text-[#7BB8A7]' : 
                          'bg-[#EFE9DF] text-[#57534E]'
                        }`}>
                          {notifType === 'warning' ? <AlertCircle size={16} strokeWidth={2.5} /> : 
                           notifType === 'success' ? <CheckCircle2 size={16} strokeWidth={2.5} /> : 
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
                    );
                  })}
                  {pageLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`skel-${i}`} className="p-4 border-b border-[#E7E5E4] flex items-start gap-3 animate-pulse">
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
                  onClick={() => { setIsProfileDropdownOpen(false); openArchivedModal(); }}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#FAF7F2] transition-all border-b border-[#E7E5E4] text-left cursor-pointer"
                >
                  <ArchiveRestore size={18} className="text-[#57534E]" />
                  Archived Products
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
                  placeholder="Search company or contact..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] shadow-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                
                {/* --- CUSTOM SORT DROPDOWN --- */}
                <div className="relative w-full sm:w-auto min-w-[190px]" ref={sortRef}>
                  <div 
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#1A1A1A] rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-between"
                  >
                    <ArrowDownAZ className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" />
                    <span className="text-sm font-bold text-[#1A1A1A] truncate mr-2">
                      {sortBy}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#57534E] shrink-0 transition-transform duration-300 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  <div className={`absolute top-full right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top w-full min-w-[190px] ${isSortDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                    {['Company (A-Z)', 'Company (Z-A)', 'Most Products'].map((option) => (
                      <div 
                        key={option}
                        onClick={() => {
                          setSortBy(option);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`mx-2 my-1 px-4 py-2.5 text-sm font-bold cursor-pointer transition-all rounded-full flex items-center justify-start text-left ${
                          sortBy === option 
                            ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                            : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={openAddModal}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#57534E] text-[#FFFFFF] rounded-xl font-black uppercase tracking-widest text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} /> Add Supplier
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
                      <div className="h-4 bg-[#EFE9DF] rounded w-[25%]" />
                      <div className="h-4 bg-[#EFE9DF] rounded w-[25%]" />
                      <div className="h-4 bg-[#EFE9DF] rounded w-[25%]" />
                      <div className="h-6 bg-[#EFE9DF] rounded w-[15%]" />
                      <div className="h-4 bg-[#EFE9DF] rounded w-[10%]" />
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
                      <col className="w-[25%]" /> 
                      <col className="w-[25%]" /> 
                      <col className="w-[25%]" /> 
                      <col className="w-[15%]" /> 
                      <col className="w-[10%]" /> 
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Company Details</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Contact Information</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Address</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-center">Linked Products</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="overflow-y-auto h-[500px] w-full custom-scrollbar relative z-10 bg-[#FFFFFF]">
                  <table className="w-full text-left border-collapse table-fixed responsive-table-simple">
                    <colgroup>
                      <col className="w-[25%]" />
                      <col className="w-[25%]" />
                      <col className="w-[25%]" />
                      <col className="w-[15%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <tbody className="divide-y divide-[#E7E5E4]">
                      {filteredAndSortedSuppliers.length > 0 ? filteredAndSortedSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="hover:bg-[#FAF7F2]/50 transition-colors bg-[#FFFFFF] group">
                          
                          <td className="py-4 px-6" data-label="Company">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#1A1A1A] text-base">{supplier.company_name}</span>
                              <span className="text-xs text-[#57534E] flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#7BB8A7]"></span> {supplier.contact_person}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6" data-label="Contact">
                            <div className="flex flex-col gap-1.5 text-sm text-[#57534E]">
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-[#A8A29E]" /> {supplier.email || "-"}
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-[#A8A29E]" /> {supplier.phone || "-"}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-sm text-[#57534E] truncate" title={supplier.address} data-label="Address">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-[#A8A29E] shrink-0" />
                              <span className="truncate">{supplier.address || "No address provided"}</span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center" data-label="Products">
                            <div className="inline-flex items-center justify-center min-w-[2.5rem] h-6 px-2 bg-[#EFE9DF] rounded-full text-xs font-black text-[#1A1A1A] border border-[#E7E5E4]">
                              {supplier.products_supplied}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right" data-label="">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => openEditModal(supplier)}
                                className="p-2 text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A] rounded-lg transition-colors border border-transparent hover:border-[#E7E5E4] cursor-pointer"
                                title="Edit Supplier"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => openDeleteModal(supplier)}
                                className={`p-2 rounded-lg transition-colors border border-transparent cursor-pointer ${
                                  supplier.products_supplied > 0 
                                    ? "text-[#A8A29E] cursor-not-allowed opacity-50" 
                                    : "text-[#D96B5E] hover:bg-[#FAD2CB]/50 hover:border-[#FAD2CB]"
                                }`}
                                title={supplier.products_supplied > 0 ? "Cannot delete supplier in use" : "Delete Supplier"}
                              >
                                <Archive size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-[#57534E] font-medium">
                            No suppliers found matching your search.
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

        {/* --- ADD / EDIT MODAL --- */}
        {isFormModalOpen && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
            <div className={`bg-[#FFFFFF] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
              
              <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] flex justify-between items-center shrink-0">
                <h2 className="text-xl font-black text-[#1A1A1A] flex items-center gap-2">
                  <Truck size={20} className="text-[#7BB8A7]" />
                  {editingSupplier ? "Edit Supplier Profile" : "Register New Supplier"}
                </h2>
                <button 
                  onClick={closeAllModals}
                  className="text-[#57534E] hover:text-[#1A1A1A] p-2 bg-transparent rounded-full hover:bg-[#EFE9DF] transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {formError && (
                  <div className="bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#9A2E22] px-4 py-3 rounded-xl mb-6 text-sm font-bold flex items-start gap-2 shadow-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form id="supplierForm" onSubmit={handleSubmit} className="space-y-5">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Company / Vendor Name</label>
                      <input 
                        type="text" required name="companyName" value={formData.companyName} onChange={handleInputChange} maxLength={40}
                        className="w-full px-4 py-3 bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB8A7] transition-all text-sm font-black text-[#1A1A1A]"
                        placeholder="e.g., Prime Logistics"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Contact Person</label>
                      <input 
                        type="text" required name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} maxLength={40}
                        className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-bold text-[#1A1A1A]"
                        placeholder="Full Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                        <input 
                          type="email" name="email" value={formData.email} onChange={handleInputChange} maxLength={40}
                          className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-bold text-[#1A1A1A]"
                          placeholder="sales@company.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                        <input 
                          type="text" name="phone" value={formData.phone} onChange={handleInputChange} maxLength={11}
                          className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-bold text-[#1A1A1A]"
                          placeholder="+63 912 345 6789"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Physical Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-4 w-4 h-4 text-[#A8A29E]" />
                      <textarea 
                        name="address" value={formData.address} onChange={handleInputChange} maxLength={50}
                        className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] min-h-[80px] resize-none"
                        placeholder="Full street address, city, region..."
                      />
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 border-t border-[#E7E5E4] bg-[#FAF7F2] flex justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={closeAllModals}
                  className="px-6 py-3 bg-[#FFFFFF] border border-[#E7E5E4] text-[#1A1A1A] rounded-xl font-black uppercase text-xs tracking-widest shadow-sm hover:bg-[#EFE9DF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" form="supplierForm"
                  className="px-6 py-3 bg-[#1A1A1A] text-[#FFFFFF] rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-[#57534E] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  {editingSupplier ? "Save Changes" : "Save Supplier"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* --- NEW CUSTOM DELETE CONFIRMATION MODAL --- */}
        {deleteModalConfig.isOpen && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
            <div className={`bg-[#FFFFFF] rounded-[2rem] w-full max-w-sm p-8 pt-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
              
              {/* Background Header */}
              <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#D96B5E]" />
              <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/20 z-10 pointer-events-none" />

              <div className="relative z-20 flex flex-col items-center mt-2 w-full">
                {/* Icon */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm bg-[#FFFFFF] border-[#FAD2CB] text-[#D96B5E]">
                  <AlertCircle size={44} strokeWidth={2.5} />
                </div>

                {/* Text */}
                <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] uppercase tracking-tight mb-3 leading-none">
                  Confirm Delete
                </h2>
                <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                  Are you sure you want to permanently remove <span className="font-bold text-[#1A1A1A]">"{deleteModalConfig.supplier?.company_name}"</span> from your directory? This action cannot be undone.
                </p>

                {/* Buttons */}
                <div className="w-full flex gap-3">
                  <button 
                    type="button"
                    onClick={closeAllModals}
                    className="w-full px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={confirmDelete}
                    className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#D96B5E] hover:bg-[#C45A4D] text-[#FFFFFF] cursor-pointer"
                  >
                    <Archive size={16} /> Delete
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- TOAST NOTIFICATION (Supports Error and Success) --- */}
        {toast.show && (
          <div 
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[110] bg-[#1A1A1A] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden min-w-[320px] max-w-md origin-right ${
            toast.isClosing ? "animate-toast-out" : "animate-toast-in"
          }`}
          >
            <div className="flex items-start justify-between px-5 py-4 gap-4">
              <div className="flex items-start gap-3">
                {toast.type === "error" ? (
                  <AlertCircle size={20} className="text-[#D96B5E] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={20} className="text-[#7BB8A7] shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col">
                  {toast.type === "error" && (
                    <span className="text-[10px] uppercase tracking-widest text-[#D96B5E] font-black mb-0.5">Constraint Violation</span>
                  )}
                  <span className="text-sm font-bold tracking-wide leading-snug">{toast.message}</span>
                </div>
              </div>
              <button 
                onClick={manuallyCloseToast} 
                className="text-[#A8A29E] hover:text-[#FFFFFF] transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10 shrink-0 mt-0.5"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="h-1 bg-[#333333] w-full">
              <div className={`h-full animate-progress-bar ${toast.type === "error" ? "bg-[#D96B5E]" : "bg-[#7BB8A7]"}`}></div>
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
                                  <Archive size={14} /> Delete
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
                    <Archive size={16} /> Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

export default Suppliers;