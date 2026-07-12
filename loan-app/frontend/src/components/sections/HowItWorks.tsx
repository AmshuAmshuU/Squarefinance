"use client";
import { motion } from "framer-motion";
import { Phone, MessageSquare, Wallet } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Step 1 — Contact Us",
      description: "Reach out via our contact form, phone, or WhatsApp with your vehicle loan requirement.",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Step 2 — Consultation",
      description: "Our team reviews your requirement and calls you back to guide you through the process.",
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Step 3 — Disbursement",
      description: "Loan processed and funds disbursed directly to complete your vehicle purchase.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-navy relative overflow-hidden">
      {/* Decorative circle */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight"
          >
            Simple 3-Step Process
          </motion.h2>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-[44px] left-[15%] right-[15%] h-[2px] border-t-2 border-dashed border-white/20 z-0"></div>

          <div className="grid lg:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="text-center px-4"
              >
                <div className="w-20 h-20 bg-white shadow-2xl shadow-blue-900 mx-auto rounded-3xl flex items-center justify-center text-navy mb-8 relative">
                  {step.icon}
                  {/* Step indicator */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent-red rounded-full flex items-center justify-center text-white text-[10px] font-black tracking-widest leading-none ring-4 ring-navy">
                    {idx + 1}
                  </div>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mb-4">{step.title}</h3>
                <p className="text-slate-300 font-medium text-base leading-relaxed max-w-[280px] mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
