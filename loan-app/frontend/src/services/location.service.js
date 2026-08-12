// Standalone fetch calls for the public, unauthenticated customer location
// page - deliberately NOT using services/api.js's apiHandler, which carries
// admin auth-token/refresh/redirect-to-login logic that has no meaning for
// a customer who was never logged in. sendLocationLinkToCustomer at the
// bottom is the one exception - it's a staff-facing action and does use
// apiHandler.
import apiHandler from "./api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL === "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_API_BASE_URL || "";

const buildUrl = (path) =>
  BASE_URL.endsWith("/") ? `${BASE_URL}${path.slice(1)}` : `${BASE_URL}${path}`;

export const getLoanByLocationToken = async (token) => {
  const res = await fetch(buildUrl(`/api/location/${token}`));
  const result = await res.json();
  if (!res.ok || result.status !== "success") {
    throw new Error(result.message || "This link is no longer valid.");
  }
  return result.data;
};

export const updateLoanLocation = async (token, lat, lng) => {
  const res = await fetch(buildUrl(`/api/location/${token}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  const result = await res.json();
  if (!res.ok || result.status !== "success") {
    throw new Error(result.message || "Could not update location.");
  }
  return result.data;
};

export const sendLocationLinkToCustomer = async (loanModel, loanId) => {
  const res = await apiHandler(`/api/location/send/${loanModel}/${loanId}`, {
    method: "POST",
  });
  return res.data;
};
