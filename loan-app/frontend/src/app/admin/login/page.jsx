"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../../services/auth.service";
import { useToast } from "../../../context/ToastContext";
import Logo from "../../../components/Logo";
import { User, Lock, Key, Mail, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password, accessKey);
      showToast("Welcome back! Authentication successful.", "success");
      router.push("/admin/dashboard");
    } catch (err) {
      showToast(err.message || "Authentication failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Removing old inline SVGs since we are using lucide-react

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div className="absolute top-[20%] right-[15%] w-[15%] h-[15%] bg-blue-400/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

      <div className="relative z-10 w-full max-w-md px-4 py-12 animate-fade-in">
        <div className="glass backdrop-blur-2xl bg-white/95 border border-white/20 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 transition-all hover:shadow-blue-500/10 hover:border-blue-500/20 group">
          <div className="mb-10 text-center flex flex-col items-center">
            <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-500">
              <Logo size="md" />
            </div>
            <div className="inline-block px-4 py-1.5 mb-5 text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase bg-blue-50/50 rounded-full border border-blue-100/50">
              Square Finance Security
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Internal Portal
            </h1>
            <p className="text-slate-500 mt-3 text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Secure Authentication Required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-[0.15em] ml-1">
                Registry Email
              </label>
              <div className="relative group/input">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-bold"
                  placeholder="e.g. administrator@sf.com"
                  required
                  suppressHydrationWarning
                />
                <div className="absolute inset-y-0 right-4 flex items-center text-slate-400 group-focus-within/input:text-primary transition-colors duration-300 pointer-events-none">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/admin/login/forgot-password")}
                  className="text-[9px] font-black text-blue-600 uppercase hover:text-blue-800 transition-colors tracking-widest bg-blue-50 px-2 py-0.5 rounded"
                  suppressHydrationWarning
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group/input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300"
                  placeholder="••••••••"
                  required
                  suppressHydrationWarning
                />
                <div className="absolute inset-y-0 right-12 flex items-center text-slate-400 group-focus-within/input:text-primary transition-colors duration-300 pointer-events-none">
                  <Lock className="w-4 h-4 opacity-50" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-all p-1"
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-[0.15em] ml-1">
                Access Key
              </label>
              <div className="relative group/input">
                <input
                  type={showAccessKey ? "text" : "password"}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="w-full px-5 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-200"
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
                <div className="absolute inset-y-0 right-12 flex items-center text-slate-400 group-focus-within/input:text-primary transition-colors duration-300 pointer-events-none">
                  <Key className="w-4 h-4 opacity-50" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccessKey(!showAccessKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-all p-1"
                  suppressHydrationWarning
                >
                  {showAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group/btn overflow-hidden"
              suppressHydrationWarning
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-600 transition-all group-hover:scale-105 active:scale-95 duration-300"></div>
              <div className="relative py-4 w-full flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/10">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    Executing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">
              Square Finance <span className="text-slate-300">v4.0.2</span>
            </p>
            <p className="text-[9px] text-slate-300 mt-2 font-bold uppercase tracking-widest">
              Digital Assets Secured by IT Alliance Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
