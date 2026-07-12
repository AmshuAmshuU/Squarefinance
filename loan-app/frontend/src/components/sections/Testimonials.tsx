"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const Testimonials = () => {
  const reviews = [
    {
      quote: "Got my auto-rickshaw loan approved quickly with very little paperwork. Square Finance made it so easy!",
      author: "Manjunath R.",
      role: "Auto Driver, Bengaluru",
    },
    {
      quote: "Transparent process, no hidden charges. My car loan was processed faster than I expected.",
      author: "Suresh K.",
      role: "Car Owner, BSK Stage",
    },
    {
      quote: "The bike loan process was incredibly smooth. I got my new vehicle within 2 days of applying!",
      author: "Rajesh M.",
      role: "Delivery Partner",
    },
    {
      quote: "Excellent service and support. They understood my commercial requirements perfectly.",
      author: "Lakshmi N.",
      role: "Small Business Owner",
    },
    {
      quote: "Very professional team. The documentation was minimal and the staff was very helpful.",
      author: "Anand V.",
      role: "Fleet Operator",
    },
    {
      quote: "Best rates for used car loans in Bangalore. Highly recommended for quick financing.",
      author: "Sandeep S.",
      role: "Private Owner",
    },
    {
      quote: "I've been a regular customer for years. Their trust and service are unmatched.",
      author: "Ravi J.",
      role: "Transport Operator",
    },
  ];

  // Double the reviews for seamless loop
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section className="py-24 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-4xl font-black text-navy uppercase tracking-tight"
          >
            Trusted by Bengaluru&apos;s Drivers
          </motion.h2>
        </div>
      </div>

      <div className="relative flex overflow-hidden">
        <motion.div
          className="flex gap-6 py-4"
          animate={{
            x: ["0%", "-50%"],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {duplicatedReviews.map((review, idx) => (
            <div
              key={idx}
              className="w-[300px] sm:w-[350px] shrink-0 bg-white p-6 rounded-[2.5rem] border-l-[4px] border-accent-red shadow-xl shadow-slate-200/40 flex flex-col justify-between transition-transform hover:scale-105 duration-300"
            >
              <div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent-red text-accent-red" />
                  ))}
                </div>
                <p className="text-sm font-bold text-slate-700 leading-relaxed italic mb-6">
                  &quot;{review.quote}&quot;
                </p>
              </div>
              <div>
                <div className="font-black text-navy uppercase tracking-widest text-[10px]">{review.author}</div>
                <div className="text-slate-400 font-bold text-[8px] uppercase tracking-widest mt-1">{review.role}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
