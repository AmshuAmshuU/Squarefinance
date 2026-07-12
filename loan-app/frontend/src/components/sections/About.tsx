"use client";
import { motion } from "framer-motion";

const About = () => {
  const stats = [
    { label: "Vehicle Types We Finance", value: "Cars & Autos" },
    { label: "Approval Process", value: "Fast" },
    { label: "Bengaluru Location", value: "BSK 3rd Stage" },
    { label: "Transparent Process", value: "100%" },
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >
            <span className="text-accent-red text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] mb-4 block">Who We Are</span>
            <h2 className="text-2xl sm:text-5xl font-black text-navy uppercase tracking-tighter leading-[1.1] mb-8">
              Bengaluru&apos;s Trusted <br className="hidden sm:block" />Vehicle Loan Partner
            </h2>
            <div className="space-y-6 text-slate-500 font-medium text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
              <p>
                Square Finance is a Bengaluru-based vehicle loan company located in Kathriguppe, BSK 3rd Stage. We specialize exclusively in Car and Auto-Rickshaw commercial vehicle financing.
              </p>
              <p>
                Helping drivers, owners, and fleet operators get the vehicles they need with fast approvals, fair rates, and genuine personal service. We understand the local market and committed to supporting the transport community of Bengaluru.
              </p>
            </div>
            <div className="pt-10">
              <a
                href="#contact"
                className="inline-flex items-center gap-3 bg-navy text-white px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a325a] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-100"
              >
                Get in Touch
              </a>
            </div>
          </motion.div>

          {/* Right - Stat Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
            {/* Background decorative square */}
            <div className="absolute inset-0 bg-slate-50 border border-slate-100/50 rounded-[4rem] -rotate-6 scale-110 z-0"></div>
            
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`relative z-10 p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-lg flex flex-col items-center justify-center text-center transition-all duration-500 hover:rotate-2 ${
                  idx % 3 === 0 ? "bg-navy text-white" : "bg-white text-navy"
                }`}
              >
                <div className="text-xl sm:text-2xl font-black mb-2 uppercase tracking-tight leading-none">{stat.value}</div>
                <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${idx % 3 === 0 ? "text-slate-400" : "text-slate-500"}`}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
