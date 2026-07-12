"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const NotificationDropdown = ({ onClose }) => {
  const { notifications, markAsRead, clearAll } = useNotifications();

  const getIcon = (type) => {
    switch (type) {
      case "PAYMENT_REQUEST": return <Info className="w-4 h-4 text-blue-500" />;
      case "PAYMENT_APPROVED": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "PAYMENT_REJECTED": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose}></div>
      <div className="absolute right-[-110px] sm:right-0 mt-2 w-70 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-scale-up origin-top-right">
        <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
            Notifications
          </p>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <button
                onClick={() => { clearAll(); onClose(); }}
                className="text-[10px] font-bold text-rose-400 hover:text-rose-600 uppercase transition-colors"
              >
                Clear All
              </button>
            )}
            <Link
              href="/admin/notifications"
              onClick={onClose}
              className="text-[10px] font-bold text-primary hover:underline uppercase"
            >
              Show All
            </Link>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">No new notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                onClick={() => {
                  if (!n.isRead) markAsRead(n._id);
                }}
              >
                <div className="flex gap-3">
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${!n.isRead ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-[11px] font-black uppercase truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                        {n.title}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap ml-2">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    {n.data && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {n.data.loanNumber && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-500 uppercase">
                            L# {n.data.loanNumber}
                          </span>
                        )}
                        {n.data.amount && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-primary rounded text-[8px] font-black uppercase">
                            ₹{n.data.amount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!n.isRead && (
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Link
          href="/admin/notifications"
          onClick={onClose}
          className="block w-full py-3 text-center bg-slate-50 hover:bg-slate-100 transition-colors text-[10px] font-black text-slate-500 uppercase tracking-widest border-t border-slate-100"
        >
          View More Notifications
        </Link>
      </div >
    </>
  );
};

export default NotificationDropdown;
