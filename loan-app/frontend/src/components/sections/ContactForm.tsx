"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MapPin, Clock, MessageSquare, CheckCircle2, ChevronDown } from "lucide-react";

type FormData = {
  fullName: string;
  phoneNumber: string;
  loanType: string;
  message: string;
};

const ContactForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const response = await fetch(`${apiBaseUrl}/api/contact/inquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send inquiry");
      }

      setIsSubmitted(true);
      reset();
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Something went wrong. Please try again or chat with us on WhatsApp.");
    }
  };

  return (
    <section id="contact" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Side - Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-3xl sm:text-5xl font-black text-navy uppercase tracking-tighter mb-6 leading-tight">
              Get in Touch <br className="hidden sm:block" /><span className="text-accent-red">With Us</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-lg mb-12 max-w-xl mx-auto lg:mx-0">
              Interested in a vehicle loan? Fill out the form and our team will reach out within 24 hours.
            </p>

            <div className="space-y-8 sm:space-y-10 text-left max-w-md mx-auto lg:mx-0">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-navy shrink-0 border border-slate-100">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Call Us</div>
                  <div className="text-lg sm:text-xl font-black text-navy tracking-tight whitespace-nowrap">+91 99009 00007</div>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-navy shrink-0 border border-slate-100">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Our Office</div>
                  <div className="text-sm sm:text-base font-bold text-slate-600 leading-relaxed max-w-sm">
                    No.1, 17/4, Ground Floor, 5th Main, 5th Cross, Kathriguppe, BSK 3rd Stage, Bengaluru – 560 085
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-navy shrink-0 border border-slate-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Hours</div>
                  <div className="text-sm sm:text-base font-bold text-slate-600">Mon–Sat, 9:00 AM – 6:00 PM</div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <a
                href="https://wa.me/919900900007"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#25d366] text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-100 hover:scale-105 active:scale-95 transition-all"
              >
                <MessageSquare className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 p-8 sm:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1">Full Name</label>
                <input
                  {...register("fullName", { required: "Full Name is required" })}
                  className={`w-full bg-white border-2 px-6 py-4 rounded-2xl outline-none transition-all font-bold text-slate-700 ${errors.fullName ? "border-red-500" : "border-transparent focus:border-navy"}`}
                  placeholder="John Doe"
                  suppressHydrationWarning
                />
                {errors.fullName && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.fullName.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1">Phone Number</label>
                <input
                  {...register("phoneNumber", { 
                    required: "Phone number is required",
                    pattern: { value: /^[6-9]\d{9}$/, message: "Please enter a valid 10-digit Indian number" }
                  })}
                  className={`w-full bg-white border-2 px-6 py-4 rounded-2xl outline-none transition-all font-bold text-slate-700 ${errors.phoneNumber ? "border-red-500" : "border-transparent focus:border-navy"}`}
                  placeholder="98765 43210"
                  suppressHydrationWarning
                />
                {errors.phoneNumber && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.phoneNumber.message}</p>}
              </div>

              {/* Loan Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1">Loan Type</label>
                <div className="relative">
                  <select
                    {...register("loanType", { required: "Please select a loan type" })}
                    className={`w-full bg-white border-2 px-6 py-4 rounded-2xl outline-none appearance-none transition-all font-bold text-slate-700 ${errors.loanType ? "border-red-500" : "border-transparent focus:border-navy"}`}
                    suppressHydrationWarning
                  >
                    <option value="">Select Loan Type</option>
                    <option value="Car Loan">Car Loan</option>
                    <option value="Auto-Rickshaw Loan">Auto-Rickshaw Loan</option>
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                {errors.loanType && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.loanType.message}</p>}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy uppercase tracking-widest block ml-1">Message</label>
                <textarea
                  {...register("message")}
                  rows={4}
                  className="w-full bg-white border-2 border-transparent focus:border-navy px-6 py-4 rounded-2xl outline-none transition-all font-bold text-slate-700 resize-none"
                  placeholder="Tell us about the vehicle and your requirement..."
                ></textarea>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent-red text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-100 hover:bg-[#7a322e] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                suppressHydrationWarning
              >
                {isSubmitting ? "Sending..." : "Send Enquiry"}
              </button>

              <AnimatePresence>
                {isSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-green-500 text-white p-4 rounded-xl"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-black uppercase tracking-widest">Enquiry Sent! We&apos;ll contact you within 24 hours.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
