// Push notification service worker. Registered once by NotificationContext
// for every logged-in session - independent of whether the user has
// actually turned the "Push notifications" toggle on, since registering
// the worker itself asks for no permission and does nothing until a real
// push subscription exists.

self.addEventListener("push", (event) => {
  let payload = { title: "Square Finance", body: "You have a new notification." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (err) {
    // Non-JSON payload - fall back to the default text above.
  }

  // Urgent alerts (customer shared their location) stay on screen until
  // acted on, re-alert even if one for the same loan is already showing, and
  // vibrate where the phone allows it (Android; iPhones ignore these).
  const urgentOptions = payload.urgent
    ? {
        requireInteraction: true,
        tag: payload.tag || "urgent",
        renotify: true,
        vibrate: [250, 120, 250, 120, 500],
      }
    : {};

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      data: { url: payload.url || "/admin/dashboard" },
      ...urgentOptions,
    }),
  );
});

// Tapping the notification focuses an already-open tab if there is one,
// otherwise opens a new one at the relevant page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
