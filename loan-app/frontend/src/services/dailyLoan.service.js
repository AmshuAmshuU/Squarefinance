import apiHandler from "./api";

export const createDailyLoan = async (loanData) => {
  return await apiHandler("/api/daily-loans", {
    method: "POST",
    body: JSON.stringify(loanData),
  });
};

export const getDailyLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/daily-loans${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getDailyLoanById = async (id) => {
  return await apiHandler(`/api/daily-loans/${id}`, {
    method: "GET",
  });
};

export const updateDailyLoan = async (id, loanData) => {
  return await apiHandler(`/api/daily-loans/${id}`, {
    method: "PUT",
    body: JSON.stringify(loanData),
  });
};

export const deleteDailyLoan = async (id) => {
  return await apiHandler(`/api/daily-loans/${id}`, {
    method: "DELETE",
  });
};

export const getDailyLoanEMIs = async (id) => {
  return await apiHandler(`/api/daily-loans/emis/${id}`, {
    method: "GET",
  });
};

export const getDailyPendingPayments = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/daily-loans/pending-payments${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getDailyFollowupLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/daily-loans/followup-payments${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getDailyPendingEmiDetails = async (id) => {
  return await apiHandler(`/api/daily-loans/pending-details/${id}`, {
    method: "GET",
  });
};
