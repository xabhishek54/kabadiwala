import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/local/db';
import { Bell, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const userObj = userStr ? JSON.parse(userStr) : null;
  const currentUserId = userObj?.recycler_id || userObj?.id || localStorage.getItem('kabadiwala_collector_id') || 'col-demo-101';

  // Live query for notifications targeting this user or global fallback
  const notifications = useLiveQuery(
    async () => {
      const all = await db.notifications.toArray();
      return all.filter(n => n.recipient_id === currentUserId || n.recipient_id === 'all' || !n.recipient_id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    [currentUserId]
  ) || [];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read && n.id).map(n => n.id!);
    for (const id of unreadIds) {
      await db.notifications.update(id, { read: true });
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (notif.id) {
      await db.notifications.update(notif.id, { read: true });
    }
    setIsOpen(false);
    if (notif.lot_id) {
      // If recycler account -> go to recycler dashboard or handover
      if (userObj?.account_type === 'recycler') {
        navigate('/recycler');
      } else {
        navigate('/lots');
      }
    }
  };

  const handleClear = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation();
    if (id) {
      await db.notifications.delete(id);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-stone-100 text-stone-700 transition-colors focus:outline-none cursor-pointer"
        title="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-10 z-50 w-auto sm:w-80 bg-white rounded-2xl border border-stone-200 shadow-2xl p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2 px-1">
            <div className="flex items-center gap-1.5 font-extrabold text-stone-900 text-xs">
              <Bell size={14} className="text-[#16A34A]" />
              <span>Notifications ({unreadCount} new)</span>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 px-1.5 py-0.5 rounded-md hover:bg-emerald-50"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 text-xs ${
                    n.read
                      ? 'bg-stone-50/60 border-stone-200/50 opacity-75'
                      : 'bg-emerald-50/60 border-emerald-200/80 font-semibold text-stone-900 shadow-2xs'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-stone-900 text-[11px] truncate flex items-center gap-1">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />}
                      <span>{n.title}</span>
                    </div>
                    <p className="text-[10px] text-stone-600 leading-tight">{n.message}</p>
                    <div className="text-[9px] text-stone-400">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleClear(e, n.id)}
                    className="text-stone-300 hover:text-red-500 p-1 shrink-0"
                    title="Dismiss"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
