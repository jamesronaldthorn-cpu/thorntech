import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Cpu, Monitor, HardDrive, Zap, ChevronRight,
  ShieldCheck, Truck, Headset,
  Fan, Box, Keyboard, CircuitBoard,
  MemoryStick, Cable, Mouse, Wifi, Speaker, Gamepad2, Disc, Server, MonitorSpeaker
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import type { Product, Category } from "@shared/schema";
import heroBgImg from "@/assets/images/hero-bg.png";

const iconMap: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-6 h-6 text-primary" />,
  Cpu: <Cpu className="w-6 h-6 text-primary" />,
  CircuitBoard: <CircuitBoard className="w-6 h-6 text-primary" />,
  Zap: <Zap className="w-6 h-6 text-primary" />,
  HardDrive: <HardDrive className="w-6 h-6 text-primary" />,
  Fan: <Fan className="w-6 h-6 text-primary" />,
  Box: <Box className="w-6 h-6 text-primary" />,
  Keyboard: <Keyboard className="w-6 h-6 text-primary" />,
  MemoryStick: <MemoryStick className="w-6 h-6 text-primary" />,
  Cable: <Cable className="w-6 h-6 text-primary" />,
  Mouse: <Mouse className="w-6 h-6 text-primary" />,
  Wifi: <Wifi className="w-6 h-6 text-primary" />,
  Speaker: <Speaker className="w-6 h-6 text-primary" />,
  Headset: <Headset className="w-6 h-6 text-primary" />,
  Gamepad2: <Gamepad2 className="w-6 h-6 text-primary" />,
  Disc: <Disc className="w-6 h-6 text-primary" />,
  Server: <Server className="w-6 h-6 text-primary" />,
  MonitorSpeaker: <MonitorSpeaker className="w-6 h-6 text-primary" />,
};

export default function Home() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
  });

  const catMap = new Map(categories.map(c => [c.id, c]));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />

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
              CPUs, GPUs, motherboards, RAM, storage, PSUs, cases and cooling — everything you need to build, upgrade, or repair your PC. All with UK warranty and fast DPD delivery.
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

      <section id="products" className="py-20 relative z-20 -mt-20">
        <div className="container px-4 mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">OUR <span className="text-primary">COMPONENTS</span></h2>
              <div className="h-1 w-20 bg-primary rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className="tech-border glass-panel p-4 rounded-lg group cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center" data-testid={`link-category-${cat.slug}`}>
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors mb-3">
                  {iconMap[cat.icon || ""] || <Box className="w-6 h-6 text-primary" />}
                </div>
                <h3 className="font-display font-bold text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
              </Link>
            ))}
          </div>
          {products.length > 0 && (
            <div className="mt-16">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-display font-bold mb-2">LATEST <span className="text-primary">PRODUCTS</span></h2>
                  <div className="h-1 w-20 bg-primary rounded-full"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} category={catMap.get(product.categoryId ?? 0)} />
                ))}
              </div>
            </div>
          )}
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
              <h4 className="font-display font-bold text-lg mb-2">Next Day DPD Delivery</h4>
              <p className="text-sm text-muted-foreground max-w-xs">Free next working day delivery on orders over £150. Securely packaged.</p>
            </div>
            <div className="flex flex-col items-center">
              <Headset className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">UK Based Support</h4>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
