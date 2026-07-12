"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getUserFromToken, getToken } from "../utils/auth";

const NotificationContext = createContext();

const getApiBase = () => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  return (!url || url === "undefined") ? "http://localhost:5000" : url;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = getUserFromToken();
  const socketRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(`${getApiBase()}/api/notifications?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      // Silently ignore fetch errors - backend may not be ready
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Initial fetch only
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket connection - with proper cleanup and no re-render loops
  useEffect(() => {
    const token = getToken();
    if (!token || !user?._id) return;

    let socket = null;

    const connectSocket = async () => {
      try {
        const { io } = await import("socket.io-client");
        socket = io(getApiBase(), {
          transports: ["websocket", "polling"],
          auth: { token },
          reconnectionAttempts: 3,
          reconnectionDelay: 5000,
          timeout: 5000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join", user._id);
        });

        socket.on("new_notification", (notification) => {
          setNotifications((prev) => [notification, ...prev].slice(0, 5));
        });

        socket.on("unread_count", (count) => {
          setUnreadCount(count);
        });

        socket.on("connect_error", () => {
          // Silently handle connection errors - socket is optional
        });
      } catch (err) {
        // Socket.io not available or failed - continue without it
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user?._id]);

  // Polling every 30 seconds (increased from 10 to reduce server load)
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    const token = getToken();
    try {
      await fetch(`${getApiBase()}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // Silently ignore
    }
  };

  const clearAll = async () => {
    const token = getToken();
    try {
      await fetch(`${getApiBase()}/api/notifications/clear-all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      // Silently ignore
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, fetchNotifications, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
