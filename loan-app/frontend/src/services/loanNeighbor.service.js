import apiHandler from "./api";

// The loans just above (prevId) and just below (nextId) this one in the loans
// list, for the PREV / NEXT buttons. loanModel: Loan | WeeklyLoan | DailyLoan | InterestLoan
export const getLoanNeighbors = async (loanModel, loanId) => {
  return await apiHandler(`/api/loans/neighbors/${loanModel}/${loanId}`, { method: "GET" });
};
