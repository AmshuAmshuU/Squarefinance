import React from "react";

const StatsCard = ({ title, value, icon, color = "primary", breakdown, subtitle }) => {
  const colorClasses = {
    primary: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color] || colorClasses.primary}`}>
          {icon}
        </div>

        {breakdown && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
            {breakdown.map((item, idx) => (
              <React.Fragment key={idx}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {item.label}
                </span>
                <span className="text-[11px] font-bold text-slate-700">
                  {item.isCount
                    ? item.value.toLocaleString("en-IN")
                    : `₹${item.value.toLocaleString("en-IN")}`}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-xs md:text-sm font-semibold uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
