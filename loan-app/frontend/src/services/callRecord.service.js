import apiHandler from "./api";

export const setCallRecord = async (loanId, loanModel, response) => {
  return await apiHandler("/api/loans/call-record", {
    method: "POST",
    body: JSON.stringify({ loanId, loanModel, response }),
  });
};

export const getCallRecord = async (loanModel, loanId) => {
  return await apiHandler(`/api/loans/call-record/${loanModel}/${loanId}`, { method: "GET" });
};
