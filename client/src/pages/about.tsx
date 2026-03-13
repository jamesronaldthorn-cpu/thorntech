import { Link } from "wouter";
import { ShieldCheck, Truck, Headset, Award, MapPin, Phone, Mail, Building2, CheckCircle2 } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/components/SEO";

export default function AboutPage() {
  usePageTitle("About Us | UK PC Components Store", "About Thorn Tech Solutions Ltd — a UK-based online PC components store based in Sutton Bridge, Lincolnshire. Company registration 17058756. Selling CPUs, GPUs, motherboards, RAM, and more with fast UK delivery.");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8" data-testid="text-about-title">
          ABOUT <span className="text-primary">THORN TECH SOLUTIONS</span>
        </h1>

        <div className="space-y-8">
          <section className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-display font-bold mb-4">Who We Are</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Thorn Tech Solutions Ltd is a UK-based online computer hardware store specialising in high-performance PC components.
              Based in Sutton Bridge, Lincolnshire, we supply CPUs, graphics cards, motherboards, RAM, SSDs, power supplies,
              cooling solutions, and accessories from all the leading brands including AMD, Intel, NVIDIA, ASUS, MSI, Gigabyte,
              Corsair, and more.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Whether you are building a gaming PC, upgrading your workstation, or need replacement parts for your computer,
              we offer competitive UK prices with fast delivery straight to your door. Our goal is to make buying PC components
              online simple, affordable, and reliable.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              As a registered UK company (Company Registration Number: 17058756), we are committed to providing excellent
              customer service, genuine products, and full manufacturer warranties on everything we sell. All prices include
              VAT, and we offer free delivery on orders over £200.
            </p>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-display font-bold mb-6">Why Buy PC Components From Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="text-primary shrink-0"><ShieldCheck className="w-8 h-8" /></div>
                <div>
                  <h3 className="font-bold mb-1">Genuine UK Stock</h3>
                  <p className="text-muted-foreground text-sm">All products are sourced from authorised UK distributors with full manufacturer warranty and support.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-primary shrink-0"><Truck className="w-8 h-8" /></div>
                <div>
                  <h3 className="font-bold mb-1">Fast UK Delivery</h3>
                  <p className="text-muted-foreground text-sm">1-3 working day delivery across the UK. Free shipping on all orders over £200.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-primary shrink-0"><Award className="w-8 h-8" /></div>
                <div>
                  <h3 className="font-bold mb-1">Competitive Prices</h3>
                  <p className="text-muted-foreground text-sm">We regularly check competitor prices to ensure you get the best deals on PC hardware in the UK.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-primary shrink-0"><Headset className="w-8 h-8" /></div>
                <div>
                  <h3 className="font-bold mb-1">Expert Support</h3>
                  <p className="text-muted-foreground text-sm">Our team of PC enthusiasts is here to help with product advice, compatibility questions, and order support.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-display font-bold mb-6">What We Sell</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We stock a wide range of PC components and computer hardware for every type of build:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Processors (AMD Ryzen, Intel Core)",
                "Graphics Cards (NVIDIA GeForce, AMD Radeon)",
                "Motherboards (ATX, Micro-ATX, Mini-ITX)",
                "Memory & RAM (DDR4, DDR5)",
                "Storage (NVMe SSDs, SATA SSDs, Hard Drives)",
                "Power Supplies (Modular, Semi-Modular)",
                "PC Cases (Tower, Mid-Tower, Mini-ITX)",
                "CPU Coolers & Case Fans",
                "Monitors & Displays",
                "Keyboards, Mice & Peripherals",
                "Networking Equipment",
                "Cables & Accessories"
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-display font-bold mb-6">Secure Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We accept all major payment methods through our secure checkout, powered by Stripe and PayPal.
              Your payment details are protected with industry-standard encryption. We accept Visa, Mastercard,
              American Express, and PayPal.
            </p>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-display font-bold mb-6">Company Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <span className="text-sm font-medium">Thorn Tech Solutions Ltd</span>
                  <span className="text-muted-foreground text-sm ml-2">— Company Reg: 17058756</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span className="text-muted-foreground text-sm">Sutton Bridge, Lincolnshire, United Kingdom</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <a href="tel:07868552028" className="text-primary hover:underline text-sm">07868 552028</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <a href="mailto:thorntech@hotmail.com" className="text-primary hover:underline text-sm">thorntech@hotmail.com</a>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/" className="bg-primary hover:bg-primary/80 text-white font-display tracking-wider px-6 py-3 rounded-lg transition-colors text-sm" data-testid="link-shop-now">
              SHOP PC COMPONENTS
            </Link>
            <Link href="/contact" className="border border-white/20 hover:bg-white/5 text-white font-display tracking-wider px-6 py-3 rounded-lg transition-colors text-sm" data-testid="link-contact-us">
              CONTACT US
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
