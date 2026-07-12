import apiHandler from "./api";
import { setToken } from "../utils/auth";

export const login = async (email, password, accessKey = null) => {
  const result = await apiHandler("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, accessKey }),
  });

  if (result.data && result.data.token) {
    setToken(result.data.token);
  }

  return result.data.user;
};

export const forgotPassword = async (email) => {
  return await apiHandler("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const resetPassword = async (email, otp, newPassword) => {
  return await apiHandler("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
};

export const logout = async () => {
  try {
    await apiHandler("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    const { removeToken } = await import("../utils/auth");
    removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
};
