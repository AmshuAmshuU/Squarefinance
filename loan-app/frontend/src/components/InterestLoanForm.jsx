import React, { useState, useEffect } from "react";
import { format, addMonths } from "date-fns";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getUserFromToken } from "@/utils/auth";
import ClientResponseSection from "./ClientResponseSection";
import DisbursementModal from "./DisbursementModal";
import DisbursementList from "./DisbursementList";
import PrincipalPaymentModal from "./PrincipalPaymentModal";
import PrincipalPaymentList from "./PrincipalPaymentList";
import EMITable from "./EMITable";
import { checkLoanNumberUniqueness } from "@/services/loan.service";
import { getLoanExpensesTotal } from "@/services/expenseService";

const _loanUniquenessCache = new Map();

const ErrorMsg = ({ name, touched = {}, errors = {} }) => {
  const [section, field] = name.includes(".") ? name.split(".") : [null, name];
  const isTouched = section ? touched[section]?.[field] : touched[field];
  const error = section ? errors[section]?.[field] : errors[field];
  return isTouched && error ? (
    <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">
      {error}
    </p>
  ) : null;
};

const InterestLoanForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitting,
  isViewOnly = false,
  emis = [], // EMIs passed from parent for aggregate calculations
  onRefresh,
}) => {
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  const [isPrincipalModalOpen, setIsPrincipalModalOpen] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const validationSchema = Yup.object().shape({
    loanNumber: Yup.string()
      .required("Loan number is required")
      .test(
        "unique-loan-number",
        "Loan number already exists",
        async (value) => {
          if (!value || isViewOnly) return true;
          if (initialData?.loanNumber === value) return true;
          if (_loanUniquenessCache.has(value))
            return _loanUniquenessCache.get(value);
          try {
            await checkLoanNumberUniqueness(value);
            _loanUniquenessCache.set(value, true);
            return true;
          } catch (err) {
            _loanUniquenessCache.set(value, false);
            return false;
          }
        },
      ),
    customerName: Yup.string().required("Customer name is required"),
    initialPrincipalAmount: Yup.number()
      .required("Principal amount is required")
      .min(1),
    interestRate: Yup.number().required("Interest rate is required").min(0),
    startDate: Yup.string().required("Start date is required"),
    emiStartDate: Yup.string().required("Interest start date is required"),
    panNumber: Yup.string()
      .matches(/^(?:[A-Z]{5}[0-9]{4}[A-Z]{1})?$/, "Invalid PAN format")
      .nullable(),
    aadharNumber: Yup.string()
      .matches(/^(?:\d{12})?$/, "Invalid Aadhar. Must be 12 digits")
      .nullable(),
  });

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd");
  };

  const formik = useFormik({
    initialValues: {
      loanNumber: initialData?.loanNumber || "",
      customerName: initialData?.customerName || "",
      address: initialData?.address || "",
      ownRent: initialData?.ownRent || "Own",
      mobileNumbers:
        initialData?.mobileNumbers?.length > 0
          ? initialData.mobileNumbers
          : [""],
      guarantorName: initialData?.guarantorName || "",
      guarantorMobileNumbers:
        initialData?.guarantorMobileNumbers?.length > 0
          ? initialData.guarantorMobileNumbers
          : [""],
      panNumber: initialData?.panNumber || "",
      aadharNumber: initialData?.aadharNumber || "",
      initialPrincipalAmount: initialData?.initialPrincipalAmount || 0,
      interestRate: initialData?.interestRate || "",
      processingFeeRate: initialData?.processingFeeRate || 0,
      processingFee: initialData?.processingFee || 0,
      startDate: formatDateForInput(initialData?.startDate || new Date()),
      emiStartDate: formatDateForInput(initialData?.emiStartDate || new Date()),
      status: initialData?.status || "Active",
      disbursement: initialData?.disbursement || [],
      principalPayments: initialData?.principalPayments || [],
      remarks: initialData?.remarks || "",
      clientResponse: initialData?.clientResponse || "",
      paymentMode: initialData?.paymentMode || "Cash",
      nextFollowUpDate: formatDateForInput(initialData?.nextFollowUpDate),
      createdBy: initialData?.createdBy || null,
      updatedBy: initialData?.updatedBy || null,
      createdAt: initialData?.createdAt || null,
      updatedAt: initialData?.updatedAt || null,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      // Filter empty mobile numbers
      const mobiles = values.mobileNumbers.filter((num) => num.trim() !== "");
      const guarantorMobiles = values.guarantorMobileNumbers.filter((num) => num.trim() !== "");
      onSubmit({ ...values, mobileNumbers: mobiles, guarantorMobileNumbers: guarantorMobiles });
    },
  });

  const { values, setFieldValue, errors, touched, handleBlur } = formik;

  // Fetch expenses if loan exists
  useEffect(() => {
    const fetchExpenses = async () => {
      if (initialData?._id) {
        try {
          const res = await getLoanExpensesTotal(initialData._id);
          setTotalExpenses(res.data.totalAmount || 0);
        } catch (err) {
          console.error("Failed to fetch expenses:", err);
        }
      }
    };
    fetchExpenses();
  }, [initialData?._id]);

  // Aggregate calculations
  const totalInterestAmount = (emis || []).reduce(
    (sum, emi) => sum + (parseFloat(emi.interestAmount) || 0),
    0,
  );
  const interestCollected = (emis || []).reduce(
    (sum, emi) => sum + (parseFloat(emi.amountPaid) || 0),
    0,
  );
  const totalPrincipalPaid = (values.principalPayments || []).reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0,
  );
  const totalCollectedAmount =
    interestCollected +
    totalPrincipalPaid +
    (parseFloat(values.processingFee) || 0);
  const remainingPrincipalAmount =
    (parseFloat(values.initialPrincipalAmount) || 0) - totalPrincipalPaid;
  const monthlyInterest = Math.ceil(
    remainingPrincipalAmount * ((parseFloat(values.interestRate) || 0) / 100),
  );

  // Auto-fill EMI Start Date when Start Date changes
  useEffect(() => {
    if (values.startDate && !initialData?._id) {
      setFieldValue("emiStartDate", values.startDate);
    }
  }, [values.startDate, setFieldValue, initialData?._id]);

  // Handle Processing Fee logic
  const handleProcessingFeeRateChange = (rate) => {
    setFieldValue("processingFeeRate", rate);
    const principal = parseFloat(values.initialPrincipalAmount) || 0;
    const rateVal = parseFloat(rate);
    if (principal && !isNaN(rateVal)) {
      const fee = Math.ceil((principal * rateVal) / 100);
      setFieldValue("processingFee", fee);
    } else if (principal) {
      setFieldValue("processingFee", 0);
    }
  };

  const handleProcessingFeeChange = (fee) => {
    setFieldValue("processingFee", fee);
    const principal = parseFloat(values.initialPrincipalAmount) || 0;
    const feeVal = parseFloat(fee);
    if (principal && !isNaN(feeVal) && feeVal > 0) {
      const rate = ((feeVal / principal) * 100).toFixed(2);
      setFieldValue("processingFeeRate", rate);
    } else if (principal) {
      setFieldValue("processingFeeRate", 0);
    }
  };

  const handleDisbursementApply = (disbursements) => {
    setFieldValue("disbursement", disbursements);
    const total = disbursements.reduce(
      (sum, d) => sum + (parseFloat(d.amount) || 0),
      0,
    );
    setFieldValue("initialPrincipalAmount", total);

    // Recalculate processing fee based on new principal
    const rate = parseFloat(values.processingFeeRate) || 0;
    if (rate > 0) {
      setFieldValue("processingFee", Math.ceil(total * (rate / 100)));
    }
  };

  const handlePrincipalPaymentApply = (payments) => {
    setFieldValue("principalPayments", payments);
  };

  const getFieldClass = (name, section = null) => {
    const isTouched = section ? touched[section]?.[name] : touched[name];
    const error = section ? errors[section]?.[name] : errors[name];
    const baseClass =
      "w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 transition-all ";
    return (
      baseClass +
      (isTouched && error
        ? "border-red-300 text-red-900 focus:ring-red-100 placeholder:text-red-200"
        : "border-slate-200 text-slate-700 focus:ring-primary/20 placeholder:text-slate-300")
    );
  };


  return (
    <div className="bg-white w-full max-w-4xl mx-auto rounded-3xl shadow-sm overflow-hidden border border-slate-200 flex flex-col">
      <div className="p-8">
        <form onSubmit={formik.handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4 relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-primary/10 pb-4 md:pb-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                Basic Information
              </h3>

              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status
                </label>
                <select
                  name="status"
                  value={values.status}
                  onChange={formik.handleChange}
                  onBlur={handleBlur}
                  disabled={isViewOnly || !isSuperAdmin}
                  className={`text-[11px] font-bold uppercase tracking-widest py-1 px-3 border rounded-lg focus:outline-none ${isViewOnly || !isSuperAdmin ? "opacity-70 bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white border-primary/30 text-primary shadow-sm focus:ring-2 focus:ring-primary/20"}`}
                >
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Seized">Seized</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="w-full md:w-auto min-w-[150px] flex flex-wrap justify-start md:justify-end gap-x-4 gap-y-2">
                {initialData?._id && values.createdBy && (
                  <div className="flex flex-col items-start md:items-end pointer-events-none">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Created By
                    </span>
                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">
                        {typeof values.createdBy === "string"
                          ? values.createdBy
                          : values.createdBy.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {values.createdAt &&
                          format(new Date(values.createdAt), "dd/MM/yy HH:mm")}
                      </span>
                    </div>
                  </div>
                )}
                {initialData?._id && values.updatedBy && (
                  <div className="flex flex-col items-start md:items-end pointer-events-none">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Last Updated By
                    </span>
                    <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-tight">
                        {typeof values.updatedBy === "string"
                          ? values.updatedBy
                          : values.updatedBy.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {values.updatedAt &&
                          format(new Date(values.updatedAt), "dd/MM/yy HH:mm")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Loan Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="loanNumber"
                  value={values.loanNumber}
                  onChange={(e) =>
                    setFieldValue("loanNumber", e.target.value.toUpperCase())
                  }
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanNumber") + " uppercase"}
                  placeholder="LN-INT-001"
                />
                <ErrorMsg name="loanNumber" touched={touched} errors={errors} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={values.customerName}
                  onChange={formik.handleChange}
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("customerName")}
                  placeholder="Full Name"
                />
                <ErrorMsg name="customerName" touched={touched} errors={errors} />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Current Address
                </label>
                <textarea
                  name="address"
                  value={values.address}
                  onChange={formik.handleChange}
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  rows="2"
                  className={getFieldClass("address")}
                ></textarea>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Own/Rent
                  </label>
                  <select
                    name="ownRent"
                    value={values.ownRent}
                    onChange={formik.handleChange}
                    disabled={isViewOnly}
                    className={getFieldClass("ownRent")}
                  >
                    <option value="Own">Own</option>
                    <option value="Rent">Rent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    maxLength={10}
                    value={values.panNumber}
                    onChange={(e) =>
                      setFieldValue("panNumber", e.target.value.toUpperCase())
                    }
                    onBlur={handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("panNumber") + " uppercase"}
                    placeholder="ABCDE1234F"
                  />
                  <ErrorMsg name="panNumber" touched={touched} errors={errors} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                    Mobile Numbers
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          setFieldValue("mobileNumbers", [
                            ...values.mobileNumbers,
                            "",
                          ])
                        }
                        className="text-primary text-[9px] font-black uppercase hover:underline"
                      >
                        + Add Number
                      </button>
                    )}
                  </label>
                  <div className="space-y-2">
                    {values.mobileNumbers.map((num, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 animate-in slide-in-from-left-2 duration-200"
                      >
                        <input
                          type="text"
                          maxLength={10}
                          value={num}
                          onChange={(e) => {
                            const newArr = [...values.mobileNumbers];
                            newArr[idx] = e.target.value.replace(/[^0-9]/g, "");
                            setFieldValue("mobileNumbers", newArr);
                          }}
                          readOnly={isViewOnly}
                          className={getFieldClass(`mobileNumbers[${idx}]`)}
                          placeholder={`Number ${idx + 1}`}
                        />
                        {values.mobileNumbers.length > 1 && !isViewOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              setFieldValue(
                                "mobileNumbers",
                                values.mobileNumbers.filter(
                                  (_, i) => i !== idx,
                                ),
                              )
                            }
                            className="bg-red-50 text-red-400 p-3 rounded-xl hover:bg-red-100 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M20 12H4"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    maxLength={12}
                    value={values.aadharNumber}
                    onChange={(e) =>
                      setFieldValue(
                        "aadharNumber",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    onBlur={handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("aadharNumber")}
                    placeholder="12-digit Number"
                  />
                  <ErrorMsg name="aadharNumber" touched={touched} errors={errors} />
                </div>
              </div>
            </div>
          </div>

          {/* Guarantor Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Guarantor Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Guarantor Name
                </label>
                <input
                  type="text"
                  name="guarantorName"
                  value={values.guarantorName}
                  onChange={formik.handleChange}
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("guarantorName")}
                  placeholder="Guarantor full name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                  Guarantor Mobile Numbers
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setFieldValue("guarantorMobileNumbers", [
                          ...values.guarantorMobileNumbers,
                          "",
                        ])
                      }
                      className="text-primary text-[9px] font-black uppercase hover:underline"
                    >
                      + Add Number
                    </button>
                  )}
                </label>
                <div className="space-y-2">
                  {values.guarantorMobileNumbers.map((num, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 animate-in slide-in-from-left-2 duration-200"
                    >
                      <input
                        type="text"
                        maxLength={10}
                        value={num}
                        onChange={(e) => {
                          const newArr = [...values.guarantorMobileNumbers];
                          newArr[idx] = e.target.value.replace(/[^0-9]/g, "");
                          setFieldValue("guarantorMobileNumbers", newArr);
                        }}
                        readOnly={isViewOnly}
                        className={getFieldClass(`guarantorMobileNumbers[${idx}]`)}
                        placeholder={`Number ${idx + 1}`}
                      />
                      {values.guarantorMobileNumbers.length > 1 && !isViewOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            setFieldValue(
                              "guarantorMobileNumbers",
                              values.guarantorMobileNumbers.filter(
                                (_, i) => i !== idx,
                              ),
                            )
                          }
                          className="bg-red-50 text-red-400 p-3 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M20 12H4"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-primary/10 pb-2 mb-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                Loan Terms (Interest)
              </h3>
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setIsDisbursementModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  Update Payment
                </button>
              )}
            </div>

            <DisbursementList disbursements={values.disbursement} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Principal Amount
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 flex justify-between items-center group shadow-sm min-h-[50px]">
                  <span>
                    ₹
                    {(
                      parseFloat(values.initialPrincipalAmount) || 0
                    ).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest px-2 py-0.5 bg-primary/5 rounded-md group-hover:bg-primary/10 transition-colors">
                    Calculated
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Processing Fee Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={values.processingFeeRate ?? ""}
                  onChange={(e) =>
                    handleProcessingFeeRateChange(e.target.value)
                  }
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("processingFeeRate")}
                  placeholder="e.g. 1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Processing Fee
                </label>
                <input
                  type="number"
                  value={values.processingFee ?? ""}
                  onChange={(e) => handleProcessingFeeChange(e.target.value)}
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("processingFee")}
                  placeholder="₹ Amount"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  name="interestRate"
                  step="0.01"
                  value={values.interestRate}
                  onChange={formik.handleChange}
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("interestRate")}
                  placeholder="e.g. 2"
                />
                <ErrorMsg name="interestRate" touched={touched} errors={errors} />
              </div>
            </div>
          </div>

          {/* Paid Principal Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-primary/10 pb-2 mb-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                Paid Principal
              </h3>
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setIsPrincipalModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                  Add Payment
                </button>
              )}
            </div>

            <PrincipalPaymentList payments={values.principalPayments} />
          </div>

          {/* Dates & EMI Section Refined */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Dates & Interest
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Date Loan Disbursed <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={values.startDate}
                  onChange={formik.handleChange}
                  readOnly={isViewOnly}
                  className={getFieldClass("startDate")}
                />
                <ErrorMsg name="startDate" touched={touched} errors={errors} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interest Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="emiStartDate"
                  value={values.emiStartDate}
                  onChange={formik.handleChange}
                  readOnly={isViewOnly}
                  className={getFieldClass("emiStartDate")}
                />
                <ErrorMsg name="emiStartDate" touched={touched} errors={errors} />
              </div>
            </div>

            {/* Financial Summary Bar (Desktop) */}
            <div className="hidden md:flex bg-white rounded-3xl border border-slate-100 shadow-sm p-6 justify-between items-center gap-6">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
                  Monthly Interest
                </span>
                <p className="text-2xl font-black text-primary">
                  ₹{monthlyInterest.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 min-w-[140px] text-center">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                  Total Collected
                </span>
                <p className="text-xl font-black text-emerald-600">
                  ₹{totalCollectedAmount.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 min-w-[140px] text-center">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-1">
                  Total Expenses
                </span>
                <p className="text-xl font-black text-orange-600">
                  ₹{totalExpenses.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Total Interest Amount
                  </span>
                  <p className="text-sm font-black text-slate-600 border-b border-slate-200 pb-0.5 inline-block">
                    ₹{totalInterestAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex flex-col items-end mt-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Remaining Principal Amount
                  </span>
                  <p className="text-xl font-black text-primary">
                    ₹{remainingPrincipalAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Summary Bar (Mobile) */}
            <div className="md:hidden space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">
                    Monthly Interest
                  </span>
                  <p className="text-lg font-black text-primary">
                    ₹{monthlyInterest.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                    Collected
                  </span>
                  <p className="text-lg font-black text-emerald-600">
                    ₹{totalCollectedAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-1">
                    Expenses
                  </span>
                  <p className="text-lg font-black text-orange-600">
                    ₹{totalExpenses.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Interest
                  </span>
                  <p className="text-lg font-black text-slate-700">
                    ₹{totalInterestAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center px-6">
                <div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
                    Remaining Principal
                  </span>
                  <p className="text-xl font-black text-primary">
                    ₹{remainingPrincipalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-primary/10 p-2.5 rounded-full">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pledge Information */}
            <div className="space-y-4 pt-6 border-t border-primary/5">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
                Pledge Information
              </h3>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pledge Details / Notes
                </label>
                <textarea
                  name="remarks"
                  value={values.remarks}
                  onChange={formik.handleChange}
                  onBlur={handleBlur}
                  readOnly={isViewOnly}
                  rows="3"
                  className={getFieldClass("remarks")}
                  placeholder="Enter any additional notes or pledge information here..."
                ></textarea>
              </div>
            </div>
          </div>



          <ClientResponseSection
            clientResponse={values.clientResponse}
            nextFollowUpDate={values.nextFollowUpDate}
            onChange={formik.handleChange}
            isViewOnly={isViewOnly}
          />

          {!isViewOnly && (
            <div className="flex justify-start items-center gap-12 pt-12 border-t border-slate-100 mt-12">
              <button
                type="button"
                onClick={onCancel}
                className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-16 py-4 bg-[#2463EB] text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/40 disabled:opacity-50 hover:-translate-y-1 active:translate-y-0"
              >
                {submitting
                  ? "Processing..."
                  : initialData?._id
                    ? "Commit Changes"
                    : "Create Interest Loan"}
              </button>
            </div>
          )}
        </form>

        {initialData?._id && (
          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-8 px-1">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                INTEREST PAYMENT SCHEDULE
              </h3>
            </div>
            <div className="rounded-3xl border border-slate-200 shadow-md overflow-hidden bg-white">
              <EMITable
                emis={emis.map((e) => ({
                  ...e,
                  emiAmount: e.interestAmount,
                }))}
                isEditMode={!isViewOnly}
                loanType="interest"
                onUpdateSuccess={onRefresh}
              />
            </div>
          </div>
        )}
      </div>

      <DisbursementModal
        isOpen={isDisbursementModalOpen}
        onClose={() => setIsDisbursementModalOpen(false)}
        onApply={handleDisbursementApply}
        initialData={values.disbursement}
      />

      <PrincipalPaymentModal
        isOpen={isPrincipalModalOpen}
        onClose={() => setIsPrincipalModalOpen(false)}
        onApply={handlePrincipalPaymentApply}
        initialData={values.principalPayments}
        loanBalance={values.initialPrincipalAmount}
        loanNumber={values.loanNumber}
      />
    </div>
  );
};

export default InterestLoanForm;
