"use client";
import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1"];

const formatCurrency = (value) => 
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#475569" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central" 
      className="text-[10px] font-black"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const RenderPiePair = ({ title, subtitle, data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col h-full">
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total</p>
            <p className="text-sm font-black text-primary">₹{(total / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              label={renderCustomizedLabel}
              outerRadius={80}
              innerRadius={50}
              dataKey="value"
              isAnimationActive={false}
              stroke="#fff"
              strokeWidth={3}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="bottom" 
              align="center"
              iconType="circle"
              wrapperStyle={{ paddingTop: "20px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DistributionPieCharts = ({ disbursementData = {}, collectionData = {} }) => {
  const formatData = (data) => [
    { name: "Monthly", value: data.monthly || 0 },
    { name: "Daily", value: data.daily || 0 },
    { name: "Weekly", value: data.weekly || 0 },
    { name: "Interest", value: data.interest || 0 },
  ].filter(item => item.value > 0);

  const disData = formatData(disbursementData);
  const collData = formatData(collectionData);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
      <RenderPiePair 
        title="DISBURSEMENT BREAKDOWN" 
        subtitle="By category"
        data={disData} 
      />
      <RenderPiePair 
        title="COLLECTION BREAKDOWN" 
        subtitle="By loan type"
        data={collData} 
      />
    </div>
  );
};

export default DistributionPieCharts;
