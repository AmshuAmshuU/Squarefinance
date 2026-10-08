"use client";
import React, { useState, useEffect, useCallback } from "react";
import CallRecordControl, { useCallRecordEvents } from "./CallRecordControl";
import { getCallRecord } from "../services/callRecord.service";

// "Last call" note on a loan's details page - the same NP / EOD record the
// follow-up lists show, but here it stays visible (with its date) until the
// next call replaces it, not just for today.
const LoanCallRecord = ({ loanId, loanModel, className = "mt-3" }) => {
  const [record, setRecord] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loanId) return;
    let cancelled = false;
    getCallRecord(loanModel, loanId)
      .then((res) => {
        if (!cancelled) setRecord(res.data?.record || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loanId, loanModel]);

  const onLiveUpdate = useCallback(
    (p) => {
      if (String(p.loanId) === String(loanId) && p.loanModel === loanModel) setRecord(p.record);
    },
    [loanId, loanModel],
  );
  useCallRecordEvents(onLiveUpdate);

  if (!loanId || !loaded) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last call</span>
      <CallRecordControl loanId={loanId} loanModel={loanModel} record={record} onChange={setRecord} showDate />
    </div>
  );
};

export default LoanCallRecord;
