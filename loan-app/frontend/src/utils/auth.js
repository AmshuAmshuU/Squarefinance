"use client";

export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

export const setToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
    // Set cookie for middleware (7 days)
    document.cookie = `accessToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }
};

export const removeToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    // Clear cookie
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  try {
    // Basic JWT check - check if expired
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000;
    return Date.now() < expiry;
  } catch {
    return false;
  }
};

export const getUser = () => {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
};

export const getUserFromToken = getUser;

export const hasPermission = (permissionPath) => {
  const user = getUser();
  if (!user || !user.permissions) return false;
  if (user.role === "SUPER_ADMIN") return true;

  const parts = permissionPath.split(".");
  let current = user.permissions;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return current === true;
};
