import { AlertCircle, CheckCircle2, X, Receipt, ClipboardList, User, Settings } from "lucide-react";

function getTypeStyles(type) {
  switch(type) {
    case 'stock_alert':
      return { icon: <AlertCircle size={20} className="text-[#D96B5E]" />, bg: "bg-[#FAD2CB]/40 border-[#FAD2CB]" };
    case 'sale':
      return { icon: <Receipt size={20} className="text-[#7BB8A7]" />, bg: "bg-[#C3ECE3]/40 border-[#C3ECE3]" };
    case 'stock_log':
      return { icon: <ClipboardList size={20} className="text-[#1A1A1A]" />, bg: "bg-[#EFE9DF] border-[#E7E5E4]" };
    case 'user':
      return { icon: <User size={20} className="text-[#57534E]" />, bg: "bg-[#FAF7F2] border-[#E7E5E4]" };
    case 'system':
    default:
      return { icon: <Settings size={20} className="text-[#57534E]" />, bg: "bg-[#FAF7F2] border-[#E7E5E4]" };
  }
}

export default function NotificationDetailModal({ notification, isClosing, onClose, onMarkRead, onDelete }) {
  if (!notification) return null;

  const nstyles = getTypeStyles(notification.type);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
      <div className={`bg-[#FFFFFF] rounded-[2rem] w-full max-w-lg p-8 shadow-2xl flex flex-col relative overflow-hidden ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}>
        <div className="absolute top-0 left-0 w-full h-24 z-0 bg-[#1A1A1A]" />
        <div className="absolute -top-12 -right-8 w-36 h-36 rounded-full bg-[#FFFFFF]/10 z-10 pointer-events-none" />

        <div className="relative z-20 flex flex-col w-full">
          <div className="flex items-start justify-between mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-md bg-[#FFFFFF] ${nstyles.bg}`}>
              {nstyles.icon}
            </div>
            <button onClick={onClose} className="text-[#FFFFFF]/70 hover:text-[#FFFFFF] p-1.5 bg-[#FFFFFF]/10 rounded-full hover:bg-[#FFFFFF]/20 transition-all cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              notification.type === 'stock_alert' ? 'bg-[#FAD2CB]/40 border-[#FAD2CB] text-[#D96B5E]' :
              notification.type === 'sale' ? 'bg-[#C3ECE3]/40 border-[#C3ECE3] text-[#7BB8A7]' :
              notification.type === 'stock_log' ? 'bg-[#EFE9DF] border-[#E7E5E4] text-[#57534E]' :
              'bg-[#FAF7F2] border-[#E7E5E4] text-[#57534E]'
            }`}>
              {notification.type === 'stock_alert' ? 'Stock Alert' :
               notification.type === 'sale' ? 'Sale' :
               notification.type === 'stock_log' ? 'Stock Log' :
               notification.type === 'user' ? 'User' : 'System'}
            </span>
            <span className="text-[10px] font-bold text-[#A8A29E]">
              {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
            </span>
          </div>

          <h2 className="text-2xl font-black text-[#1A1A1A] mb-3 leading-tight">
            {notification.title}
          </h2>

          <div className="bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl p-5 mb-6">
            <p className="text-sm font-medium text-[#57534E] leading-relaxed">
              {notification.message}
            </p>
          </div>

          {notification.related_entity && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#A8A29E] mb-6">
              <span className="uppercase tracking-wider">Entity:</span>
              <span className="bg-[#EFE9DF] text-[#57534E] px-2.5 py-1 rounded-full">
                {notification.related_entity}
              </span>
              {notification.related_id && (
                <>
                  <span className="uppercase tracking-wider">ID:</span>
                  <span className="font-mono bg-[#EFE9DF] text-[#57534E] px-2.5 py-1 rounded-full">
                    {notification.related_id}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3 w-full">
            {!notification.is_read && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); onClose(); }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-sm transition-all hover:bg-[#EFE9DF] bg-[#FAF7F2] border border-[#E7E5E4] text-[#1A1A1A] cursor-pointer flex-1"
              >
                <CheckCircle2 size={16} /> Mark as Read
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(notification.id); onClose(); }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-sm transition-all hover:bg-[#FAD2CB]/40 bg-[#FAF7F2] border border-[#E7E5E4] text-[#D96B5E] hover:border-[#FAD2CB] cursor-pointer flex-1"
            >
              <X size={16} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
