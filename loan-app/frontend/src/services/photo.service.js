import apiHandler from "./api";

// Customer photos. loanModel: Loan | WeeklyLoan | DailyLoan | InterestLoan

export const getPhoto = async (loanModel, loanId) => {
  return await apiHandler(`/api/photos/${loanModel}/${loanId}`, { method: "GET" });
};

const withPhoto = (blob) => {
  const form = new FormData();
  form.append("photo", blob, "customer.jpg");
  return form;
};

// Super Admin: applied at once. Others: sent for approval (response says which).
export const setPhoto = async (loanModel, loanId, blob) => {
  return await apiHandler(`/api/photos/${loanModel}/${loanId}`, { method: "POST", body: withPhoto(blob) });
};

export const deletePhoto = async (loanModel, loanId) => {
  return await apiHandler(`/api/photos/${loanModel}/${loanId}`, { method: "DELETE" });
};

// Picture taken while a loan is still being created; returns { token, version, thumbUrl }.
export const uploadTempPhoto = async (loanModel, blob) => {
  return await apiHandler(`/api/photos/temp/${loanModel}`, { method: "POST", body: withPhoto(blob) });
};
