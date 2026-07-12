import apiHandler from "./api";

export const getAnalyticsStats = async () => {
  return await apiHandler("/api/analytics/stats");
};

export const getExportData = async () => {
  return await apiHandler("/api/analytics/export-data");
};

export const getTrendStats = async (range, interval, startDate, endDate) => {
  let url = `/api/analytics/trend-stats?range=${range}&interval=${interval}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  return await apiHandler(url);
};
