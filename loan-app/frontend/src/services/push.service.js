import apiHandler from "./api";

export const getVapidPublicKey = async () => {
  return await apiHandler("/api/push/public-key");
};

export const getPushStatus = async (endpoint) => {
  return await apiHandler(`/api/push/status?endpoint=${encodeURIComponent(endpoint)}`);
};

export const subscribePush = async (subscription) => {
  return await apiHandler("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
};

export const unsubscribePush = async (endpoint) => {
  return await apiHandler("/api/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
};
