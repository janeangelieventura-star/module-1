import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import {
  X, ArchiveRestore, Archive, AlertCircle, Box, Truck, Tags, Trash2,
} from "lucide-react";

const TABS = [
  { key: 'all', label: 'All', icon: ArchiveRestore },
  { key: 'products', label: 'Products', icon: Box },
  { key: 'suppliers', label: 'Suppliers', icon: Truck },
  { key: 'categories', label: 'Categories', icon: Tags },
];

export default function ArchivesModal({ isOpen, isClosing, onClose }) {
  const [activeTab, setActiveTab] = useState('all');
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState([]);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState(null);
  const [permDeleteType, setPermDeleteType] = useState(null);
  const [deleteAllType, setDeleteAllType] = useState(null);

  const loadArchived = useCallback(async () => {
    setLoading(true);
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
      console.error('Failed to load archives:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) loadArchived();
  }, [isOpen, loadArchived]);

  const handleUnarchive = async (type, id) => {
    try {
      if (type === 'products') {
        await api.unarchiveProduct(id);
        setArchivedProducts(archivedProducts.filter(p => p.id !== id));
      } else if (type === 'suppliers') {
        await api.unarchiveSupplier(id);
        setArchivedSuppliers(archivedSuppliers.filter(s => s.id !== id));
      } else {
        await api.unarchiveCategory(id);
        setArchivedCategories(archivedCategories.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
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
      } else {
        await api.permanentDeleteCategory(permDeleteTarget);
        setArchivedCategories(archivedCategories.filter(c => c.id !== permDeleteTarget));
      }
      setPermDeleteTarget(null);
      setPermDeleteType(null);
    } catch (err) {
      console.error(err);
      setPermDeleteTarget(null);
      setPermDeleteType(null);
    }
  };

  const confirmDeleteAll = async () => {
    if (!deleteAllType) return;
    try {
      if (deleteAllType === 'all') {
        await Promise.all(archivedProducts.map(p => api.permanentDeleteProduct(p.id)));
        await Promise.all(archivedSuppliers.map(s => api.permanentDeleteSupplier(s.id)));
        await Promise.all(archivedCategories.map(c => api.permanentDeleteCategory(c.id)));
        setArchivedProducts([]);
        setArchivedSuppliers([]);
        setArchivedCategories([]);
      } else if (deleteAllType === 'products') {
        await Promise.all(archivedProducts.map(p => api.permanentDeleteProduct(p.id)));
        setArchivedProducts([]);
      } else if (deleteAllType === 'suppliers') {
        await Promise.all(archivedSuppliers.map(s => api.permanentDeleteSupplier(s.id)));
        setArchivedSuppliers([]);
      } else {
        await Promise.all(archivedCategories.map(c => api.permanentDeleteCategory(c.id)));
        setArchivedCategories([]);
      }
      setDeleteAllType(null);
    } catch (err) {
      console.error(err);
      setDeleteAllType(null);
    }
  };

  const currentItems = activeTab === 'all' ? null
    : activeTab === 'products' ? archivedProducts
    : activeTab === 'suppliers' ? archivedSuppliers : archivedCategories;

  const countLabel = activeTab === 'all'
    ? `${archivedProducts.length + archivedSuppliers.length + archivedCategories.length} items`
    : `${currentItems.length} item${currentItems.length !== 1 ? 's' : ''}`;

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-[#E7E5E4] border-t-[#1A1A1A] rounded-full animate-spin"></div>
        </div>
      );
    }

    if (activeTab === 'all') {
      const combined = [
        ...archivedProducts.map(p => ({ ...p, _type: 'products', _label: 'Product' })),
        ...archivedSuppliers.map(s => ({ ...s, _type: 'suppliers', _label: 'Supplier' })),
        ...archivedCategories.map(c => ({ ...c, _type: 'categories', _label: 'Category' })),
      ];

      if (combined.length === 0) {
        return (
          <div className="py-24 text-center">
            <ArchiveRestore size={48} className="mx-auto text-[#A8A29E] mb-4" />
            <p className="text-[#57534E] font-bold text-lg">No archived items</p>
            <p className="text-[#A8A29E] text-sm mt-1">Archived items will appear here.</p>
          </div>
        );
      }

      return (
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[35%]" />
            <col className="w-[30%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#E7E5E4]">
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Type</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Name</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Details</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]">
            {combined.map(item => (
              <tr key={`${item._type}-${item.id}`} className="hover:bg-[#FAF7F2]/50 transition-colors">
                <td className="py-4 px-4">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                    item._type === 'products' ? 'bg-[#C3ECE3]/40 text-[#7BB8A7]' :
                    item._type === 'suppliers' ? 'bg-[#EFE9DF] text-[#57534E]' :
                    'bg-[#E0E7F5] text-[#5B7BB5]'
                  }`}>
                    {item._label}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="font-bold text-[#1A1A1A]">{item.name || item.company_name}</span>
                </td>
                <td className="py-4 px-4 text-sm text-[#57534E]">
                  {item._type === 'products' ? `${item.sku} · ${item.category_name || '-'}` :
                   item._type === 'suppliers' ? item.contact_person || '-' :
                   item.description || '-'}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUnarchive(item._type, item.id)}
                      className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button onClick={() => { setPermDeleteType(item._type); setPermDeleteTarget(item.id); }}
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

    if (currentItems.length === 0) {
      return (
        <div className="py-24 text-center">
          <ArchiveRestore size={48} className="mx-auto text-[#A8A29E] mb-4" />
          <p className="text-[#57534E] font-bold text-lg">No archived {activeTab}</p>
          <p className="text-[#A8A29E] text-sm mt-1">Archived items will appear here.</p>
        </div>
      );
    }

    if (activeTab === 'products') {
      return (
        <table className="w-full text-left border-collapse">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
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
                <td className="py-4 px-4"><span className="font-bold text-[#1A1A1A]">{p.name}</span></td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{p.category_name || '-'}</td>
                <td className="py-4 px-4"><span className="text-sm font-black text-[#D96B5E]">{p.stock}</span></td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{p.supplier_name || '-'}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUnarchive('products', p.id)}
                      className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button onClick={() => { setPermDeleteType('products'); setPermDeleteTarget(p.id); }}
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
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Contact</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Email</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E]">Phone</th>
              <th className="py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#57534E] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]">
            {archivedSuppliers.map(s => (
              <tr key={s.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                <td className="py-4 px-4"><span className="font-bold text-[#1A1A1A]">{s.company_name}</span></td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{s.contact_person || '-'}</td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{s.email || '-'}</td>
                <td className="py-4 px-4 text-sm text-[#57534E]">{s.phone || '-'}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleUnarchive('suppliers', s.id)}
                      className="px-3 py-2 bg-[#C3ECE3]/40 border border-[#C3ECE3] text-[#7BB8A7] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#C3ECE3]/60 transition-all cursor-pointer flex items-center gap-1">
                      <ArchiveRestore size={14} /> Restore
                    </button>
                    <button onClick={() => { setPermDeleteType('suppliers'); setPermDeleteTarget(s.id); }}
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
                  <button onClick={() => { setPermDeleteType('categories'); setPermDeleteTarget(c.id); }}
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
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
        <div className={`bg-[#FFFFFF] w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-[500px] sm:h-[550px] lg:h-[600px] ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>

          {/* Header */}
          <div className="p-6 border-b border-[#E7E5E4] bg-[#FAF7F2] rounded-t-3xl flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-black text-[#1A1A1A]">Archives</h2>
              <p className="text-xs text-[#57534E] font-medium mt-1">{countLabel}</p>
            </div>
            <button onClick={onClose} className="text-[#57534E] hover:text-[#1A1A1A] p-2 bg-transparent rounded-full hover:bg-[#EFE9DF] transition-all cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* Tabs + Delete All */}
          <div className="flex items-center justify-between border-b border-[#E7E5E4] bg-[#FAF7F2] px-6 pr-4">
            <div className="flex">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isTabActive = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-[1px] ${
                      isTabActive
                        ? 'text-[#1A1A1A] border-[#1A1A1A] bg-[#FFFFFF]'
                        : 'text-[#A8A29E] border-transparent hover:text-[#57534E]'
                    }`}>
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {(activeTab === 'all'
              ? archivedProducts.length + archivedSuppliers.length + archivedCategories.length > 0
              : currentItems.length > 0) && (
              <button onClick={() => setDeleteAllType(activeTab)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#FAD2CB]/40 border border-[#FAD2CB] text-[#D96B5E] rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#FAD2CB]/60 transition-all cursor-pointer shrink-0">
                <Trash2 size={14} /> Delete All
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain p-6">
            {renderTable()}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#E7E5E4] bg-[#FAF7F2] rounded-b-3xl flex justify-end shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 bg-[#FFFFFF] border border-[#E7E5E4] text-[#1A1A1A] rounded-xl font-black uppercase text-xs tracking-widest shadow-sm hover:bg-[#EFE9DF] transition-colors cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Single delete confirmation */}
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
                This action cannot be undone. The {permDeleteType === 'products' ? 'product' : permDeleteType === 'suppliers' ? 'supplier' : 'category'} will be permanently removed.
              </p>
              <div className="w-full flex gap-3">
                <button type="button" onClick={() => { setPermDeleteTarget(null); setPermDeleteType(null); }}
                  className="w-full px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer">Cancel</button>
                <button type="button" onClick={confirmPermanentDelete}
                  className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#D96B5E] hover:bg-[#C45A4D] text-[#FFFFFF] cursor-pointer">
                  <Archive size={16} /> Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All confirmation */}
      {deleteAllType && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm animate-backdrop-in">
          <div className="bg-[#FFFFFF] rounded-[2rem] w-full max-w-sm p-8 pt-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-modal-in">
            <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#D96B5E]" />
            <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/20 z-10 pointer-events-none" />
            <div className="relative z-20 flex flex-col items-center mt-2 w-full">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm bg-[#FFFFFF] border-[#FAD2CB] text-[#D96B5E]">
                <AlertCircle size={44} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] uppercase tracking-tight mb-3 leading-none">Delete All?</h2>
              <p className="text-sm font-medium text-[#57534E] mb-8 leading-relaxed">
                This will permanently delete all archived {deleteAllType === 'all' ? 'items' : deleteAllType} from the system. This cannot be undone.
              </p>
              <div className="w-full flex gap-3">
                <button type="button" onClick={() => setDeleteAllType(null)}
                  className="w-full px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer">Cancel</button>
                <button type="button" onClick={confirmDeleteAll}
                  className="w-full flex justify-center items-center gap-1.5 px-4 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 bg-[#D96B5E] hover:bg-[#C45A4D] text-[#FFFFFF] cursor-pointer">
                  <Trash2 size={16} /> Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
