"use client";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-navy">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(38,70,122,0.4)_0%,_transparent_70%)] opacity-30"></div>
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">
          {/* Content Column */}
          <div className="w-full lg:w-1/2 text-center lg:text-left flex flex-col items-center lg:items-start pt-10 lg:pt-0">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white/80 uppercase tracking-[0.3em] mb-6 border border-white/10">
                Trusted in Bengaluru
              </span>
              <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] lg:leading-[1.05] tracking-tight uppercase mb-8">
                Fast & Reliable <span className="text-white/60">Vehicle Loans</span> in Bengaluru.
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-medium leading-relaxed max-w-2xl mb-10 mx-auto lg:mx-0">
                Square Finance specializes in Car and Auto-Rickshaw commercial vehicle loans — quick approvals, minimal paperwork, and complete transparency.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8 lg:mb-16">
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 bg-white text-navy px-8 py-4 rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-2xl transition-all hover:scale-105 active:scale-95 group"
                >
                  Enquire Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#services"
                  className="inline-flex items-center bg-navy border border-white/20 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all hover:bg-white/5"
                >
                  Our Services
                </a>
              </div>
            </motion.div>
          </div>

          {/* Image Column */}
          <div className="hidden lg:block lg:w-1/2 h-64 sm:h-80 lg:h-[600px] relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative w-full h-full flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-navy via-transparent to-transparent z-10 hidden lg:block w-32"></div>
              <img 
                src="/assets/hero-vehicles.png" 
                alt="Square Finance - Car, Bike, and Auto Loans" 
                className="w-full h-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
                style={{ 
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                }}
              />
              <div className="absolute top-1/4 -right-10 w-48 h-48 bg-accent-red/10 rounded-full blur-[80px] animate-pulse"></div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
