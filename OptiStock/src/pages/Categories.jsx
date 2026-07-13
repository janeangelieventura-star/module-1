import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout, { useSidebar } from "../context/DashboardLayout";
import NotificationDetailModal from "../components/NotificationDetailModal";
import { useWebSocket } from "../context/WebSocketProvider";
import { showSignoutConfirm } from "../utils/swalHelper";
import {
  Tags,
  Search,
  Bell,
  Plus,
  Edit,
  Archive,
  AlertCircle,
  X,
  CheckCircle2,
  ChevronDown,
  ArrowDownAZ,
  Info,
  LogOut,
  ArchiveRestore,
  Menu
} from "lucide-react";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  
  // UI & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Name (A-Z)");
  
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
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, category: null });
  
  const [editingCategory, setEditingCategory] = useState(null);
  const [formError, setFormError] = useState("");

  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "success", isClosing: false });
  const toastTimeout = useRef(null);
  const toastExitTimeout = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const loadData = useCallback(async (skipLoading) => {
    if (!skipLoading) setPageLoading(true);
    try {
      const [catRes, notifRes] = await Promise.all([
        api.getCategories(), api.getNotifications(),
      ]);
      setCategories(catRes.results || catRes);
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

  // Filtered & Sorted Categories
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === "Name (A-Z)") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "Name (Z-A)") {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "Items (High-Low)") {
      filtered.sort((a, b) => b.product_count - a.product_count);
    }

    return filtered;
  }, [categories, searchQuery, sortBy]);

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
      setDeleteModalConfig({ isOpen: false, category: null });
      setIsClosing(false);
    }, 300);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError("");
  };

  const openAddModal = () => {
    setFormData({ name: "", description: "" });
    setEditingCategory(null);
    setFormError("");
    setIsFormModalOpen(true);
    setIsClosing(false);
  };

  const openEditModal = (category) => {
    setFormData({ name: category.name, description: category.description });
    setEditingCategory(category);
    setFormError("");
    setIsFormModalOpen(true);
    setIsClosing(false);
  };

  const openDeleteModal = (category) => {
    if (category.product_count > 0) {
      showToast(`Cannot archive "${category.name}". There are ${category.product_count} products currently assigned to this category.`, "error");
      return;
    }
    setDeleteModalConfig({ isOpen: true, category });
    setIsClosing(false);
  };

  // Submit Form Action
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const cleanName = formData.name.trim();
    if (!cleanName) {
      setFormError("Category name cannot be empty.");
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(cleanName)) {
      setFormError("Category name: letters, numbers, and spaces only.");
      return;
    }
    if (cleanName.length > 40) {
      setFormError("Category name must be 40 characters or fewer.");
      return;
    }
    if (formData.description && formData.description.length > 60) {
      setFormError("Description must be 60 characters or fewer.");
      return;
    }

    try {
      if (editingCategory) {
        const updated = await api.updateCategory(editingCategory.id, {
          name: cleanName, description: formData.description,
        });
        setCategories(categories.map(c => c.id === editingCategory.id ? updated : c));
        closeAllModals();
        showToast(`Category "${cleanName}" successfully updated.`, "success");
      } else {
        const newCat = await api.createCategory({
          name: cleanName, description: formData.description,
        });
        setCategories([newCat, ...categories]);
        closeAllModals();
        showToast(`Category "${cleanName}" successfully created.`, "success");
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Confirm Archive Action
  const confirmDelete = async () => {
    if (!deleteModalConfig.category) return;
    const archiveName = deleteModalConfig.category.name;
    try {
      await api.archiveCategory(deleteModalConfig.category.id);
      setCategories(categories.filter(c => c.id !== deleteModalConfig.category.id));
      closeAllModals();
      showToast(`Category "${archiveName}" has been archived.`, "success");
    } catch (err) {
      showToast(err.message, "error");
      closeAllModals();
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Data Standardization</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A]">Categories</h1>
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

                <Link
                  to="/archives"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#FAF7F2] transition-all border-b border-[#E7E5E4] text-left cursor-pointer"
                >
                  <ArchiveRestore size={18} className="text-[#57534E]" />
                  View Archives
                </Link>

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
                  placeholder="Search categories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] shadow-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                
                {/* --- CUSTOM SORT DROPDOWN --- */}
                <div className="relative w-full sm:w-auto min-w-[170px]" ref={sortRef}>
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
                  
                  <div className={`absolute top-full right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top w-full min-w-[180px] ${isSortDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                    {['Name (A-Z)', 'Name (Z-A)', 'Items (High-Low)'].map((option) => (
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
                  <Plus size={16} strokeWidth={3} /> Add Category
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
                      <div className="h-4 bg-[#EFE9DF] rounded w-[30%]" />
                      <div className="h-4 bg-[#EFE9DF] rounded w-[45%]" />
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
                      <col className="w-[30%]" />
                      <col className="w-[45%]" />
                      <col className="w-[15%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Category Name</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Description</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-center">Assigned Products</th>
                        <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                <div className="overflow-y-auto h-[500px] w-full custom-scrollbar relative z-10 bg-[#FFFFFF]">
                  <table className="w-full text-left border-collapse table-fixed responsive-table-simple">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[45%]" />
                      <col className="w-[15%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <tbody className="divide-y divide-[#E7E5E4]">
                      {filteredAndSortedCategories.length > 0 ? filteredAndSortedCategories.map((category) => (
                        <tr key={category.id} className="hover:bg-[#FAF7F2]/50 transition-colors bg-[#FFFFFF] group">
                          <td className="py-4 px-6" data-label="Name">
                            <span className="font-bold text-[#1A1A1A] flex items-center gap-2">
                              <Tags size={14} className="text-[#A8A29E]" />
                              {category.name}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-[#57534E] truncate" data-label="Description">
                            {category.description || <span className="italic opacity-50">No description provided</span>}
                          </td>
                          <td className="py-4 px-6 text-center" data-label="Products">
                            <div className="inline-flex items-center justify-center min-w-[2.5rem] h-6 px-2 bg-[#EFE9DF] rounded-full text-xs font-black text-[#1A1A1A] border border-[#E7E5E4]">
                              {category.product_count}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right" data-label="">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => openEditModal(category)}
                                className="p-2 text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A] rounded-lg transition-colors border border-transparent hover:border-[#E7E5E4] cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => openDeleteModal(category)}
                                className={`p-2 rounded-lg transition-colors border border-transparent cursor-pointer ${
                                  category.product_count > 0 
                                    ? "text-[#A8A29E] cursor-not-allowed opacity-50" 
                                    : "text-[#D96B5E] hover:bg-[#FAD2CB]/50 hover:border-[#FAD2CB]"
                                }`}
                                title={category.product_count > 0 ? "Cannot archive category in use" : "Archive Category"}
                              >
                                <Archive size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-[#57534E] font-medium">
                            No categories found matching your criteria.
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
          <div className={`bg-[#FFFFFF] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            
            <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-[#1A1A1A]">
                {editingCategory ? "Edit Category" : "New Category"}
              </h2>
              <button 
                onClick={closeAllModals}
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

              <form id="categoryForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Category Name</label>
                  <input 
                    type="text" required name="name" value={formData.name} onChange={handleInputChange} maxLength={40}
                    className="w-full px-4 py-3 bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB8A7] transition-all text-base font-black text-[#1A1A1A]"
                    placeholder="e.g., Electronics, Beverages"
                  />
                  <p className="text-[10px] font-bold text-[#A8A29E] mt-1.5 uppercase tracking-wider">Must be unique across the system</p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Description <span className="opacity-50">(Optional)</span></label>
                  <textarea 
                    name="description" value={formData.description} onChange={handleInputChange} maxLength={60}
                    className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] min-h-[80px] resize-none"
                    placeholder="Brief description of the category..."
                  />
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
                type="submit" form="categoryForm"
                className="px-6 py-3 bg-[#1A1A1A] text-[#FFFFFF] rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-[#57534E] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- ARCHIVE CONFIRMATION MODAL --- */}
      {deleteModalConfig.isOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`bg-[#FFFFFF] rounded-[2rem] w-full max-w-sm p-8 pt-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            
            {/* Background Header */}
            <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#7BB8A7]" />
            <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/20 z-10 pointer-events-none" />

            <div className="relative z-20 flex flex-col items-center mt-2 w-full">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm bg-[#FFFFFF] border-[#C3ECE3] text-[#7BB8A7]">
                <ArchiveRestore size={44} strokeWidth={2.5} />
              </div>

              {/* Text */}
              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] uppercase tracking-tight mb-3 leading-none">
                Archive Category
              </h2>
              <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                Are you sure you want to archive <span className="font-bold text-[#1A1A1A]">"{deleteModalConfig.category?.name}"</span>? It will be moved to archives.
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
                  className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#7BB8A7] hover:bg-[#6BA797] text-[#FFFFFF] cursor-pointer"
                >
                  <Archive size={16} /> Archive
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

export default Categories;