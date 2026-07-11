import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import DashboardLayout, { useSidebar } from "../context/DashboardLayout";
import NotificationDetailModal from "../components/NotificationDetailModal";
import { useWebSocket } from "../context/WebSocketProvider";
import {
  PackageSearch,
  Search,
  Bell,
  Filter,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingUp,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ChevronDown,
  Info,
  LogOut,
  ArchiveRestore,
  Archive,
  Menu
} from "lucide-react";

function InventoryHub() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [posSales, setPosSales] = useState(null);
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [posModalClosing, setPosModalClosing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Filtering & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");

  // Custom Dropdown States
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);
  const [isFormCategoryDropdownOpen, setIsFormCategoryDropdownOpen] = useState(false);
  const [isFormSupplierDropdownOpen, setIsFormSupplierDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailModalClosing, setDetailModalClosing] = useState(false);

  // Refs for Click-Outside
  const categoryRef = useRef(null);
  const stockRef = useRef(null);
  const formCategoryRef = useRef(null);
  const formSupplierRef = useRef(null);
  const notifRef = useRef(null);
  const exportRef = useRef(null);
  const profileRef = useRef(null);

  // Bulk Actions State
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Modal & Animation States
  const [isClosing, setIsClosing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Delete Confirmation Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, type: null, id: null });

  // Profile Dropdown State
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Archived Products Modal
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [archivedModalClosing, setArchivedModalClosing] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // Permanent Delete Confirmation
  const [permDeleteTarget, setPermDeleteTarget] = useState(null);

  // Sign Out Confirmation
  const [signoutConfirm, setSignoutConfirm] = useState(false);

  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState("");

  // Toast Notification State & Refs
  const [toast, setToast] = useState({ show: false, message: "", isClosing: false });
  const toastTimeout = useRef(null);
  const toastExitTimeout = useRef(null);

  const [formData, setFormData] = useState({
    sku: "", name: "", category_id: "", supplier_id: "", cost_price: "", selling_price: "", reorder_level: "", stock: ""
  });

  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);
  const totalItems = activeProducts.length;
  const lowStockCount = activeProducts.filter(p => p.stock <= p.reorder_level).length;
  const totalInventoryValue = activeProducts.reduce((sum, p) => sum + (Number(p.cost_price) * p.stock), 0);

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const categoryOptions = useMemo(() => {
    const cats = categories.map(c => c.name);
    return ['All', ...cats];
  }, [categories]);

  const loadData = useCallback(async (skipLoading) => {
    if (!skipLoading) setPageLoading(true);
    try {
      const [prodRes, catRes, supRes, notifRes, posRes] = await Promise.all([
        api.getProducts(), api.getCategories(), api.getSuppliers(), api.getNotifications(),
        api.getPosSalesToday().catch(() => null),
      ]);
      setProducts(prodRes.results || prodRes);
      setCategories(catRes.results || catRes);
      setSuppliers(supRes.results || supRes);
      setNotifications(notifRes.results || notifRes);
      setPosSales(posRes);
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

  // Handle click outside for ALL custom dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) setIsCategoryDropdownOpen(false);
      if (stockRef.current && !stockRef.current.contains(event.target)) setIsStockDropdownOpen(false);
      if (formCategoryRef.current && !formCategoryRef.current.contains(event.target)) setIsFormCategoryDropdownOpen(false);
      if (formSupplierRef.current && !formSupplierRef.current.contains(event.target)) setIsFormSupplierDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifDropdownOpen(false);
      if (exportRef.current && !exportRef.current.contains(event.target)) setIsExportOpen(false);
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

  const openPosModal = () => {
    if (!posSales || posSales.error) return;
    setPosModalOpen(true);
    setPosModalClosing(false);
  };

  const closePosModal = () => {
    setPosModalClosing(true);
    setTimeout(() => {
      setPosModalOpen(false);
      setPosModalClosing(false);
    }, 300);
  };

  // Filter Logic
  const filteredProducts = useMemo(() => {
    let result = activeProducts.filter(product => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (categoryFilter !== "All" && product.category_name !== categoryFilter) return false;
      if (stockFilter === "Low Stock" && product.stock > product.reorder_level) return false;
      return true;
    });
    return result;
  }, [activeProducts, searchQuery, categoryFilter, stockFilter]);

  // Toast Handlers
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

  // Modal Handlers
  const closeAllModals = () => {
    setIsClosing(true);
    // Close dropdowns inside modal just in case
    setIsFormCategoryDropdownOpen(false);
    setIsFormSupplierDropdownOpen(false);
    
    setTimeout(() => {
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setDeleteModalConfig({ isOpen: false, type: null, id: null });
      setIsClosing(false);
    }, 300);
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setFormData({ name: "", category: "Electronics", supplierId: "", costPrice: "", sellingPrice: "", reorderLevel: "", stock: "" });
    setFormError("");
  };

  const openAddModal = () => { 
    resetForm(); 
    setIsAddModalOpen(true); 
    setIsClosing(false); 
  };

  const openEditModal = (product) => {
    resetForm();
    setEditingProduct(product);
    setFormData({
      name: product.name, category: product.category_name, supplierId: product.supplier_id || "",
      costPrice: product.cost_price, sellingPrice: product.selling_price, reorderLevel: product.reorder_level, stock: product.stock,
    });
    setIsEditModalOpen(true);
    setIsClosing(false);
  };

  const openDeleteModal = (type, id = null) => {
    setDeleteModalConfig({ isOpen: true, type, id });
    setIsClosing(false);
  };

  const categoryNameToId = (name) => {
    const found = categories.find(c => c.name === name);
    return found ? found.id : '';
  };

  // Submit Handlers
  const validateForm = () => {
    if (!/^[a-zA-Z0-9 ]+$/.test(formData.name)) return "Product name: letters, numbers, and spaces only.";
    if (formData.name.length > 40) return "Product name must be 40 characters or fewer.";
    if (formData.costPrice === "" || isNaN(parseFloat(formData.costPrice))) return "Cost price must be a number.";
    if (formData.sellingPrice === "" || isNaN(parseFloat(formData.sellingPrice))) return "Selling price must be a number.";
    if (formData.reorderLevel === "" || isNaN(parseInt(formData.reorderLevel))) return "Reorder level must be a number.";
    if (formData.stock === "" || isNaN(parseInt(formData.stock))) return "Stock must be a number.";
    return null;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormError("");
    const err = validateForm();
    if (err) return setFormError(err);
    if (parseFloat(formData.sellingPrice) <= parseFloat(formData.costPrice)) return setFormError("Selling price must be strictly greater than cost price.");
    if (!formData.supplierId) return setFormError("Please select a supplier.");

    try {
      const payload = {
        name: formData.name,
        category: categoryNameToId(formData.category),
        supplier: formData.supplierId,
        cost_price: parseFloat(formData.costPrice),
        selling_price: parseFloat(formData.sellingPrice),
        reorder_level: parseInt(formData.reorderLevel) || 0,
        stock: parseInt(formData.stock) || 0,
      };
      const newProduct = await api.createProduct(payload);
      setProducts([newProduct, ...products]);
      closeAllModals();
      showToast(`${formData.name} successfully added to inventory.`);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setFormError("");
    const err = validateForm();
    if (err) return setFormError(err);
    if (parseFloat(formData.sellingPrice) <= parseFloat(formData.costPrice)) return setFormError("Selling price must be strictly greater than cost price.");
    if (!formData.supplierId) return setFormError("Please select a supplier.");

    try {
      const payload = {
        name: formData.name,
        category: categoryNameToId(formData.category),
        supplier: formData.supplierId,
        cost_price: parseFloat(formData.costPrice),
        selling_price: parseFloat(formData.sellingPrice),
        reorder_level: parseInt(formData.reorderLevel) || 0,
        stock: parseInt(formData.stock) || 0,
      };
      const updated = await api.updateProduct(editingProduct.id, payload);
      setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
      closeAllModals();
      showToast(`${formData.name} successfully updated.`);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Delete Action Executer
  const confirmDelete = async () => {
    try {
      if (deleteModalConfig.type === 'single') {
        const target = products.find(p => p.id === deleteModalConfig.id);
        await api.archiveProduct(deleteModalConfig.id);
        setProducts(products.map(p => p.id === deleteModalConfig.id ? { ...p, status: "archived" } : p));
        setSelectedProducts(selectedProducts.filter(selectedId => selectedId !== deleteModalConfig.id));
        showToast(`${target?.name || "Product"} successfully archived.`);
      } else if (deleteModalConfig.type === 'bulk') {
        await Promise.all(selectedProducts.map(id => api.archiveProduct(id)));
        setProducts(products.map(p => selectedProducts.includes(p.id) ? { ...p, status: "archived" } : p));
        const count = selectedProducts.length;
        setSelectedProducts([]);
        showToast(`${count} products successfully archived.`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
    closeAllModals();
  };

  // --- ARCHIVED PRODUCTS HANDLERS ---
  const openArchivedModal = async () => {
    setIsArchivedModalOpen(true);
    setArchivedLoading(true);
    try {
      const res = await api.getArchivedProducts();
      setArchivedProducts(res.results || res);
    } catch (err) {
      showToast('Failed to load archived products.');
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
      showToast('Product restored successfully.');
      loadData();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permDeleteTarget) return;
    try {
      await api.permanentDeleteProduct(permDeleteTarget);
      setArchivedProducts(archivedProducts.filter(p => p.id !== permDeleteTarget));
      setPermDeleteTarget(null);
      showToast('Product permanently deleted.');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Bulk Actions Handlers
  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(pId => pId !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Core Database</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A]">Inventory Hub</h1>
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

                {/* Previews List - ADDED overscroll-contain HERE */}
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
                    className="block w-full py-2.5 text-center text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#FAF7F2] hover:bg-[#EFE9DF] rounded-xl transition-colors"
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
                  onClick={() => { setIsProfileDropdownOpen(false); setSignoutConfirm(true); }}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#D96B5E] hover:bg-[#FAD2CB]/20 transition-all text-left cursor-pointer"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-2">
            <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#E7E5E4] shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#57534E] mb-1">Total Active Items</p>
                <h3 className="text-3xl font-black text-[#1A1A1A]">{totalItems}</h3>
              </div>
              <div className="w-14 h-14 bg-[#FAF7F2] rounded-2xl flex items-center justify-center border border-[#E7E5E4]">
                <PackageSearch className="text-[#1A1A1A]" size={24} />
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#FAD2CB] shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#FAD2CB]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#D96B5E] mb-1">Low Stock Alerts</p>
                <h3 className="text-3xl font-black text-[#1A1A1A]">{lowStockCount}</h3>
              </div>
              <div className="w-14 h-14 bg-[#FAD2CB]/40 rounded-2xl flex items-center justify-center border border-[#FAD2CB] relative z-10">
                <AlertCircle className="text-[#D96B5E]" size={24} />
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#C3ECE3] shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#C3ECE3]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7BB8A7] mb-1">Total Stock Value</p>
                <h3 className="text-3xl font-black text-[#1A1A1A]">₱{totalInventoryValue.toLocaleString()}</h3>
              </div>
              <div className="w-14 h-14 bg-[#C3ECE3]/40 rounded-2xl flex items-center justify-center border border-[#C3ECE3] relative z-10">
              <TrendingUp className="text-[#7BB8A7]" size={24} />
            </div>
          </div>

          {/* POS Integration Card — data consumed from Module 2 (POS) */}
          <div
            onClick={openPosModal}
            className={`bg-[#FFFFFF] p-6 rounded-3xl border shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${posSales && !posSales.error ? 'border-[#E7E5E4]' : 'border-dashed border-[#D96B5E]/40 opacity-70 pointer-events-none'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#5e35b1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#5e35b1] mb-1">
                Today's POS Sales
                {posSales && !posSales.error && <span className="ml-1.5 text-[8px] text-[#A8A29E]">(from POS)</span>}
              </p>
              <h3 className="text-3xl font-black text-[#1A1A1A]">
                {posSales && !posSales.error
                  ? `₱${parseFloat(posSales.total_sales).toLocaleString()}`
                  : posSales === null
                    ? <span className="text-base font-bold text-[#A8A29E]">Loading...</span>
                    : <span className="text-sm font-bold text-[#D96B5E]">POS Offline</span>}
              </h3>
              {posSales && !posSales.error && (
                <p className="text-xs text-[#57534E] font-medium mt-1">
                  {posSales.order_count} order{posSales.order_count !== 1 ? 's' : ''} · {posSales.total_items} item{posSales.total_items !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border relative z-10 ${posSales && !posSales.error ? 'bg-[#ede7f6] border-[#d1c4e9]' : 'bg-[#FAD2CB]/20 border-[#FAD2CB]/40'}`}>
              <svg className={posSales && !posSales.error ? 'text-[#5e35b1]' : 'text-[#D96B5E]/50'} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
          </div>
        </div>

          <div className="bg-[#FFFFFF] rounded-3xl shadow-sm border border-[#E7E5E4] flex flex-col relative z-10 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#E7E5E4] flex flex-col lg:flex-row gap-4 justify-between items-center bg-[#FAF7F2] relative z-30">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                {selectedProducts.length > 0 ? (
                  <div className="flex items-center gap-3 bg-[#FAD2CB]/40 border border-[#FAD2CB] px-4 py-2.5 rounded-xl">
                    <span className="text-sm font-bold text-[#9A2E22]">{selectedProducts.length} selected</span>
                    <div className="w-px h-4 bg-[#D96B5E]/30"></div>
                    <button onClick={() => openDeleteModal('bulk')} className="text-xs font-black uppercase tracking-widest text-[#9A2E22] hover:text-[#7A241A] transition-colors flex items-center gap-1 cursor-pointer">
                      <Archive size={14} /> Archive
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" />
                    <input 
                      type="text" placeholder="Search SKU or Name..." 
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-medium text-[#1A1A1A] shadow-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="flex gap-2">
                  <button title="Import Data" className="p-2.5 bg-[#FFFFFF] border border-[#E7E5E4] rounded-xl text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A] transition-all shadow-sm cursor-pointer">
                    <Upload size={18} />
                  </button>
                  <div className="relative" ref={exportRef}>
                    <button
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      title="Export CSV"
                      className="p-2.5 bg-[#1A1A1A] border border-[#1A1A1A] rounded-xl text-[#FFFFFF] hover:bg-[#333333] transition-all shadow-sm cursor-pointer"
                    >
                      <Download size={18} />
                    </button>
                    {isExportOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#333333] overflow-hidden z-50">
                        <button
                          onClick={() => { api.exportProductsCSV(); setIsExportOpen(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-[#E7E5E4] hover:bg-[#333333] transition-colors cursor-pointer"
                        >
                          Export Products
                        </button>
                        <button
                          onClick={() => { api.exportInventoryReportCSV(); setIsExportOpen(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-[#E7E5E4] hover:bg-[#333333] transition-colors cursor-pointer"
                        >
                          Export Inventory Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* --- CUSTOM CATEGORY FILTER DROPDOWN --- */}
                <div className="relative w-full sm:w-auto min-w-[170px]" ref={categoryRef}>
                  <div 
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#1A1A1A] rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-between"
                  >
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" />
                    <span className="text-sm font-bold text-[#1A1A1A] truncate mr-2">
                      {categoryFilter === "All" ? "All Categories" : categoryFilter}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#57534E] shrink-0 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  <div className={`absolute top-full right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top w-full min-w-[180px] ${isCategoryDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                      {categoryOptions.map((option) => (
                      <div 
                        key={option}
                        onClick={() => {
                          setCategoryFilter(option);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`mx-2 my-1 px-4 py-2.5 text-sm font-bold cursor-pointer transition-all rounded-full flex items-center justify-start text-left ${
                          categoryFilter === option 
                            ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                            : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {option === 'All' ? 'All Categories' : option}
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- CUSTOM STOCK LEVEL FILTER DROPDOWN --- */}
                <div className="relative w-full sm:w-auto min-w-[160px]" ref={stockRef}>
                  <div 
                    onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                    className="w-full px-4 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#1A1A1A] rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-between"
                  >
                    <span className="text-sm font-bold text-[#1A1A1A] truncate mr-2">
                      {stockFilter === "All" ? "All Stock Levels" : "Low Stock Only"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#57534E] shrink-0 transition-transform duration-300 ${isStockDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  <div className={`absolute top-full right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top w-full min-w-[180px] ${isStockDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                    {['All', 'Low Stock'].map((option) => (
                      <div 
                        key={option}
                        onClick={() => {
                          setStockFilter(option);
                          setIsStockDropdownOpen(false);
                        }}
                        className={`mx-2 my-1 px-4 py-2.5 text-sm font-bold cursor-pointer transition-all rounded-full flex items-center justify-start text-left ${
                          stockFilter === option 
                            ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                            : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {option === 'All' ? 'All Stock Levels' : 'Low Stock Only'}
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={openAddModal}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#57534E] text-[#FFFFFF] rounded-xl font-black uppercase tracking-widest text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} /> Add Product
                </button>
              </div>
            </div>

            {pageLoading ? (
              <div className="animate-pulse bg-[#FFFFFF] rounded-b-3xl">
                <div className="bg-[#FAF7F2] border-b border-[#E7E5E4] p-4">
                  <div className="h-10 bg-[#EFE9DF] rounded" />
                </div>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 border-b border-[#E7E5E4] items-center">
                    <div className="h-4 w-[4%] bg-[#EFE9DF] rounded" />
                    <div className="h-4 w-[13%] bg-[#EFE9DF] rounded" />
                    <div className="h-4 w-[32%] bg-[#EFE9DF] rounded" />
                    <div className="h-4 w-[15%] bg-[#EFE9DF] rounded" />
                    <div className="h-4 w-[14%] bg-[#EFE9DF] rounded" />
                    <div className="h-4 w-[12%] bg-[#EFE9DF] rounded" />
                    <div className="h-4 w-[10%] bg-[#EFE9DF] rounded" />
                  </div>
                ))}
              </div>
            ) : (
            <>
              <div className="bg-[#FAF7F2] border-b border-[#E7E5E4] relative z-20">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[13%]" />
                  <col className="w-[32%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="py-4 px-4 w-10 text-center">
                      <button onClick={toggleSelectAll} className="text-[#57534E] hover:text-[#1A1A1A] transition-colors cursor-pointer">
                        {filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">SKU / Barcode</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Product Info</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Supplier</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Pricing</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Stock Status</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="overflow-auto h-[500px] w-full custom-scrollbar rounded-b-3xl relative z-10 bg-[#FFFFFF]">
              <table className="w-full text-left border-collapse table-fixed responsive-table">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[13%]" />
                  <col className="w-[32%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <tbody className="divide-y divide-[#E7E5E4]">
                  {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                    <tr key={product.id} className={`transition-colors ${selectedProducts.includes(product.id) ? "bg-[#FAD2CB]/10" : "hover:bg-[#FAF7F2]/50 bg-[#FFFFFF]"}`}>
                      <td className="py-4 px-4 text-center" data-label="">
                        <button onClick={() => toggleSelectProduct(product.id)} className="text-[#A8A29E] hover:text-[#1A1A1A] transition-colors cursor-pointer">
                          {selectedProducts.includes(product.id) ? <CheckSquare size={18} className="text-[#1A1A1A]" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="py-4 px-4" data-label="SKU">
                        <span className="font-mono text-xs font-bold text-[#57534E] bg-[#EFE9DF] px-2 py-1 rounded border border-[#E7E5E4]">
                          {product.sku}
                        </span>
                      </td>
                      <td className="py-4 px-4" data-label="Product">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1A1A1A]">{product.name}</span>
                          <span className="text-xs text-[#57534E]">{product.category_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-[#57534E] font-medium" data-label="Supplier">
                        {product.supplier_name || "-"}
                      </td>
                      <td className="py-4 px-4" data-label="Pricing">
                        <div className="flex flex-col">
                          <span className="text-xs text-[#57534E]">Cost: ₱{product.cost_price}</span>
                          <span className="font-bold text-[#1A1A1A]">Sell: ₱{product.selling_price}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4" data-label="Stock">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[#1A1A1A]">{product.stock}</span>
                          {product.stock <= product.reorder_level ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#D96B5E] bg-[#FAD2CB]/40 px-2 py-1 rounded border border-[#FAD2CB]">
                              <AlertCircle size={12} /> Low
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#7BB8A7] bg-[#C3ECE3]/40 px-2 py-1 rounded border border-[#C3ECE3]">
                              <CheckCircle2 size={12} /> OK
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#57534E]">Reorder at: {product.reorder_level}</span>
                      </td>
                      <td className="py-4 px-6 text-right action-cell" data-label="">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(product)}
                            className="p-2 text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A] rounded-lg transition-colors border border-transparent hover:border-[#E7E5E4]"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => openDeleteModal('single', product.id)}
                            className="p-2 text-[#D96B5E] hover:bg-[#FAD2CB]/50 rounded-lg transition-colors border border-transparent hover:border-[#FAD2CB]"
                            title="Archive Product"
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#57534E] font-medium">
                        No products found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>)}
            
          </div>
        </div>

      {/* --- ADD/EDIT MODAL --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`bg-[#FFFFFF] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-[#1A1A1A]">
                {isAddModalOpen ? "Register New Product" : "Edit Product Details"}
              </h2>
              <button 
                onClick={closeAllModals}
                className="text-[#57534E] hover:text-[#1A1A1A] p-2 bg-transparent rounded-full hover:bg-[#EFE9DF] transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* ADDED overscroll-contain HERE FOR MODAL BODY */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain">
              {formError && (
                <div className="bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#9A2E22] px-4 py-3 rounded-xl mb-6 text-sm font-bold flex items-start gap-2 shadow-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="productForm" onSubmit={isAddModalOpen ? handleAddProduct : handleEditProduct} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* --- CUSTOM FORM CATEGORY DROPDOWN --- */}
                  <div className="relative" ref={formCategoryRef}>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Category</label>
                    <div 
                      onClick={() => setIsFormCategoryDropdownOpen(!isFormCategoryDropdownOpen)}
                      className={`w-full px-4 py-3 bg-[#FAF7F2] border rounded-xl flex items-center justify-between cursor-pointer transition-all ${isFormCategoryDropdownOpen ? 'border-[#1A1A1A] ring-2 ring-[#1A1A1A]/20' : 'border-[#E7E5E4] hover:border-[#1A1A1A]'}`}
                    >
                      <span className="text-sm font-bold text-[#1A1A1A] truncate">{formData.category}</span>
                      <ChevronDown className={`w-5 h-5 text-[#57534E] shrink-0 transition-transform duration-300 ${isFormCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {/* ADDED overscroll-contain HERE FOR DROPDOWN LIST */}
                    <div className={`absolute top-full left-0 right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar overscroll-contain transition-all duration-200 origin-top ${isFormCategoryDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                      {categories.map((cat) => (
                        <div 
                          key={cat.id}
                          onClick={() => {
                            setFormData({ ...formData, category: cat.name });
                            setIsFormCategoryDropdownOpen(false);
                          }}
                          className={`mx-2 my-1 px-4 py-3 text-sm font-bold cursor-pointer transition-all rounded-full flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left ${
                            formData.category === cat.name 
                              ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                              : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                          }`}
                        >
                          {cat.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Product Name</label>
                    <input 
                      type="text" required name="name" value={formData.name} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-bold text-[#1A1A1A]"
                    />
                  </div>
                  
                  {/* --- CUSTOM FORM SUPPLIER DROPDOWN --- */}
                  <div className="md:col-span-1 relative" ref={formSupplierRef}>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Supplier</label>
                    <div 
                      onClick={() => setIsFormSupplierDropdownOpen(!isFormSupplierDropdownOpen)}
                      className={`w-full px-4 py-3 bg-[#FAF7F2] border rounded-xl flex items-center justify-between cursor-pointer transition-all ${isFormSupplierDropdownOpen ? 'border-[#1A1A1A] ring-2 ring-[#1A1A1A]/20' : 'border-[#E7E5E4] hover:border-[#1A1A1A]'}`}
                    >
                      <span className={`text-sm font-bold truncate ${formData.supplierId ? 'text-[#1A1A1A]' : 'text-[#A8A29E]'}`}>
                        {formData.supplierId 
                          ? suppliers.find(s => s.id === formData.supplierId)?.company_name 
                          : "Select a supplier"}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-[#57534E] shrink-0 transition-transform duration-300 ${isFormSupplierDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {/* ADDED overscroll-contain HERE FOR DROPDOWN LIST */}
                    <div className={`absolute top-full left-0 right-0 mt-2 py-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar overscroll-contain transition-all duration-200 origin-top ${isFormSupplierDropdownOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-95 invisible'}`}>
                      {suppliers.map((supplier) => (
                        <div 
                          key={supplier.id}
                          onClick={() => {
                            setFormData({ ...formData, supplierId: supplier.id });
                            setIsFormSupplierDropdownOpen(false);
                          }}
                          className={`mx-2 my-1 px-4 py-3 text-sm font-bold cursor-pointer transition-all rounded-full flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left ${
                            formData.supplierId === supplier.id 
                              ? 'bg-[#7BB8A7]/20 text-[#1A1A1A]' 
                              : 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1A1A1A]'
                          }`}
                        >
                          {supplier.company_name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#57534E] mb-2">Cost Price (₱)</label>
                    <input 
                      type="number" step="0.01" required name="costPrice" value={formData.costPrice} onChange={handleInputChange} min="0"
                      className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-bold text-[#1A1A1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Selling Price (₱)</label>
                    <input 
                      type="number" step="0.01" required name="sellingPrice" value={formData.sellingPrice} onChange={handleInputChange} min="0"
                      className="w-full px-4 py-3 bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7BB8A7] transition-all text-sm font-black text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Low Stock Reorder Level</label>
                    <input 
                      type="number" required name="reorderLevel" value={formData.reorderLevel} onChange={handleInputChange} min="0"
                      className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-bold text-[#1A1A1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#1A1A1A] mb-2">Current Stock</label>
                    <input 
                      type="number" required name="stock" value={formData.stock} onChange={handleInputChange} min="0"
                      className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition-all text-sm font-black text-[#1A1A1A]"
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
                type="submit" form="productForm"
                className="px-6 py-3 bg-[#1A1A1A] text-[#FFFFFF] rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-[#57534E] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                {isAddModalOpen ? "Save New Product" : "Update Details"}
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
                Confirm Action
              </h2>
              <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                {deleteModalConfig.type === 'bulk'
                  ? `Are you sure you want to archive the ${selectedProducts.length} selected item(s)? They will be moved to the archives to preserve transaction history.`
                  : `Are you sure you want to remove this item? It will be archived to preserve transaction history.`
                }
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
                  <Archive size={16} /> Archive
                </button>
              </div>
            </div>

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

      {/* --- SIGNOUT CONFIRMATION --- */}
      {signoutConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm animate-backdrop-in">
          <div className="bg-[#FFFFFF] rounded-[2rem] w-full max-w-sm p-8 pt-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-modal-in">
            <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#1A1A1A]" />
            <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/10 z-10 pointer-events-none" />

            <div className="relative z-20 flex flex-col items-center mt-2 w-full">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm bg-[#FFFFFF] border-[#E7E5E4] text-[#1A1A1A]">
                <LogOut size={44} strokeWidth={2.5} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] uppercase tracking-tight mb-3 leading-none">
                Sign Out?
              </h2>
              <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                Are you sure you want to sign out? You will need to log in again to access the dashboard.
              </p>

              <div className="w-full flex gap-3">
                <button
                  type="button"
                  onClick={() => setSignoutConfirm(false)}
                  className="w-full px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => { try { await api.logout(); } catch {} localStorage.removeItem('user'); navigate('/'); }}
                  className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#1A1A1A] hover:bg-[#57534E] text-[#FFFFFF] cursor-pointer"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
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

      {/* POS Sales Details Modal */}
      {posModalOpen && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${posModalClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`bg-[#FFFFFF] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${posModalClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
            <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-[#1A1A1A] flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#5e35b1]">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                Today's POS Sales
              </h2>
              <button onClick={closePosModal} className="text-[#57534E] hover:text-[#1A1A1A] p-2 bg-transparent rounded-full hover:bg-[#EFE9DF] transition-all cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain space-y-4">
              {(!posSales || !posSales.orders || posSales.orders.length === 0) ? (
                <div className="text-center py-12 text-[#57534E] font-medium">
                  <p className="text-5xl mb-4 opacity-30">🛒</p>
                  <p>No POS sales recorded today.</p>
                </div>
              ) : (
                posSales.orders.map((order) => (
                  <div key={order.id} className="bg-[#FAF7F2] rounded-2xl p-5 border border-[#E7E5E4]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#57534E] bg-[#EFE9DF] px-2 py-1 rounded border border-[#E7E5E4]">
                          {order.order_id}
                        </span>
                        <span className="text-xs text-[#57534E] ml-3">
                          {new Date(order.sold_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="text-sm font-black text-[#1A1A1A]">₱{parseFloat(order.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-[#57534E] mb-3 flex items-center gap-3">
                      <span className="font-bold">Cashier: {order.cashier_name || 'N/A'}</span>
                      <span className="w-1 h-1 rounded-full bg-[#A8A29E]" />
                      <span>{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
                      {order.payment_method && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#A8A29E]" />
                          <span>{order.payment_method}</span>
                        </>
                      )}
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="border-t border-[#E7E5E4] pt-3 mt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#A8A29E] mb-2">Items</p>
                        <div className="space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[#A8A29E] font-mono text-xs">x{item.qty}</span>
                                <span className="font-medium text-[#1A1A1A] truncate">{item.product_name}</span>
                              </div>
                              <span className="font-bold text-[#57534E] shrink-0 ml-4">₱{(item.subtotal || item.qty * item.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-[#E7E5E4] bg-[#FAF7F2] flex justify-between items-center shrink-0">
              {posSales && posSales.orders && posSales.orders.length > 0 && (
                <span className="text-xs font-bold text-[#57534E]">
                  Total today: <span className="text-[#1A1A1A] font-black">₱{parseFloat(posSales.total_sales).toLocaleString()}</span>
                </span>
              )}
              <button
                onClick={closePosModal}
                className="px-6 py-2.5 bg-[#1A1A1A] text-[#FFFFFF] font-black uppercase text-xs tracking-widest rounded-xl shadow-md hover:bg-[#57534E] transition-colors cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

export default InventoryHub;