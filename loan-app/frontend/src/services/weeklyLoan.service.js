import apiHandler from "./api";

export const createWeeklyLoan = async (loanData) => {
  return await apiHandler("/api/weekly-loans", {
    method: "POST",
    body: JSON.stringify(loanData),
  });
};

export const getWeeklyLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/weekly-loans${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getWeeklyLoanById = async (id) => {
  return await apiHandler(`/api/weekly-loans/${id}`, {
    method: "GET",
  });
};

export const updateWeeklyLoan = async (id, loanData) => {
  return await apiHandler(`/api/weekly-loans/${id}`, {
    method: "PUT",
    body: JSON.stringify(loanData),
  });
};

export const deleteWeeklyLoan = async (id) => {
  return await apiHandler(`/api/weekly-loans/${id}`, {
    method: "DELETE",
  });
};

export const getWeeklyLoanEMIs = async (id) => {
  return await apiHandler(`/api/weekly-loans/emis/${id}`, {
    method: "GET",
  });
};

export const getWeeklyPendingPayments = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/weekly-loans/pending-payments${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getWeeklyFollowupLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/weekly-loans/followup-payments${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getWeeklyPendingEmiDetails = async (id) => {
  return await apiHandler(`/api/weekly-loans/pending-details/${id}`, {
    method: "GET",
  });
};
