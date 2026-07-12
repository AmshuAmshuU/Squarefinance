import apiHandler from "./api";

const interestLoanService = {
  createLoan: async (loanData) => {
    return await apiHandler("/api/interest-loans", {
      method: "POST",
      body: JSON.stringify(loanData),
    });
  },

  getAllLoans: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiHandler(
      `/api/interest-loans${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
      }
    );
  },

  getLoanById: async (id) => {
    return await apiHandler(`/api/interest-loans/${id}`, {
      method: "GET",
    });
  },

  updateLoan: async (id, loanData) => {
    return await apiHandler(`/api/interest-loans/${id}`, {
      method: "PUT",
      body: JSON.stringify(loanData),
    });
  },

  deleteLoan: async (id) => {
    return await apiHandler(`/api/interest-loans/${id}`, {
      method: "DELETE",
    });
  },

  addPrincipalPayment: async (id, paymentData) => {
    return await apiHandler(`/api/interest-loans/${id}/principal-payment`, {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  },

  payInterestEMI: async (emiId, paymentData) => {
    return await apiHandler(`/api/interest-loans/emi/${emiId}/pay`, {
      method: "PUT",
      body: JSON.stringify(paymentData),
    });
  },

  getPendingPayments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiHandler(
      `/api/interest-loans/pending${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
      }
    );
  },
  
  getFollowupPayments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiHandler(
      `/api/interest-loans/followup-payments${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
      }
    );
  },

  getInterestPendingEmiDetails: async (id) => {
    return await apiHandler(`/api/interest-loans/pending-details/${id}`, {
      method: "GET",
    });
  },
};

export default interestLoanService;
