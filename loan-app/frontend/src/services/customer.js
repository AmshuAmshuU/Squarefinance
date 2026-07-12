import apiHandler from "./api";

export const createCustomer = async (data) => {
  return await apiHandler("/api/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getCustomers = async () => {
  return await apiHandler("/api/customers", {
    method: "GET",
  });
};

export const searchCustomer = async (loanNumber) => {
  return await apiHandler(`/api/customers/${loanNumber}`, {
    method: "GET",
  });
};

export const updateCustomer = async (id, data) => {
  return await apiHandler(`/api/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const updateEMI = async (id, data) => {
  return await apiHandler(`/api/customers/emi/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const getAllEMIs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(
    `/api/customers/emis/all${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
};

export const getEMIsByLoanId = async (loanId) => {
  return await apiHandler(`/api/customers/loan-emis/${loanId}`, {
    method: "GET",
  });
};
