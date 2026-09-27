"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getUserFromToken, getToken } from "../utils/auth";
import { getVapidPublicKey, getPushStatus, subscribePush, unsubscribePush } from "../services/push.service";

const NotificationContext = createContext();

// Push subscriptions are stored by the browser as base64url - the backend
// (and the browser's own PushManager.subscribe call) need it converted to
// the raw byte array VAPID actually uses.
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

const getApiBase = () => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  return (!url || url === "undefined") ? "http://localhost:5000" : url;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const user = getUserFromToken();
  const socketRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Registers the service worker for every logged-in session, and checks
  // whether THIS device already has an active push subscription (not just
  // whether the browser has granted permission, which stays "granted" even
  // after the user unsubscribes this device on the backend). Registering
  // the worker itself asks for no permission and is harmless either way.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setPushSupported(true);

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        if (cancelled || !existing) return;
        const res = await getPushStatus(existing.endpoint);
        if (!cancelled) setPushEnabled(!!res.data?.subscribed);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }
      const registration = await navigator.serviceWorker.ready;
      const { data } = await getVapidPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await subscribePush(subscription.toJSON());
      setPushEnabled(true);
    } finally {
      setPushBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } finally {
      setPushBusy(false);
    }
  }, []);

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
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        fetchNotifications,
        clearAll,
        pushEnabled,
        pushSupported,
        pushBusy,
        enablePush,
        disablePush,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
