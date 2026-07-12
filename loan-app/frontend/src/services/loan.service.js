import apiHandler from "./api";

export const createLoan = async (loanData) => {
  return await apiHandler("/api/loans", {
    method: "POST",
    body: JSON.stringify(loanData),
  });
};

export const getLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(`/api/loans${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
};

export const getExpiredDocLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/expired-docs${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );
};

export const searchLoan = async (loanNumber) => {
  return await apiHandler(`/api/loans/search/${loanNumber}`, {
    method: "GET",
  });
};

export const getLoanById = async (id) => {
  return await apiHandler(`/api/loans/${id}`, {
    method: "GET",
  });
};

export const updateLoan = async (id, loanData) => {
  return await apiHandler(`/api/loans/${id}`, {
    method: "PUT",
    body: JSON.stringify(loanData),
  });
};

export const toggleSeized = async (id) => {
  return await apiHandler(`/api/loans/${id}/seized`, {
    method: "PATCH",
  });
};

export const calculateEMI = async (data) => {
  return await apiHandler("/api/loans/calculate-emi", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getRtoWorks = async () => {
  return await apiHandler("/api/loans/rto-works", {
    method: "GET",
  });
};

export const createRtoWork = async (name) => {
  return await apiHandler("/api/loans/rto-works", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
};

export const getSeizedPending = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/pending-payments${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getFollowupLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/followups${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getPendingEmiDetails = async (id) => {
  return await apiHandler(`/api/loans/pending-details/${id}`, {
    method: "GET",
  });
};

export const updatePaymentStatus = async (id, paymentStatus) => {
  return await apiHandler(`/api/loans/${id}/payment-status`, {
    method: "PATCH",
    body: JSON.stringify({ paymentStatus }),
  });
};
export const getForeclosureLoans = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/foreclosure${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};
export const forecloseLoan = async (id, data) => {
  return await apiHandler(`/api/loans/${id}/foreclose`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};
export const getSeizedVehicles = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/loans/seized-vehicles${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};
export const updateSeizedStatus = async (
  id,
  seizedStatus,
  soldDetails = null,
) => {
  return await apiHandler(`/api/loans/seized-vehicles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ seizedStatus, soldDetails }),
  });
};

export const updateFollowup = async (id, data) => {
  const { loanModel } = data;
  let endpoint = "/api/loans";

  if (loanModel === "DailyLoan") endpoint = "/api/daily-loans";
  else if (loanModel === "WeeklyLoan") endpoint = "/api/weekly-loans";
  else if (loanModel === "InterestLoan") endpoint = "/api/interest-loans";

  return await apiHandler(`${endpoint}/update-followup/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const getFollowupHistory = async (id) => {
  return await apiHandler(`/api/loans/followup-history/${id}`, {
    method: "GET",
  });
};

export const getAnalyticsStats = async () => {
  return await apiHandler("/api/analytics/stats", {
    method: "GET",
  });
};

export const getTodoList = async () => {
  return await apiHandler("/api/loans/todo-list", {
    method: "GET",
  });
};

export const deleteLoan = async (id) => {
  return await apiHandler(`/api/loans/${id}`, {
    method: "DELETE",
  });
};

export const checkLoanNumberUniqueness = async (loanNumber) => {
  return await apiHandler(`/api/loans/check-uniqueness/${loanNumber}`, {
    method: "GET",
  });
};
