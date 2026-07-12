"use client";
import React from "react";

const BAR_COLORS = ["#3B82F6", "#F59E0B", "#10B981"];
const BAR_LABELS = ["For Seizing", "Seized", "Sold"];

const VehicleStatsChart = ({ data }) => {
  // Normalise into [number, number, number]
  const counts = BAR_LABELS.map((label) => {
    const found = Array.isArray(data)
      ? data.find((d) => d.name === label)
      : null;
    return found ? found.value : 0;
  });

  const maxVal = Math.max(...counts, 1);

  // SVG dimensions
  const svgW = 600;
  const svgH = 300;
  const paddingLeft = 40;
  const paddingBottom = 50;
  const paddingTop = 20;
  const paddingRight = 20;
  const chartW = svgW - paddingLeft - paddingRight;
  const chartH = svgH - paddingTop - paddingBottom;
  const barWidth = Math.floor(chartW / BAR_LABELS.length / 2);
  const groupWidth = chartW / BAR_LABELS.length;

  // Y-axis tick values
  // Y-axis tick values (Ensure uniqueness to avoid duplicate keys)
  const tickCount = 5;
  const ticks = [...new Set(Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxVal * i) / tickCount)
  ))];

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-6">
        Vehicle Status Overview
      </h3>

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height="100%"
        style={{ maxHeight: 320 }}
      >
        {/* Y-axis gridlines + labels */}
        {ticks.map((tick) => {
          const y = paddingTop + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgW - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#94A3B8"
                fontWeight="700"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {BAR_LABELS.map((label, i) => {
          const val = counts[i];
          const barH = Math.max((val / maxVal) * chartH, val > 0 ? 4 : 0);
          const x = paddingLeft + i * groupWidth + (groupWidth - barWidth) / 2;
          const y = paddingTop + chartH - barH;
          const color = BAR_COLORS[i];

          return (
            <g key={label}>
              {/* Bar background (subtle) */}
              <rect
                x={x}
                y={paddingTop}
                width={barWidth}
                height={chartH}
                rx={6}
                fill={color}
                opacity={0.08}
              />
              {/* Actual bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                fill={color}
              />
              {/* Value label on top of bar */}
              {val > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight="800"
                  fill={color}
                >
                  {val}
                </text>
              )}
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={paddingTop + chartH + 20}
                textAnchor="middle"
                fontSize={11}
                fontWeight="700"
                fill="#64748B"
              >
                {label}
              </text>
              {/* Colour dot legend */}
              <circle
                cx={x + barWidth / 2}
                cy={paddingTop + chartH + 38}
                r={4}
                fill={color}
              />
            </g>
          );
        })}

        {/* X-axis base line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartH}
          x2={svgW - paddingRight}
          y2={paddingTop + chartH}
          stroke="#E2E8F0"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
};

export default VehicleStatsChart;
