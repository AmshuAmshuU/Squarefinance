import apiHandler from "./api";

export const createExpense = async (expenseData) => {
  return await apiHandler("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expenseData),
  });
};

export const getAllExpenses = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(`/api/expenses${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
};

export const searchLoanInfo = async (query) => {
  return await apiHandler(`/api/expenses/search?q=${query}`, {
    method: "GET",
  });
};

export const getLoanExpensesTotal = async (loanId) => {
  return await apiHandler(`/api/expenses/loan/${loanId}`, {
    method: "GET",
  });
};

export const updateExpense = async (id, expenseData) => {
  return await apiHandler(`/api/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(expenseData),
  });
};

export const deleteExpense = async (id) => {
  return await apiHandler(`/api/expenses/${id}`, {
    method: "DELETE",
  });
};
