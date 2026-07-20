"use client";
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { getTrendStats } from "../../services/analytics.service";
import { Calendar, Filter, Loader2 } from "lucide-react";

const CollectionTrendChart = ({ initialInterval = "all", isCumulative = false }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interval, setInterval] = useState(initialInterval);
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `range=all&interval=${interval}`;
      if (interval === "custom") {
        url += `&startDate=${customDates.start}&endDate=${customDates.end}`;
      }

      // We use getTrendStats from service, so let's adjust the call
      const res = await getTrendStats(interval === "custom" ? "custom" : "max", interval, customDates.start, customDates.end);
      
      if (res.data) {
        setData(res.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Failed to fetch trend data:", err);
      setError(err.message || "Failed to load trend data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, [interval, customDates]);

  const intervalOptions = [
    { label: "All Time", value: "all" },
    { label: "Daily (Today)", value: "daily" },
    { label: "Weekly (7 Days)", value: "weekly" },
    { label: "Monthly (30 Days)", value: "monthly" },
    { label: "Yearly (1 Year)", value: "yearly" },
    { label: "Custom Range", value: "custom" },
  ];

  const formatCurrency = (value) => 
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Calendar size={12} /> {label}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{entry.name}:</span>
              <span className="text-xs font-black text-slate-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col min-h-[400px] md:min-h-[500px] transition-all">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="text-left">
          <h3 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 md:h-8 bg-primary rounded-full"></span>
            {isCumulative ? "TOTAL GROWTH TREND" : "DISBURSEMENT vs COLLECTION"}
          </h3>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 px-3">
            {isCumulative ? "Cumulative performance tracker" : "Periodic performance tracker"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
          {/* Custom Date Range Pickers */}
          {interval === "custom" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                className="flex-1 sm:flex-none bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-slate-300 font-bold text-[9px]">to</span>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                className="flex-1 sm:flex-none bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* Filter Dropdown */}
          <div className="relative group w-full sm:min-w-[180px]">
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full appearance-none pl-10 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50"
            >
              {intervalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[8px]">▼</div>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 min-h-[300px] md:min-h-[350px] relative flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">Syncing Analytics...</span>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center text-center p-10 max-w-sm">
            <div className="w-16 h-16 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 text-red-500">
              <Filter size={32} />
            </div>
            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">Network Error</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
              {error}
            </p>
            <button 
              onClick={fetchTrendData}
              className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              Try Reconnecting
            </button>
          </div>
        ) : data.length === 0 && !loading ? (
          <div className="flex flex-col items-center text-center p-10 max-w-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
              <Calendar size={32} />
            </div>
            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">Zero Activity</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              No financial records were found for the selected timeframe. Try a broader range.
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center">
             <div className="w-full flex justify-between px-4 mb-4">
                <span className="text-[7px] font-black text-slate-200">
                   DEBUG: {data[0] ? Object.keys(data[0]).join(", ") : "NO DATA"}
                </span>
                <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                   {data.length} Tracked Points
                </span>
             </div>
            
            <div className="w-full" style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 7, fontWeight: 900, fill: "#94a3b8" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 7, fontWeight: 900, fill: "#94a3b8" }}
                    tickFormatter={(value) => `${value >= 100000 ? (value/100000).toFixed(1)+'L' : (value/1000).toFixed(0)+'K'}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey={isCumulative ? "cumulativeDisbursement" : "disbursement"}
                    name={isCumulative ? "Disbursed" : "Disbursement"}
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey={isCumulative ? "cumulativeCollection" : "collection"}
                    name={isCumulative ? "Collected" : "Collection"}
                    stroke="#10b981"
                    strokeWidth={4}
                    fill="#10b981"
                    fillOpacity={0.1}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionTrendChart;
