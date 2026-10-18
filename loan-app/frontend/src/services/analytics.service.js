import apiHandler from "./api";

export const getAnalyticsStats = async () => {
  return await apiHandler("/api/analytics/stats");
};

// The finished consolidated Excel report (same file as the nightly email),
// as { fileName, base64 }. Super Admin / Admin only.
export const getConsolidatedReportFile = async () => {
  return await apiHandler("/api/analytics/export-excel");
};

export const getTrendStats = async (range, interval, startDate, endDate) => {
  let url = `/api/analytics/trend-stats?range=${range}&interval=${interval}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  return await apiHandler(url);
};

export const getProfitStats = async (interval, startDate, endDate) => {
  let url = `/api/analytics/profit?interval=${interval}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  return await apiHandler(url);
};

export const getExpenseTrend = async (interval, startDate, endDate) => {
  let url = `/api/analytics/expense-trend?interval=${interval}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  return await apiHandler(url);
};

export const getDataHealthCheck = async () => {
  return await apiHandler("/api/reports/health-check");
};

export const getBusinessROI = async (endDate) => {
  let url = "/api/analytics/roi";
  if (endDate) url += `?endDate=${endDate}`;
  return await apiHandler(url);
};

export const getCompanyValuation = async () => {
  return await apiHandler("/api/analytics/valuation");
};

// Super Admin only - partner shares and what each share is worth now.
export const getPartners = async () => {
  return await apiHandler("/api/analytics/partners");
};

export const getMonthlyCollection = async (year, month) => {
  return await apiHandler(`/api/analytics/monthly-collection?year=${year}&month=${month}`);
};

// Every month in the range ("3" | "6" | "12" | "all") in one call - the Collection Efficiency graph
export const getMonthlyCollectionTrend = async (months) => {
  return await apiHandler(`/api/analytics/monthly-collection-trend?months=${months}`);
};

export const getBookGrowth = async (interval, startDate, endDate) => {
  let url = `/api/analytics/book-growth?interval=${interval}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  return await apiHandler(url);
};
