"use client";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-16 mb-20 text-center lg:text-left">
          {/* Column 1 - Brand */}
          <div className="flex flex-col items-center lg:items-start gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-white flex items-center justify-center rounded-sm bg-transparent">
                <span className="font-black text-white text-xl tracking-tighter">SF</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white uppercase tracking-tighter text-lg leading-none">Square Finance</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] leading-none mt-1">ಸ್ಕ್ವೇರ್ ಫೈನಾನ್ಸ್</span>
              </div>
            </Link>
            <p className="text-slate-400 font-medium text-base max-w-xs transition-colors hover:text-slate-300">
              Bengaluru&apos;s trusted vehicle loan partner specializing in Car and Auto-Rickshaw financing.
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div className="flex flex-col items-center lg:items-start">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-10 text-white/40">Quick Links</h4>
            <nav className="flex flex-col gap-5">
              {["Home", "Services", "Why Us", "How It Works", "Contact"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3 - Contact */}
          <div className="flex flex-col items-center lg:items-start">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-10 text-white/40">Contact Information</h4>
            <div className="space-y-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone</span>
                <span className="text-lg font-black tracking-tight">+91 99009 00007</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Address</span>
                <span className="text-sm font-bold text-slate-400 leading-relaxed max-w-[280px]">
                  No.1, 17/4, Ground Floor, 5th Main, 5th Cross, Kathriguppe, BSK 3rd Stage, Bengaluru – 560 085
                </span>
              </div>
              <div className="pt-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-default select-none">Admin Login</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            © {currentYear} Square Finance. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link href="/" className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/" className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-white transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
