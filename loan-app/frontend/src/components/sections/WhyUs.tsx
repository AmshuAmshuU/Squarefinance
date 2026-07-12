"use client";
import { motion } from "framer-motion";
import { Zap, FileText, Eye, Headphones } from "lucide-react";

const WhyUs = () => {
  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Quick Approvals",
      description: "Our process is designed to get your vehicle loan approved fast — without unnecessary delays.",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Minimal Paperwork",
      description: "We keep documentation simple and straightforward so you spend less time on forms and more time on the road.",
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "No Hidden Charges",
      description: "Clear terms, honest rates, and complete transparency throughout your loan journey.",
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: "Dedicated Support",
      description: "Our team personally guides every customer from enquiry to disbursement.",
    },
  ];

  return (
    <section id="why-us" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/3 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-5xl font-black text-navy uppercase tracking-tighter leading-tight mb-6">
                Why Choose <br className="hidden sm:block" /><span className="text-accent-red">Square Finance?</span>
              </h2>
              <p className="text-slate-500 font-medium text-sm sm:text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                We are committed to providing the best financing experience for commercial vehicle owners in Bengaluru.
              </p>
              <a
                href="#contact"
                className="inline-block bg-navy text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
              >
                Enquire Now
              </a>
            </motion.div>
          </div>

          <div className="lg:w-2/3 grid sm:grid-cols-2 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent-red shadow-sm mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-navy mb-3">{feature.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
