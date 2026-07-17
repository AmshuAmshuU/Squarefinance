"use client";
// Layout updated to move Additional Mobile Numbers (Customer) below the main Mobile Number field.
import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";
import { addMonths, format } from "date-fns";
import { getUserFromToken } from "../utils/auth";
import ClientResponseSection from "./ClientResponseSection";
import DisbursementModal from "./DisbursementModal";
import DisbursementList from "./DisbursementList";
import {
  calculateEMI as fetchEMI,
  getRtoWorks,
  createRtoWork,
  checkLoanNumberUniqueness,
} from "../services/loan.service";
import { getLoanExpensesTotal } from "../services/expenseService";

const _monthlyLoanUniquenessCache = new Map();

const ErrorMsg = ({ name, formik }) => {
  const meta = formik.getFieldMeta(name);
  return meta.touched && meta.error ? (
    <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">
      {meta.error}
    </p>
  ) : null;
};

const LoanForm = ({
  initialData,
  onSubmit,
  onCancel,
  isViewOnly,
  submitting,
  renderExtraActions,
  emis = [],
}) => {
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const validationSchema = Yup.object().shape({
    customerDetails: Yup.object({
      customerName: Yup.string().nullable(),
      address: Yup.string().nullable(),
      ownRent: Yup.string().nullable(),
      mobileNumbers: Yup.array()
        .of(Yup.string().matches(/^(?:[6-9]\d{9})?$/, "Invalid Mobile Number"))
        .nullable(),
      guarantorName: Yup.string().nullable(),
      guarantorMobileNumbers: Yup.array()
        .of(Yup.string().matches(/^(?:[6-9]\d{9})?$/, "Invalid Mobile Number"))
        .nullable(),
      panNumber: Yup.string()
        .matches(
          /^(?:[A-Z]{5}[0-9]{4}[A-Z]{1})?$/,
          "Invalid PAN format (e.g., ABCDE1234F)",
        )
        .nullable(),
      aadharNumber: Yup.string()
        .matches(/^(?:\d{12})?$/, "Invalid Aadhar. Must be 12 digits")
        .nullable(),
    }),
    loanTerms: Yup.object({
      loanNumber: Yup.string()
        .required("Loan number is required")
        .test(
          "unique-loan-number",
          "Loan number already exists",
          async (value) => {
            if (!value || isViewOnly) return true;
            // If editing and same as initial, skip
            if (initialData?.loanTerms?.loanNumber === value) return true;

            if (_monthlyLoanUniquenessCache.has(value)) {
              return _monthlyLoanUniquenessCache.get(value);
            }

            try {
              const res = await checkLoanNumberUniqueness(value);
              _monthlyLoanUniquenessCache.set(value, true);
              return true;
            } catch (err) {
              _monthlyLoanUniquenessCache.set(value, false);
              return false;
            }
          },
        ),
      principalAmount: Yup.number().transform((value, originalValue) => originalValue === "" ? null : value).nullable(),
      processingFeeRate: Yup.number().transform((value, originalValue) => originalValue === "" ? null : value).nullable(),
      processingFee: Yup.number().transform((value, originalValue) => originalValue === "" ? null : value).nullable(),
      tenureMonths: Yup.number()
        .transform((value, originalValue) => originalValue === "" ? null : value)
        .integer()
        .nullable(),
      tenureType: Yup.string().nullable(),
      annualInterestRate: Yup.number().transform((value, originalValue) => originalValue === "" ? null : value).nullable(),
    }),
    vehicleInformation: Yup.object({
      vehicleNumber: Yup.string()
        .matches(/^(?:[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4})?$/, "Format: KA-01-AB-1234")
        .nullable(),
      chassisNumber: Yup.string().nullable(),
      engineNumber: Yup.string().nullable(),
      modelYear: Yup.string().matches(/^\d*$/, "Must be numeric").nullable(),
      typeOfVehicle: Yup.string().nullable(),
      ywBoard: Yup.string().nullable(),
      dealerName: Yup.string().nullable(),
      dealerNumber: Yup.string().nullable(),
      fcDate: Yup.string().nullable(),
      insuranceDate: Yup.string().nullable(),
      hpEntry: Yup.string()
        .oneOf(["Not done", "Applied", "Finished"])
        .nullable(),
    }),
    status: Yup.object({
      // status is now automatic
    }),
  });

  const [rtoOptions, setRtoOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isRtoDropdownOpen, setIsRtoDropdownOpen] = useState(false);
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);

  const [remainingPrincipalAmount, setRemainingPrincipalAmount] = useState(0);
  const [totalCollectedAmount, setTotalCollectedAmount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await getRtoWorks();
        if (res.data) {
          setRtoOptions(res.data.map((opt) => opt.name));
        }
      } catch (err) {
        console.error("Failed to fetch RTO options", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (initialData?._id && initialData?._id !== "undefined") {
        try {
          const res = await getLoanExpensesTotal(initialData._id);
          if (res.data) {
            setTotalExpenses(res.data.total);
          }
        } catch (err) {
          console.error("Failed to fetch expenses total", err);
        }
      }
    };
    fetchExpenses();
  }, [initialData?._id]);

  const formik = useFormik({
    initialValues: {
      customerDetails: {
        customerName: initialData?.customerDetails?.customerName || "",
        address: initialData?.customerDetails?.address || "",
        ownRent: initialData?.customerDetails?.ownRent || "Own",
        mobileNumbers: Array.isArray(
          initialData?.customerDetails?.mobileNumbers,
        )
          ? initialData.customerDetails.mobileNumbers
          : [""],
        panNumber: initialData?.customerDetails?.panNumber || "",
        aadharNumber: initialData?.customerDetails?.aadharNumber || "",
        guarantorName: initialData?.customerDetails?.guarantorName || "",
        guarantorMobileNumbers: Array.isArray(
          initialData?.customerDetails?.guarantorMobileNumbers,
        )
          ? initialData.customerDetails.guarantorMobileNumbers
          : [""],
      },
      loanTerms: {
        loanNumber: initialData?.loanTerms?.loanNumber || "",
        principalAmount: initialData?.loanTerms?.principalAmount ?? "",
        processingFeeRate: initialData?.loanTerms?.processingFeeRate ?? "",
        processingFee: initialData?.loanTerms?.processingFee ?? "",
        tenureMonths: initialData?.loanTerms?.tenureMonths ?? "",
        tenureType: initialData?.loanTerms?.tenureType || "Monthly",
        annualInterestRate: initialData?.loanTerms?.annualInterestRate ?? "",
        dateLoanDisbursed: initialData?.loanTerms?.dateLoanDisbursed || "",
        emiStartDate: initialData?.loanTerms?.emiStartDate || "",
        emiEndDate: initialData?.loanTerms?.emiEndDate || "",
        monthlyEMI: initialData?.loanTerms?.monthlyEMI || 0,
        totalInterestAmount: initialData?.loanTerms?.totalInterestAmount || 0,
        paymentMode: initialData?.loanTerms?.paymentMode || "Cash",
        chequeNumber: initialData?.loanTerms?.chequeNumber || "",
        disbursement: Array.isArray(initialData?.loanTerms?.disbursement)
          ? initialData.loanTerms.disbursement
          : [],
      },
      vehicleInformation: {
        vehicleNumber: initialData?.vehicleInformation?.vehicleNumber || "",
        chassisNumber: initialData?.vehicleInformation?.chassisNumber || "",
        engineNumber: initialData?.vehicleInformation?.engineNumber || "",
        modelYear: initialData?.vehicleInformation?.modelYear || "",
        typeOfVehicle: initialData?.vehicleInformation?.typeOfVehicle || "",
        ywBoard: initialData?.vehicleInformation?.ywBoard || "Yellow",
        dealerName: initialData?.vehicleInformation?.dealerName || "",
        dealerNumber: initialData?.vehicleInformation?.dealerNumber || "",
        fcDate: initialData?.vehicleInformation?.fcDate || "",
        insuranceDate: initialData?.vehicleInformation?.insuranceDate || "",
        rtoWorkPending: Array.isArray(
          initialData?.vehicleInformation?.rtoWorkPending,
        )
          ? initialData.vehicleInformation.rtoWorkPending
          : [],
        hpEntry: initialData?.vehicleInformation?.hpEntry || "Not done",
      },
      status: {
        status: initialData?.status?.status || "Active",
        paymentStatus: initialData?.status?.paymentStatus || "Pending",
        isSeized: initialData?.status?.isSeized || false,
        docChecklist: initialData?.status?.docChecklist || "",
        remarks: initialData?.status?.remarks || "",
        createdBy: initialData?.status?.createdBy || null,
        updatedBy: initialData?.status?.updatedBy || null,
        createdAt: initialData?.status?.createdAt || null,
        updatedAt: initialData?.status?.updatedAt || null,
        clientResponse: initialData?.status?.clientResponse || "",
        nextFollowUpDate: initialData?.status?.nextFollowUpDate || "",
        seizedStatus: initialData?.status?.seizedStatus || "",
        seizedDate: initialData?.status?.seizedDate || "",
        soldDetails: initialData?.status?.soldDetails || null,
        foreclosureDetails: {
          foreclosedBy:
            initialData?.status?.foreclosureDetails?.foreclosedBy || "",
          foreclosureDate:
            initialData?.status?.foreclosureDetails?.foreclosureDate || "",
          foreclosureAmount:
            initialData?.status?.foreclosureDetails?.foreclosureAmount || 0,
        },
      },
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true,
    onSubmit: async (values) => {
      // Clean up rtoWorkPending: ensure it's an array and filter out empty strings
      const rtoWork = Array.isArray(values.vehicleInformation.rtoWorkPending)
        ? values.vehicleInformation.rtoWorkPending.filter(
          (w) => w.trim() !== "",
        )
        : [];

      // Save any new options to the backend
      for (const work of rtoWork) {
        if (!rtoOptions.includes(work)) {
          try {
            await createRtoWork(work);
          } catch (err) {
            console.error("Failed to save new RTO work option", err);
          }
        }
      }

      onSubmit({
        ...values,
        vehicleInformation: {
          ...values.vehicleInformation,
          rtoWorkPending: rtoWork,
        },
      });
    },
  });

  const handleDisbursementApply = (disbursements) => {
    formik.setFieldValue("loanTerms.disbursement", disbursements);
    const total = disbursements.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    formik.setFieldValue("loanTerms.principalAmount", total);
  };

  const handleRtoCheckboxChange = (option) => {
    const current = Array.isArray(
      formik.values.vehicleInformation.rtoWorkPending,
    )
      ? formik.values.vehicleInformation.rtoWorkPending
      : [];
    if (current.includes(option)) {
      formik.setFieldValue(
        "vehicleInformation.rtoWorkPending",
        current.filter((item) => item !== option),
      );
    } else {
      formik.setFieldValue("vehicleInformation.rtoWorkPending", [
        ...current,
        option,
      ]);
    }
  };

  const [customRto, setCustomRto] = useState("");
  const handleAddCustomRto = () => {
    if (customRto.trim()) {
      const current = Array.isArray(
        formik.values.vehicleInformation.rtoWorkPending,
      )
        ? formik.values.vehicleInformation.rtoWorkPending
        : [];
      if (!current.includes(customRto.trim())) {
        formik.setFieldValue("vehicleInformation.rtoWorkPending", [
          ...current,
          customRto.trim(),
        ]);
      }
      setCustomRto("");
    }
  };

  // Auto-format Vehicle Number: KA01TH8520 -> KA-01-TH-8520
  const formatVehicleNumber = (val) => {
    let clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let parts = [];

    // Pattern: 2 chars - 2 digits - 1 or 2 chars - 4 digits
    if (clean.length > 0) parts.push(clean.substring(0, 2));
    if (clean.length > 2)
      parts.push(clean.substring(2, 4).replace(/[^0-9]/g, ""));
    if (clean.length > 4) {
      let remaining = clean.substring(4);
      let digitMatch = remaining.match(/\d/);
      if (digitMatch) {
        let digitIdx = remaining.indexOf(digitMatch[0]);
        parts.push(remaining.substring(0, digitIdx).replace(/[^A-Z]/g, ""));
        parts.push(
          remaining.substring(digitIdx, digitIdx + 4).replace(/[^0-9]/g, ""),
        );
      } else {
        parts.push(remaining.replace(/[^A-Z]/g, ""));
      }
    }
    return parts.filter((p) => p.length > 0).join("-");
  };

  const handleProcessingFeeRateChange = (rate) => {
    formik.setFieldValue("loanTerms.processingFeeRate", rate);
    const principal = parseFloat(formik.values.loanTerms.principalAmount) || 0;
    const rateVal = parseFloat(rate);
    if (principal && !isNaN(rateVal)) {
      const fee = Math.ceil((principal * rateVal) / 100);
      formik.setFieldValue("loanTerms.processingFee", fee);
    } else if (principal) {
      formik.setFieldValue("loanTerms.processingFee", 0);
    }
  };

  const handleProcessingFeeChange = (fee) => {
    formik.setFieldValue("loanTerms.processingFee", fee);
    const principal = parseFloat(formik.values.loanTerms.principalAmount) || 0;
    const feeVal = parseFloat(fee);
    if (principal && !isNaN(feeVal)) {
      const rate = ((feeVal / principal) * 100).toFixed(2);
      formik.setFieldValue("loanTerms.processingFeeRate", rate);
    } else if (principal) {
      formik.setFieldValue("loanTerms.processingFeeRate", 0);
    }
  };

  // Auto-calculate EMI from backend
  useEffect(() => {
    const principal = parseFloat(formik.values.loanTerms.principalAmount);
    const rate = parseFloat(formik.values.loanTerms.annualInterestRate);
    const tenure = parseInt(formik.values.loanTerms.tenureMonths);

    if (principal && rate && tenure) {
      const getEMI = async () => {
        try {
          const res = await fetchEMI({
            principalAmount: principal,
            annualInterestRate: rate,
            tenureMonths: tenure,
          });
          if (res.data && res.data.emi) {
            formik.setFieldValue("loanTerms.monthlyEMI", res.data.emi);
            const totalInt = principal * (rate / 100) * tenure;
            formik.setFieldValue(
              "loanTerms.totalInterestAmount",
              Math.ceil(totalInt),
            );
          }
        } catch (err) {
          console.error("Failed to fetch EMI", err);
        }
      };
      getEMI();
    } else {
      formik.setFieldValue("loanTerms.monthlyEMI", 0);
      formik.setFieldValue("loanTerms.totalInterestAmount", 0);
    }
  }, [
    formik.values.loanTerms.principalAmount,
    formik.values.loanTerms.annualInterestRate,
    formik.values.loanTerms.tenureMonths,
  ]);

  // Auto-calculate EMI Start Date from Disbursement Date
  useEffect(() => {
    const disbursementDate = formik.values.loanTerms.dateLoanDisbursed;
    if (disbursementDate) {
      const d = new Date(disbursementDate);
      const startDate = addMonths(d, 1);
      formik.setFieldValue(
        "loanTerms.emiStartDate",
        format(startDate, "yyyy-MM-dd"),
      );
    }
  }, [formik.values.loanTerms.dateLoanDisbursed]);

  // Auto-calculate EMI End Date from Start Date & Tenure
  useEffect(() => {
    const startDate = formik.values.loanTerms.emiStartDate;
    const tenure = parseInt(formik.values.loanTerms.tenureMonths);
    if (startDate && tenure) {
      const d = new Date(startDate);
      // End Date = Start Date + (Tenure - 1) Months
      const endDate = addMonths(d, tenure - 1);
      formik.setFieldValue(
        "loanTerms.emiEndDate",
        format(endDate, "yyyy-MM-dd"),
      );
    }
  }, [
    formik.values.loanTerms.emiStartDate,
    formik.values.loanTerms.tenureMonths,
  ]);

  // Auto-calculate Remaining Principal Amount
  useEffect(() => {
    const principal = parseFloat(formik.values.loanTerms.principalAmount) || 0;
    const tenure = parseInt(formik.values.loanTerms.tenureMonths) || 0;

    if (principal > 0 && tenure > 0) {
      const principalPerMonth = principal / tenure;
      let remainingTenureCount = 0;

      if (emis && emis.length > 0) {
        emis.forEach((emi) => {
          const emiAmount = parseFloat(emi.emiAmount) || 0;
          const amountPaid = parseFloat(emi.amountPaid) || 0;
          if (emiAmount > 0) {
            // How much of this specific EMI's principal portion is still remaining?
            // Since we use flat interest, we assume each month's principal part is (Principal/Tenure)
            // and we track remaining tenure as a fraction of paid/unpaid.
            const remainingPortion = Math.max(
              0,
              (emiAmount - amountPaid) / emiAmount,
            );
            remainingTenureCount += remainingPortion;
          }
        });
      } else {
        // If no EMIs data yet, assume full principal remains
        remainingTenureCount = tenure;
      }

      const remainingPrincipal = Math.ceil(principalPerMonth * remainingTenureCount);
      setRemainingPrincipalAmount(remainingPrincipal);
    } else {
      setRemainingPrincipalAmount(0);
    }
  }, [
    formik.values.loanTerms.principalAmount,
    formik.values.loanTerms.tenureMonths,
    emis,
  ]);

  // Auto-calculate Total Collected Amount
  useEffect(() => {
    let total = 0;
    if (emis && emis.length > 0) {
      total = emis.reduce((sum, emi) => {
        const overdueSum = Array.isArray(emi.overdue)
          ? emi.overdue.reduce(
            (oSum, ov) => oSum + (parseFloat(ov.amount) || 0),
            0,
          )
          : parseFloat(emi.overdue) || 0;
        return sum + (parseFloat(emi.amountPaid) || 0) + overdueSum;
      }, 0);
    }

    // Add foreclosure amount if loan is closed
    if (formik.values.status?.status?.toLowerCase() === "closed") {
      total += parseFloat(
        formik.values.status?.foreclosureDetails?.foreclosureAmount || 0,
      );
    }

    // Add Sold Vehicle Amount if available
    if (
      formik.values.status?.seizedStatus === "Sold" &&
      formik.values.status?.soldDetails?.totalAmount
    ) {
      total += parseFloat(formik.values.status.soldDetails.totalAmount);
    }

    // Add Processing Fee
    total += parseFloat(formik.values.loanTerms.processingFee || 0);

    setTotalCollectedAmount(
      total.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    );
  }, [
    emis,
    formik.values.status?.status,
    formik.values.status?.foreclosureDetails?.foreclosureAmount,
    formik.values.status?.seizedStatus,
    formik.values.status?.soldDetails?.totalAmount,
    formik.values.loanTerms.processingFee,
  ]);


  const getFieldClass = (name) => {
    const meta = formik.getFieldMeta(name);
    const baseClass =
      "w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 transition-all ";
    const stateClass =
      meta.touched && meta.error
        ? "border-red-300 text-red-900 focus:ring-red-100 placeholder:text-red-200"
        : "border-slate-200 text-slate-700 focus:ring-primary/20 placeholder:text-slate-300";
    return baseClass + stateClass;
  };

  return (
    <div className={`bg-white w-full max-w-4xl mx-auto rounded-3xl shadow-sm overflow-hidden border border-slate-200 flex flex-col ${isDarkMode ? "loan-form-dark-mode" : ""}`}>
      <style jsx global>{`
        /* Scoped LoanForm dark mode overrides. This component is shared by
           the Loans view, edit, and add pages, so this one conversion
           covers all three. Prefixed with .loan-form-dark-mode so nothing
           here can affect any other page. */
        .loan-form-dark-mode {
          background-color: #1e293b !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #cbd5e1;
        }
        .loan-form-dark-mode .bg-white {
          background-color: #334155 !important;
        }
        .loan-form-dark-mode .bg-slate-50,
        .loan-form-dark-mode .bg-slate-100,
        .loan-form-dark-mode .bg-slate-200 {
          background-color: #334155 !important;
        }
        .loan-form-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .loan-form-dark-mode .bg-blue-50,
        .loan-form-dark-mode .bg-blue-100 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .loan-form-dark-mode .bg-emerald-50,
        .loan-form-dark-mode .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }
        .loan-form-dark-mode .bg-orange-50,
        .loan-form-dark-mode .bg-orange-100 {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }
        .loan-form-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .loan-form-dark-mode .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .loan-form-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .loan-form-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .loan-form-dark-mode .border-slate-50,
        .loan-form-dark-mode .border-slate-100,
        .loan-form-dark-mode .border-slate-200,
        .loan-form-dark-mode .border-slate-300 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .loan-form-dark-mode input,
        .loan-form-dark-mode select,
        .loan-form-dark-mode textarea {
          color-scheme: dark;
        }
      `}</style>
      <div className="p-8">
        <form
          onSubmit={formik.handleSubmit}
          onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.type !== "submit") e.preventDefault(); }}
          className="space-y-8"
        >
          {/* Header Bar: Status & Meta Info */}
          <div className="space-y-4 relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-primary/10 pb-4 md:pb-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                System Information
              </h3>

              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status
                </label>
                <select
                  name="status.status"
                  value={formik.values.status?.status || "Active"}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
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
                {initialData?._id && formik.values.status?.createdBy && (
                  <div className="flex flex-col items-start md:items-end pointer-events-none">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Created By
                    </span>
                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">
                        {typeof formik.values.status.createdBy === "string"
                          ? formik.values.status.createdBy
                          : formik.values.status.createdBy.name}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-emerald-500/40" />
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {formik.values.status.createdAt &&
                          format(
                            new Date(formik.values.status.createdAt),
                            "dd/MM/yy HH:mm",
                          )}
                      </span>
                    </div>
                  </div>
                )}

                {initialData?._id && formik.values.status?.updatedBy && (
                  <div className="flex flex-col items-start md:items-end pointer-events-none">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Last Updated By
                    </span>
                    <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-tight">
                        {typeof formik.values.status.updatedBy === "string"
                          ? formik.values.status.updatedBy
                          : formik.values.status.updatedBy.name}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-amber-500/40" />
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {formik.values.status.updatedAt &&
                          format(
                            new Date(formik.values.status.updatedAt),
                            "dd/MM/yy HH:mm",
                          )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1. Customer Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Loan Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="loanTerms.loanNumber"
                  value={formik.values.loanTerms.loanNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "loanTerms.loanNumber",
                      e.target.value.toUpperCase(),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={
                    getFieldClass("loanTerms.loanNumber") + " uppercase"
                  }
                  placeholder="LN-001"
                />
                <ErrorMsg name="loanTerms.loanNumber" formik={formik} />
                {formik.touched.loanTerms?.loanNumber && !formik.errors.loanTerms?.loanNumber && formik.values.loanTerms.loanNumber && !isViewOnly && (
                  <p className="text-[9px] font-bold text-emerald-500 mt-1 uppercase tracking-wider">
                    Loan number is available
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerDetails.customerName"
                  value={formik.values.customerDetails.customerName || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("customerDetails.customerName")}
                  placeholder="Full Name"
                />
                <ErrorMsg name="customerDetails.customerName" formik={formik} />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Current Address
                </label>
                <textarea
                  name="customerDetails.address"
                  value={formik.values.customerDetails.address || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  rows="2"
                  className={getFieldClass("customerDetails.address")}
                ></textarea>
                <ErrorMsg name="customerDetails.address" formik={formik} />
              </div>
              {/* Left Column: Own/Rent & PAN */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Own/Rent
                  </label>
                  <select
                    name="customerDetails.ownRent"
                    value={formik.values.customerDetails.ownRent || ""}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isViewOnly}
                    className={getFieldClass("customerDetails.ownRent")}
                  >
                    <option value="Own">Own</option>
                    <option value="Rent">Rent</option>
                  </select>
                  <ErrorMsg name="customerDetails.ownRent" formik={formik} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="customerDetails.panNumber"
                    maxLength={10}
                    value={formik.values.customerDetails.panNumber || ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "customerDetails.panNumber",
                        e.target.value.toUpperCase(),
                      )
                    }
                    onBlur={formik.handleBlur}
                    readOnly={isViewOnly}
                    className={
                      getFieldClass("customerDetails.panNumber") + " uppercase"
                    }
                    placeholder="ABCDE1234F"
                  />
                  <ErrorMsg name="customerDetails.panNumber" formik={formik} />
                </div>
              </div>

              {/* Right Column: Mobile Number & Aadhar Number */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                      Mobile Numbers
                    </label>
                    <div className="space-y-2">
                      {formik.values.customerDetails.mobileNumbers.map(
                        (num, idx) => (
                          <div key={idx} className="flex-1">
                            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                              <input
                                type="text"
                                name={`customerDetails.mobileNumbers.${idx}`}
                                maxLength={10}
                                value={num}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^0-9]/g,
                                    "",
                                  );
                                  const newArr = [
                                    ...formik.values.customerDetails
                                      .mobileNumbers,
                                  ];
                                  newArr[idx] = val;
                                  formik.setFieldValue(
                                    "customerDetails.mobileNumbers",
                                    newArr,
                                  );
                                }}
                                onBlur={formik.handleBlur}
                                className={getFieldClass(
                                  `customerDetails.mobileNumbers.${idx}`,
                                )}
                                placeholder={
                                  idx === 0
                                    ? "Primary Mobile Member"
                                    : `Alternative Number ${idx}`
                                }
                                readOnly={isViewOnly}
                              />
                              {isViewOnly && num && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    setActiveContactMenu({
                                      number: num,
                                      name: formik.values.customerDetails
                                        .customerName,
                                      type: "Applicant",
                                      x: rect.left,
                                      y: rect.bottom,
                                    });
                                  }}
                                  className="p-2 text-primary hover:bg-blue-50 rounded-xl transition-all"
                                  title="Contact Actions"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                  </svg>
                                </button>
                              )}
                              {!isViewOnly && idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newArr =
                                      formik.values.customerDetails.mobileNumbers.filter(
                                        (_, i) => i !== idx,
                                      );
                                    formik.setFieldValue(
                                      "customerDetails.mobileNumbers",
                                      newArr,
                                    );
                                  }}
                                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <ErrorMsg
                              name={`customerDetails.mobileNumbers.${idx}`}
                              formik={formik}
                            />
                          </div>
                        ),
                      )}
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            formik.setFieldValue(
                              "customerDetails.mobileNumbers",
                              [
                                ...formik.values.customerDetails.mobileNumbers,
                                "",
                              ],
                            )
                          }
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors flex items-center gap-1.5"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add Contact Number
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    name="customerDetails.aadharNumber"
                    maxLength={12}
                    value={formik.values.customerDetails.aadharNumber || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length <= 12)
                        formik.setFieldValue(
                          "customerDetails.aadharNumber",
                          val,
                        );
                    }}
                    onBlur={formik.handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("customerDetails.aadharNumber")}
                    placeholder="12 digit number"
                  />
                  <ErrorMsg name="customerDetails.aadharNumber" formik={formik} />
                </div>
              </div>

              {/* Guarantor & Multi-Mobile Section */}
              <div className="md:col-span-2 space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Guarantor Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Guarantor Name
                    </label>
                    <input
                      type="text"
                      name="customerDetails.guarantorName"
                      value={formik.values.customerDetails.guarantorName || ""}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      readOnly={isViewOnly}
                      className={getFieldClass("customerDetails.guarantorName")}
                      placeholder="Enter Guarantor Name"
                    />
                    <ErrorMsg name="customerDetails.guarantorName" formik={formik} />
                  </div>

                  {/* Guarantor Mobile Numbers */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                      Guarantor Mobile Numbers
                    </label>
                    <div className="space-y-2">
                      {formik.values.customerDetails.guarantorMobileNumbers.map(
                        (num, idx) => (
                          <div key={idx} className="flex-1">
                            <div className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                              <input
                                type="text"
                                name={`customerDetails.guarantorMobileNumbers.${idx}`}
                                maxLength={10}
                                value={num}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^0-9]/g,
                                    "",
                                  );
                                  const newArr = [
                                    ...formik.values.customerDetails
                                      .guarantorMobileNumbers,
                                  ];
                                  newArr[idx] = val;
                                  formik.setFieldValue(
                                    "customerDetails.guarantorMobileNumbers",
                                    newArr,
                                  );
                                }}
                                onBlur={formik.handleBlur}
                                className={getFieldClass(
                                  `customerDetails.guarantorMobileNumbers.${idx}`,
                                )}
                                placeholder={
                                  idx === 0
                                    ? "Primary Guarantor Mobile"
                                    : `Alternative Number ${idx}`
                                }
                                readOnly={isViewOnly}
                              />
                              {isViewOnly && num && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    setActiveContactMenu({
                                      number: num,
                                      name: formik.values.customerDetails
                                        .guarantorName,
                                      type: "Guarantor",
                                      x: rect.left,
                                      y: rect.bottom,
                                    });
                                  }}
                                  className="p-2 text-primary hover:bg-blue-50 rounded-xl transition-all"
                                  title="Contact Actions"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                  </svg>
                                </button>
                              )}
                              {!isViewOnly && idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newArr =
                                      formik.values.customerDetails.guarantorMobileNumbers.filter(
                                        (_, i) => i !== idx,
                                      );
                                    formik.setFieldValue(
                                      "customerDetails.guarantorMobileNumbers",
                                      newArr,
                                    );
                                  }}
                                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <ErrorMsg
                              name={`customerDetails.guarantorMobileNumbers.${idx}`}
                              formik={formik}
                            />
                          </div>
                        ),
                      )}
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            formik.setFieldValue(
                              "customerDetails.guarantorMobileNumbers",
                              [
                                ...formik.values.customerDetails
                                  .guarantorMobileNumbers,
                                "",
                              ],
                            )
                          }
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors flex items-center gap-1.5"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add Guarantor Contact
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-primary/10 pb-2 mb-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                Loan Terms (monthly)
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

            <DisbursementList disbursements={formik.values.loanTerms.disbursement} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Principal Summary */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Principal Amount
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 flex justify-between items-center group shadow-sm">
                  <span>₹{(parseFloat(formik.values.loanTerms.principalAmount) || 0).toLocaleString("en-IN")}</span>
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
                  name="loanTerms.processingFeeRate"
                  value={formik.values.loanTerms.processingFeeRate || ""}
                  onChange={(e) =>
                    handleProcessingFeeRateChange(e.target.value)
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanTerms.processingFeeRate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Processing Fee
                </label>
                <input
                  type="number"
                  name="loanTerms.processingFee"
                  value={formik.values.loanTerms.processingFee || ""}
                  onChange={(e) => handleProcessingFeeChange(e.target.value)}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={
                    getFieldClass("loanTerms.processingFee") +
                    (isViewOnly ? " bg-slate-100 italic" : "")
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  name="loanTerms.tenureMonths"
                  value={formik.values.loanTerms.tenureMonths || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanTerms.tenureMonths")}
                />
                <ErrorMsg name="loanTerms.tenureMonths" formik={formik} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="loanTerms.annualInterestRate"
                  value={formik.values.loanTerms.annualInterestRate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanTerms.annualInterestRate")}
                />
                <ErrorMsg name="loanTerms.annualInterestRate" formik={formik} />
              </div>

            </div>
          </div>

          {/* Dates & EMI */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Dates & EMI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Date Loan Disbursed
                </label>
                <input
                  type="date"
                  name="loanTerms.dateLoanDisbursed"
                  value={formik.values.loanTerms.dateLoanDisbursed || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanTerms.dateLoanDisbursed")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  EMI Start Date
                </label>
                <input
                  type="date"
                  name="loanTerms.emiStartDate"
                  value={formik.values.loanTerms.emiStartDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanTerms.emiStartDate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  EMI End Date
                </label>
                <input
                  type="date"
                  name="loanTerms.emiEndDate"
                  value={formik.values.loanTerms.emiEndDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanTerms.emiEndDate")}
                />
              </div>
              <div className="md:col-span-3">
                {/* MOBILE VIEW SUMMARY */}
                <div className="md:hidden space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Monthly EMI */}
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">
                        Monthly EMI
                      </span>
                      <p className="text-lg font-black text-primary">
                        ₹{formik.values.loanTerms.monthlyEMI || 0}
                      </p>
                    </div>
                    {/* Total Collected */}
                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                        Collected
                      </span>
                      <p className="text-lg font-black text-emerald-600">
                        ₹{totalCollectedAmount || 0}
                      </p>
                    </div>
                    {/* Total Expenses */}
                    <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-1">
                        Expenses
                      </span>
                      <p className="text-lg font-black text-orange-600">
                        ₹{totalExpenses.toLocaleString("en-IN") || 0}
                      </p>
                    </div>
                    {/* Total Interest */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Total Interest
                      </span>
                      <p className="text-lg font-black text-slate-700">
                        ₹{formik.values.loanTerms.totalInterestAmount || 0}
                      </p>
                    </div>
                  </div>
                  {/* Remaining Principal */}
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center group active:scale-[0.98] transition-all">
                    <div>
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
                        Remaining Principal Amount
                      </span>
                      <p className="text-xl font-black text-primary">
                        ₹{remainingPrincipalAmount || 0}
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

                {/* DESKTOP VIEW SUMMARY */}
                <div className="hidden md:flex bg-primary/5 p-4 rounded-2xl border border-primary/10 justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Monthly EMI
                    </span>
                    <p className="text-xl font-black text-primary">
                      ₹{formik.values.loanTerms.monthlyEMI || 0}
                    </p>
                  </div>
                  <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Total Collected Amount
                    </span>
                    <p className="text-xl font-black text-emerald-600">
                      ₹{totalCollectedAmount || 0}
                    </p>
                  </div>
                  <div className="text-center px-4 py-2 bg-orange-50 rounded-xl border border-orange-100 flex flex-col justify-center items-center">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                      Total Expenses
                    </span>
                    <p className="text-xl font-black text-orange-600">
                      ₹{totalExpenses.toLocaleString("en-IN") || 0}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        Total Interest Amount
                      </label>
                      <input
                        type="number"
                        name="loanTerms.totalInterestAmount"
                        value={
                          formik.values.loanTerms.totalInterestAmount || ""
                        }
                        readOnly
                        className="bg-transparent border-b border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary text-right w-32"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex flex-col items-end">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
                        Remaining Principal Amount
                      </label>
                      <input
                        type="text"
                        value={`₹${remainingPrincipalAmount || 0}`}
                        readOnly
                        className="bg-transparent border-b border-primary/20 text-sm font-black text-primary focus:outline-none text-right w-40"
                        placeholder="₹0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Vehicle Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  name="vehicleInformation.vehicleNumber"
                  value={formik.values.vehicleInformation.vehicleNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "vehicleInformation.vehicleNumber",
                      formatVehicleNumber(e.target.value),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={
                    getFieldClass("vehicleInformation.vehicleNumber") +
                    " uppercase"
                  }
                  placeholder="KA-01-AB-1234"
                />
                <ErrorMsg name="vehicleInformation.vehicleNumber" formik={formik} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Chassis Number
                </label>
                <input
                  type="text"
                  name="vehicleInformation.chassisNumber"
                  value={formik.values.vehicleInformation.chassisNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "vehicleInformation.chassisNumber",
                      e.target.value.toUpperCase(),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={
                    getFieldClass("vehicleInformation.chassisNumber") +
                    " uppercase"
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Engine Number
                </label>
                <input
                  type="text"
                  name="vehicleInformation.engineNumber"
                  value={formik.values.vehicleInformation.engineNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "vehicleInformation.engineNumber",
                      e.target.value.toUpperCase(),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={
                    getFieldClass("vehicleInformation.engineNumber") +
                    " uppercase"
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Model Year
                </label>
                <input
                  type="text"
                  name="vehicleInformation.modelYear"
                  value={formik.values.vehicleInformation.modelYear || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    formik.setFieldValue("vehicleInformation.modelYear", val);
                  }}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleInformation.modelYear")}
                  placeholder="e.g. 2024"
                />
                <ErrorMsg name="vehicleInformation.modelYear" formik={formik} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Type of Vehicle
                </label>
                <input
                  type="text"
                  name="vehicleInformation.typeOfVehicle"
                  value={formik.values.vehicleInformation.typeOfVehicle || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleInformation.typeOfVehicle")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Board (Yellow/White)
                </label>
                <select
                  name="vehicleInformation.ywBoard"
                  value={formik.values.vehicleInformation.ywBoard || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isViewOnly}
                  className={getFieldClass("vehicleInformation.ywBoard")}
                >
                  <option value="Yellow">Yellow</option>
                  <option value="White">White</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dealer Name
                </label>
                <input
                  type="text"
                  name="vehicleInformation.dealerName"
                  value={formik.values.vehicleInformation.dealerName || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleInformation.dealerName")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dealer Number
                </label>
                <input
                  type="text"
                  name="vehicleInformation.dealerNumber"
                  value={formik.values.vehicleInformation.dealerNumber || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleInformation.dealerNumber")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  FC Date
                </label>
                <input
                  type="date"
                  name="vehicleInformation.fcDate"
                  value={formik.values.vehicleInformation.fcDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleInformation.fcDate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Insurance Date
                </label>
                <input
                  type="date"
                  name="vehicleInformation.insuranceDate"
                  value={formik.values.vehicleInformation.insuranceDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleInformation.insuranceDate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  HP Entry
                </label>
                <select
                  name="vehicleInformation.hpEntry"
                  value={formik.values.vehicleInformation.hpEntry || "Not done"}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isViewOnly}
                  className={getFieldClass("vehicleInformation.hpEntry")}
                >
                  <option value="Not done">Not done</option>
                  <option value="Applied">Applied</option>
                  <option value="Finished">Finished</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  RTO Work Pending
                </label>
                {!isViewOnly ? (
                  <div className="relative">
                    {/* Multi-select Dropdown Trigger */}
                    <div
                      onClick={() => setIsRtoDropdownOpen(!isRtoDropdownOpen)}
                      className={
                        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer flex justify-between items-center gap-2 min-h-[44px]"
                      }
                    >
                      <div className="flex flex-wrap gap-1 flex-1 items-center py-1">
                        {Array.isArray(
                          formik.values.vehicleInformation.rtoWorkPending,
                        ) &&
                          formik.values.vehicleInformation.rtoWorkPending.length >
                          0 ? (
                          formik.values.vehicleInformation.rtoWorkPending.map(
                            (item) => (
                              <span
                                key={item}
                                className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded-md border border-primary/10 animate-in fade-in zoom-in duration-200 flex items-center gap-1"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRtoCheckboxChange(item);
                                  }}
                                  className="hover:text-red-500 transition-colors p-0.5"
                                >
                                  <svg
                                    className="w-2.5 h-2.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="3"
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </span>
                            ),
                          )
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px]">
                            Select RTO Tasks...
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-auto">
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isRtoDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Dropdown Menu - Positioned UPWARDS to avoid clipping at the bottom of the card */}
                    {isRtoDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsRtoDropdownOpen(false)}
                        ></div>

                        <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ring-4 ring-slate-900/5">
                          <div className="flex justify-between items-center px-1 border-b border-slate-50 pb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Availability List
                            </span>
                            {Array.isArray(
                              formik.values.vehicleInformation.rtoWorkPending,
                            ) &&
                              formik.values.vehicleInformation.rtoWorkPending
                                .length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    formik.setFieldValue(
                                      "vehicleInformation.rtoWorkPending",
                                      [],
                                    );
                                  }}
                                  className="text-[9px] font-black text-red-400 uppercase hover:text-red-600 transition-colors"
                                >
                                  Clear All
                                </button>
                              )}
                          </div>

                          <div className="grid grid-cols-1 gap-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            {loadingOptions ? (
                              <div className="py-8 text-center">
                                <span className="text-xs italic text-slate-400">
                                  Loading Intelligence...
                                </span>
                              </div>
                            ) : (
                              rtoOptions.map((opt) => (
                                <label
                                  key={opt}
                                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all ${Array.isArray(
                                    formik.values.vehicleInformation
                                      .rtoWorkPending,
                                  ) &&
                                      formik.values.vehicleInformation.rtoWorkPending.includes(
                                        opt,
                                      )
                                      ? "bg-primary/5 border border-primary/10"
                                      : "hover:bg-slate-50 border border-transparent"
                                    }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${Array.isArray(
                                      formik.values.vehicleInformation
                                        .rtoWorkPending,
                                    ) &&
                                        formik.values.vehicleInformation.rtoWorkPending.includes(
                                          opt,
                                        )
                                        ? "bg-primary border-primary"
                                        : "bg-white border-slate-300 group-hover:border-primary"
                                      }`}
                                  >
                                    {Array.isArray(
                                      formik.values.vehicleInformation
                                        .rtoWorkPending,
                                    ) &&
                                      formik.values.vehicleInformation.rtoWorkPending.includes(
                                        opt,
                                      ) && (
                                        <svg
                                          className="w-3.5 h-3.5 text-white"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="4"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={
                                      Array.isArray(
                                        formik.values.vehicleInformation
                                          .rtoWorkPending,
                                      ) &&
                                      formik.values.vehicleInformation.rtoWorkPending.includes(
                                        opt,
                                      )
                                    }
                                    onChange={() =>
                                      handleRtoCheckboxChange(opt)
                                    }
                                  />
                                  <span
                                    className={`text-sm font-bold transition-colors ${Array.isArray(
                                      formik.values.vehicleInformation
                                        .rtoWorkPending,
                                    ) &&
                                        formik.values.vehicleInformation.rtoWorkPending.includes(
                                          opt,
                                        )
                                        ? "text-primary"
                                        : "text-slate-600 group-hover:text-primary"
                                      }`}
                                  >
                                    {opt}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Custom RTO Task Entry
                              </p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Task name..."
                                  className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
                                  value={customRto}
                                  onChange={(e) => setCustomRto(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAddCustomRto();
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddCustomRto();
                                  }}
                                  className="flex-shrink-0 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                >
                                  Add
                                </button>
                              </div>
                            </div>

                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setIsRtoDropdownOpen(false)}
                                className="w-full bg-primary text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1 border-b border-slate-100 pb-2">
                    {Array.isArray(
                      formik.values.vehicleInformation.rtoWorkPending,
                    ) &&
                      formik.values.vehicleInformation.rtoWorkPending.length >
                      0 ? (
                      formik.values.vehicleInformation.rtoWorkPending.map(
                        (item) => (
                          <span
                            key={item}
                            className="bg-slate-50 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-100"
                          >
                            {item}
                          </span>
                        ),
                      )
                    ) : (
                      <span className="text-sm italic text-slate-300 font-bold">
                        None
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ClientResponseSection
              clientResponse={formik.values.status.clientResponse}
              nextFollowUpDate={formik.values.status.nextFollowUpDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              nameResponse="status.clientResponse"
              nameDate="status.nextFollowUpDate"
              isViewOnly={isViewOnly}
              updatedBy={formik.values.status.updatedBy}
              updatedAt={formik.values.status.updatedAt}
            />
          </div>

          {renderExtraActions && (
            <div className="mt-4">{renderExtraActions()}</div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {isViewOnly ? (
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
              >
                Back to List
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting || (formik.submitCount > 0 && !formik.isValid)
                  }
                  className="w-full sm:w-auto bg-primary text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all order-1 sm:order-2"
                >
                  {submitting
                    ? "Processing..."
                    : initialData._id
                      ? "Commit Changes"
                      : "Create Profile"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Contact Action Menu Popover */}
      {activeContactMenu && (
        <div
          className="fixed inset-0 z-[200]"
          onClick={() => setActiveContactMenu(null)}
        >
          <div
            className="absolute bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[160px] animate-scale-up"
            style={{
              top: activeContactMenu.y,
              left: Math.min(activeContactMenu.x, window.innerWidth - 180),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-50 mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {activeContactMenu.type}
              </p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {!activeContactMenu.name || activeContactMenu.name === "N/A"
                  ? "-"
                  : activeContactMenu.name}
              </p>
              <p className="text-[10px] font-medium text-slate-500">
                {activeContactMenu.number}
              </p>
            </div>

            <a
              href={`https://wa.me/91${activeContactMenu.number.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setActiveContactMenu(null)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.445 0 .081 5.363.079 11.969c0 2.112.551 4.173 1.594 5.973L0 24l6.163-1.617a11.83 11.83 0 005.883 1.586h.005c6.604 0 11.967-5.363 11.969-11.969a11.85 11.85 0 00-3.41-8.462" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">
                WhatsApp
              </span>
            </a>

            <a
              href={`tel:${activeContactMenu.number}`}
              onClick={() => setActiveContactMenu(null)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">
                Call Now
              </span>
            </a>

            <a
              href={`sms:${activeContactMenu.number}`}
              onClick={() => setActiveContactMenu(null)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 text-orange-600 transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">
                Send SMS
              </span>
            </a>
          </div>
        </div>
      )}

      <DisbursementModal
        isOpen={isDisbursementModalOpen}
        onClose={() => setIsDisbursementModalOpen(false)}
        initialData={formik.values.loanTerms.disbursement}
        onApply={handleDisbursementApply}
      />
    </div>
  );
};

export default LoanForm;
