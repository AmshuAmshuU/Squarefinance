"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  forgotPassword,
  resetPassword,
} from "../../../../services/auth.service";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Email, 2: OTP/New Password
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120); // 120 seconds for 2 minutes
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault(); // Only prevent default if event object exists (i.e., from form submission)
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep(2);
      setTimer(120);
      setCanResend(false);
      setMessage("OTP has been sent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (timer === 0 && !canResend) {
      // Check if timer is 0 and resend was not clicked
      setError("OTP has expired. Please request a new one.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      setMessage("Password reset successful. Redirecting...");
      setTimeout(() => router.push("/admin/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

      <div className="relative z-10 w-full max-w-md px-4 py-12 animate-fade-in">
        <div className="glass backdrop-blur-2xl bg-white/95 border border-white/20 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 transition-all">
          <div className="mb-10 text-center flex flex-col items-center">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Reset Password
            </h1>
            <p className="text-slate-500 mt-3 text-sm font-semibold tracking-wide">
              Follow authorization steps to regain access
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          {message && (
            <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {message}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-[0.15em] ml-1">
                  Registered Registry Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-bold"
                  placeholder="e.g. administrator@sf.com"
                  required
                  suppressHydrationWarning
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden"
                suppressHydrationWarning
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all group-hover:scale-105 active:scale-95 duration-300"></div>
                <div className="relative py-4 w-full flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/25">
                  {loading ? "Transmitting..." : "Send Secure OTP"}
                </div>
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-[0.15em] ml-1">
                  6-Digit Auth Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-800 tracking-[0.5em] text-center"
                  placeholder="000000"
                  required
                  maxLength={6}
                  suppressHydrationWarning
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-[0.15em] ml-1">
                  New Secure Credentials
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-800"
                  placeholder="••••••••"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${timer < 30 ? "bg-red-50 text-red-500 animate-pulse border border-red-100" : "bg-slate-50 text-slate-500 border border-slate-100"}`}
                >
                  {timer > 0
                    ? `Authentication Window: ${formatTime(timer)}`
                    : "Auth Window Closed"}
                </div>

                {canResend && (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-[10px] font-black text-blue-600 uppercase hover:underline tracking-widest bg-blue-50 px-4 py-2 rounded-xl transition-all"
                    disabled={loading}
                    suppressHydrationWarning
                  >
                    {loading ? "Retransmitting..." : "Resend Security Code"}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || timer === 0}
                className={`w-full relative group overflow-hidden ${loading || timer === 0 ? "opacity-50 grayscale" : ""}`}
                suppressHydrationWarning
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 transition-all group-hover:scale-105 active:scale-95 duration-300"></div>
                <div className="relative py-4 w-full flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/25">
                  {loading ? "Re-Authorizing..." : "Update Credentials"}
                </div>
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-slate-100 pt-8">
            <button
              onClick={() => router.push("/admin/login")}
              className="group flex items-center justify-center gap-2 mx-auto text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]"
              suppressHydrationWarning
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Registry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
