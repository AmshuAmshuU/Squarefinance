import apiHandler from "./api";

// Updates not yet seen by the logged-in person: { count, items } (banner,
// sidebar number, tab flash).
export const getUnseenLocationUpdates = async () =>
  apiHandler("/api/location-updates/unseen", { method: "GET", silent: true });

// The Location Updates page: every update, newest first.
export const getLocationUpdates = async (page = 1, limit = 30) =>
  apiHandler(`/api/location-updates?page=${page}&limit=${limit}`, { method: "GET" });

export const markLocationUpdateSeen = async (id) =>
  apiHandler(`/api/location-updates/${id}/seen`, { method: "POST", silent: true });

export const markAllLocationUpdatesSeen = async () =>
  apiHandler("/api/location-updates/seen-all", { method: "POST" });

// "Location history" button on a loan: every time this customer shared.
export const getLoanLocationHistory = async (loanModel, loanId) =>
  apiHandler(`/api/location-updates/loan/${loanModel}/${loanId}`, { method: "GET" });
