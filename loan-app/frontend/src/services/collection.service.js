import apiHandler from "./api";

// Collection Reports & Analytics APIs

export const getCollectionReport = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/collections/report${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );
};

export const getCollectionTransactions = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/collections/transactions${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );
};

export const getLoansGivenSummary = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/collections/loans-given${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );
};
