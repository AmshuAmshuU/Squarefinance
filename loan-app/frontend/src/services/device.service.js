import apiHandler from "./api";

export const getMyDevices = async () => {
  const result = await apiHandler("/api/devices");
  return result.data;
};

// Quiet "I'm here" call: keeps last-active and this device's place fresh.
export const pingDevice = async (payload) => {
  return await apiHandler("/api/devices/ping", {
    method: "POST",
    body: JSON.stringify(payload || {}),
    silent: true,
  });
};

export const renameDevice = async (id, name) => {
  const result = await apiHandler(`/api/devices/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return result.data;
};

export const logoutDevice = async (id) => {
  return await apiHandler(`/api/devices/${id}`, { method: "DELETE" });
};

export const logoutOtherDevices = async () => {
  const result = await apiHandler("/api/devices/logout-others", { method: "POST" });
  return result.data;
};
