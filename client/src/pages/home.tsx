import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Truck, Headset, Zap, Cpu, MousePointer2, HelpCircle, CheckCircle2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CategoryDropdown from "@/components/CategoryDropdown";
import { usePageTitle, ItemListJsonLd } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";
import heroBgImg from "@/assets/images/hero-bg.png";

export default function Home() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
  });

  usePageTitle();
  const catMap = new Map(categories.map(c => [c.id, c]));
  const latestProducts = [...products].reverse().slice(0, 10);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <ItemListJsonLd products={latestProducts} />

      <div className="sticky top-20 z-40 border-b border-white/10 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 gap-4">
            <CategoryDropdown />
            <div className="h-5 w-px bg-white/10 flex-shrink-0"></div>
            <Link href="/blog" className="text-sm font-display tracking-wider text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">BLOG</Link>
            <Link href="/contact" className="text-sm font-display tracking-wider text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">CONTACT</Link>
            <Link href="/returns" className="text-sm font-display tracking-wider text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">RETURNS</Link>
          </div>
        </div>
      </div>

      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBgImg} alt="PC Background" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
        </div>
        <div className="container relative z-10 px-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              UK PC Components &amp; Hardware
            </div>
            <h2 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-6 leading-tight">
              PC COMPONENTS <br/><span className="tech-gradient-text">FOR EVERY BUILD</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl border-l-2 border-primary/50 pl-4">
              CPUs, GPUs, motherboards, RAM, storage, PSUs, cases and cooling — everything you need to build, upgrade, or repair your PC. All with UK warranty and 1-3 day delivery.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#products">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-display tracking-wider rounded-none px-8">BROWSE COMPONENTS</Button>
              </a>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/20 font-display tracking-wider rounded-none px-8">GET IN TOUCH</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {latestProducts.length > 0 && (
        <section id="products" className="py-20">
          <div className="container px-4 mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl font-display font-bold mb-2">LATEST <span className="text-primary">PRODUCTS</span></h2>
                <div className="h-1 w-20 bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
              {latestProducts.map((product) => (
                <ProductCard key={product.id} product={product} category={catMap.get(product.categoryId ?? 0)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Categories Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">POPULAR <span className="text-primary">CATEGORIES</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the perfect components for your next build. We stock a wide range of high-performance hardware from leading brands, ensuring reliability and performance for every PC enthusiast in the UK.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.slice(0, 8).map((cat) => (
              <Link key={cat.id} href={`/category/${cat.slug}`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer group overflow-hidden h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Cpu className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Browse Selection</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Thorn Tech - Content Expansion Section */}
      <section className="py-24 border-t border-white/5">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-display font-bold mb-8 leading-tight">
                WHY CHOOSE <br/><span className="text-primary">THORN TECH SOLUTIONS?</span>
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                  At Thorn Tech Solutions, we are passionate about high-performance computing. Whether you are building your first gaming rig, upgrading a professional workstation, or maintaining an enterprise server, we provide the premium PC components and expert advice you need to succeed. Our mission is to be the UK's most reliable source for gaming PC parts and hardware.
                </p>
                <p>
                  The PC hardware market is constantly evolving, with new generations of CPUs and GPUs pushing the boundaries of what's possible. We stay at the forefront of these technological advancements, ensuring that our inventory includes the latest releases from industry leaders like NVIDIA, AMD, and Intel. Every component we sell is backed by a full UK warranty, giving you peace of mind with every purchase.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-foreground">Verified Hardware</h4>
                      <p className="text-sm">We only stock genuine components from authorized distributors.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-foreground">Fast UK Delivery</h4>
                      <p className="text-sm">Standard 1-3 day shipping on all in-stock items across the UK.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-foreground">Expert Support</h4>
                      <p className="text-sm">Our UK-based technical team is ready to help with your build.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-foreground">Competitive Pricing</h4>
                      <p className="text-sm">We monitor market prices daily to ensure you get the best value.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 p-8 lg:p-12 rounded-2xl relative">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
              <h3 className="text-2xl font-display font-bold mb-6">Expertise in Every Build</h3>
              <p className="text-muted-foreground mb-6">
                Building a PC is more than just clicking parts together—it's about synergy. A high-end GPU needs a powerful CPU and sufficient cooling to reach its full potential. Our curated selection of motherboards, power supplies, and storage options are chosen to ensure maximum compatibility and performance. 
              </p>
              <p className="text-muted-foreground mb-8">
                From ultra-fast NVMe SSDs that reduce load times to high-frequency DDR5 RAM for seamless multitasking, we provide the building blocks for excellence. Our commitment to the UK gaming community means we prioritize stock of the most sought-after gaming PC parts, even during high-demand periods.
              </p>
              <Link href="/contact">
                <Button className="w-full sm:w-auto" variant="outline">Learn More About Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/20">
        <div className="container px-4 mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">FREQUENTLY ASKED <span className="text-primary">QUESTIONS</span></h2>
            <p className="text-muted-foreground">Everything you need to know about buying PC components from Thorn Tech Solutions.</p>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 bg-background px-6 rounded-lg">
              <AccordionTrigger className="hover:no-underline font-bold py-6">Do all components come with a warranty?</AccordionTrigger>
              <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                Yes, absolutely. Every product sold by Thorn Tech Solutions is brand new and comes with a full UK manufacturer's warranty. The length of the warranty depends on the specific component, ranging from 1 year to limited lifetime warranties for certain RAM and PSU models. In the unlikely event of a hardware failure, our UK-based team will assist you with the RMA process.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border border-white/10 bg-background px-6 rounded-lg">
              <AccordionTrigger className="hover:no-underline font-bold py-6">How long does UK delivery take?</AccordionTrigger>
              <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                We pride ourselves on rapid fulfillment. Orders for in-stock items placed before 2 PM are typically dispatched the same day. Our standard UK delivery takes 1-3 working days. We use tracked and insured couriers to ensure your sensitive PC hardware arrives safely and in perfect condition.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border border-white/10 bg-background px-6 rounded-lg">
              <AccordionTrigger className="hover:no-underline font-bold py-6">Can you help me choose the right parts for my build?</AccordionTrigger>
              <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                Of course! Our team consists of hardware enthusiasts who love talking tech. If you're unsure about compatibility (e.g., whether a CPU cooler will fit in your chosen case, or if your motherboard supports the latest PCIe generation), please get in touch via our contact page. We can review your parts list and provide suggestions based on your budget and performance requirements.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border border-white/10 bg-background px-6 rounded-lg">
              <AccordionTrigger className="hover:no-underline font-bold py-6">What is your returns policy?</AccordionTrigger>
              <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                We offer a 14-day return period for most items, provided they are in their original, unopened packaging. For faulty items, we provide a full testing and replacement service under the manufacturer's warranty. Please visit our dedicated Returns page for full details on the process and any specific exclusions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border border-white/10 bg-background px-6 rounded-lg">
              <AccordionTrigger className="hover:no-underline font-bold py-6">Do you offer discounts for bulk or business orders?</AccordionTrigger>
              <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                Yes, we support businesses, educational institutions, and system integrators. If you are looking to purchase PC components in volume, please contact our sales team directly to discuss bulk pricing and specialized account management.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="container px-4 mx-auto relative z-10 text-center">
          <h2 className="text-4xl font-display font-black mb-6">READY TO START YOUR BUILD?</h2>
          <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
            Browse our extensive catalog of high-quality PC hardware and experience the difference of shopping with UK's dedicated PC component specialists.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#products">
              <Button size="lg" variant="secondary" className="font-display tracking-widest px-10 h-14 rounded-none">SHOP ALL HARDWARE</Button>
            </a>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-display tracking-widest px-10 h-14 rounded-none">TALK TO AN EXPERT</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-b border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">UK Warranty</h4>
              <p className="text-sm text-muted-foreground max-w-xs">All components come with full UK manufacturer warranties.</p>
            </div>
            <div className="flex flex-col items-center">
              <Truck className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">1-3 Day Delivery</h4>
              <p className="text-sm text-muted-foreground max-w-xs">Free delivery on orders over £200. Securely packaged.</p>
            </div>
            <div className="flex flex-col items-center">
              <Headset className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">UK Based Support</h4>
              <p className="text-sm text-muted-foreground max-w-xs">Friendly help from our team, Monday to Friday.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
