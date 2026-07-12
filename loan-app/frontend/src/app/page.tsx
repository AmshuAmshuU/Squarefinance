import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import WhyUs from "@/components/sections/WhyUs";
import HowItWorks from "@/components/sections/HowItWorks";
import About from "@/components/sections/About";
import Testimonials from "@/components/sections/Testimonials";
import ContactForm from "@/components/sections/ContactForm";
import Footer from "@/components/sections/Footer";
import FloatingWhatsApp from "@/components/ui/FloatingWhatsApp";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      
      {/* Sections with unique IDs for smooth scroll */}
      <Hero />
      <Services />
      <WhyUs />
      <HowItWorks />
      <About />
      <Testimonials />
      <ContactForm />
      
      <Footer />
      <FloatingWhatsApp />
    </main>
  );
}
