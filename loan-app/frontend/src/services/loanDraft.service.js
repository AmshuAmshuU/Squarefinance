import apiHandler from "./api";

// Saved Add Loan drafts: used when an interest rate below 2.00 is waiting for
// (or has been given) Super Admin approval.

// Saves the form as a draft and, if needed, asks the Super Admin to approve the rate.
export const saveRateDraft = async (draftId, formData) => {
  return await apiHandler("/api/loans/drafts", {
    method: "POST",
    body: JSON.stringify({ draftId, formData }),
  });
};

export const listLoanDrafts = async () => {
  return await apiHandler("/api/loans/drafts", { method: "GET" });
};

export const getLoanDraft = async (id) => {
  return await apiHandler(`/api/loans/drafts/${id}`, { method: "GET" });
};

export const discardLoanDraft = async (id) => {
  return await apiHandler(`/api/loans/drafts/${id}`, { method: "DELETE" });
};
