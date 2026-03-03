import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Truck, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CategoryDropdown from "@/components/CategoryDropdown";
import { usePageTitle } from "@/components/SEO";
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
