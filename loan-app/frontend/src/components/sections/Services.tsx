"use client";
import { motion } from "framer-motion";
import { Car, Truck, Bike, ArrowRight } from "lucide-react";

const Services = () => {
  const services = [
    {
      title: "Car Loans",
      description: "Finance your next car with competitive interest rates and flexible repayment options. We work with both new and used commercial cars.",
      icon: <Car className="w-12 h-12" />,
      highlight: false,
    },
    {
      title: "Auto-Rickshaw Loans",
      description: "Get your auto-rickshaw financed quickly. Ideal for daily earners and transport operators looking for easy EMI plans.",
      icon: <Truck className="w-12 h-12" />, // Used Truck for 3-wheeler/commercial feel
      highlight: true,
    },
    {
      title: "Bike Loans",
      description: "Own your dream bike with our fast and easy two-wheeler financing. Hassle-free documentation and quick approval process.",
      icon: <Bike className="w-12 h-12" />,
      highlight: false,
    },
  ];

  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-navy uppercase tracking-tight mb-4">Our Loan Services</h2>
            <p className="text-slate-500 font-medium text-lg">
              We specialize in commercial vehicle financing — built for drivers, owners, and fleet operators across Bengaluru.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {services.map((service, idx) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className={`relative p-10 rounded-3xl border-2 transition-all duration-300 hover:-translate-y-2 group ${
                service.highlight 
                  ? "bg-navy border-navy text-white shadow-2xl shadow-blue-200" 
                  : "bg-slate-50 border-slate-100 text-slate-900 hover:border-accent-red/30"
              }`}
            >
              <div className={`mb-8 p-4 rounded-2xl inline-block ${service.highlight ? "bg-white/10" : "bg-white shadow-sm text-navy"}`}>
                {service.icon}
              </div>
              <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight mb-4 leading-tight">{service.title}</h3>
              <p className={`text-base sm:text-lg font-medium leading-relaxed mb-8 ${service.highlight ? "text-slate-300" : "text-slate-500"}`}>
                {service.description}
              </p>
              <a
                href="#contact"
                className={`inline-flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] group/link ${
                  service.highlight ? "text-white" : "text-accent-red"
                }`}
              >
                Enquire About {service.title.split(' ')[0]} Loan
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1 shrink-0" />
              </a>
              {/* Red Accent Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 hidden group-hover:block bg-accent-red rounded-full transition-all"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
