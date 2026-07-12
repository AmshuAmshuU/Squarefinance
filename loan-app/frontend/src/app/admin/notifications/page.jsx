"use client";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { 
  Bell, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle
} from "lucide-react";
import { getToken } from "../../../utils/auth";
import { format, isToday, isYesterday } from "date-fns";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, unread, clear
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0 });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const statusFilter = activeTab === "unread" ? "unread" : (activeTab === "read" ? "read" : "");
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/notifications?page=${page}&limit=25&status=${statusFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setTotalPages(data.totalPages);
        setCounts({ all: data.totalNotifications, unread: data.unreadCount });
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    const token = getToken();
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setCounts(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const token = getToken();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/notifications/delete`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (response.ok) {
        fetchNotifications();
        setSelectedIds([]);
      }
    } catch (error) {
      console.error("Error deleting notifications:", error);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const groupNotificationsByDate = (notis) => {
    const groups = {};
    notis.forEach(n => {
      const date = new Date(n.createdAt);
      let dateStr = format(date, "yyyy-MM-dd");
      if (isToday(date)) dateStr = "Today";
      else if (isYesterday(date)) dateStr = "Yesterday";
      else dateStr = format(date, "MMMM d, yyyy");

      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(n);
    });
    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  const getIcon = (type) => {
    switch (type) {
      case "PAYMENT_REQUEST": return <Info className="w-5 h-5 text-blue-500" />;
      case "PAYMENT_APPROVED": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "PAYMENT_REJECTED": return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                    Notifications
                  </h1>
                  <p className="text-slate-500 text-sm font-medium">
                    Stay updated with payment requests and approvals.
                  </p>
                </div>
                {activeTab === "clear" && selectedIds.length > 0 && (
                  <button 
                    onClick={deleteSelected}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedIds.length})
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-6 w-fit">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "all" ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All ({counts.all})
                </button>
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "unread" ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Unread ({counts.unread})
                </button>
                <button
                  onClick={() => setActiveTab("clear")}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "clear" ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Clear Notifications
                </button>
              </div>

              {/* Notification List */}
              <div className="space-y-8">
                {loading ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                    <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No notifications found</p>
                  </div>
                ) : (
                  Object.keys(groupedNotifications).map(date => (
                    <div key={date} className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        {date}
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </h3>
                      <div className="grid gap-3">
                        {groupedNotifications[date].map(n => (
                          <div 
                            key={n._id}
                            onClick={() => !n.isRead && activeTab !== "clear" && markAsRead(n._id)}
                            className={`group relative bg-white p-5 rounded-2xl border transition-all ${!n.isRead ? 'border-blue-100 shadow-md shadow-blue-50/50' : 'border-slate-100 opacity-80 hover:opacity-100'} ${activeTab === 'clear' ? 'cursor-default' : 'cursor-pointer hover:border-primary/30'}`}
                          >
                            <div className="flex gap-4">
                              {activeTab === "clear" && (
                                <div className="flex items-start pt-1">
                                  <input 
                                    type="checkbox"
                                    checked={selectedIds.includes(n._id)}
                                    onChange={() => toggleSelect(n._id)}
                                    className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary transition-all cursor-pointer"
                                  />
                                </div>
                              )}
                              <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${!n.isRead ? 'bg-blue-50 text-primary' : 'bg-slate-50 text-slate-400'}`}>
                                {getIcon(n.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-sm font-black uppercase tracking-tight ${!n.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                                      {n.title}
                                    </h4>
                                    {!n.isRead && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-primary text-[8px] font-black rounded uppercase tracking-widest">
                                        Unread
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(n.createdAt), "hh:mm a")}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed mb-3">
                                  {n.message}
                                </p>
                                {n.data && (
                                  <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                      <Info className="w-3 h-3" />
                                      L# {n.data.loanNumber}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg text-[9px] font-black text-primary uppercase tracking-widest">
                                      <CheckCircle2 className="w-3 h-3" />
                                      ₹{n.data.amount}
                                    </div>
                                    {n.sender?.name && (
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg text-[9px] font-black text-amber-600 uppercase tracking-widest">
                                        <AlertCircle className="w-3 h-3" />
                                        By {n.sender.name}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-4">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-xl border border-slate-200 bg-white shadow-sm disabled:opacity-30 hover:border-primary transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Page {page} of {totalPages}
                  </span>
                  <button 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-xl border border-slate-200 bg-white shadow-sm disabled:opacity-30 hover:border-primary transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NotificationsPage;
