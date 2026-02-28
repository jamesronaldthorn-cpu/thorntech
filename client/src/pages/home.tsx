import { useState } from "react";
import { Link } from "wouter";
import { 
  ShoppingBasket, 
  Menu, 
  Search, 
  Cpu, 
  Monitor, 
  HardDrive, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Truck,
  Headset,
  X,
  Plus,
  Minus,
  Server,
  Mouse,
  Box,
  Fan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

// Import generated assets
import logoImg from "@/assets/images/logo.png";
import heroBgImg from "@/assets/images/hero-bg.png";
import catGpuImg from "@/assets/images/cat-gpu.png";
import catCpuImg from "@/assets/images/cat-cpu.png";
// We'll use fallback images if these aren't generated yet, but they are requested
import catMoboImg from "@/assets/images/cat-mobo.png";
import catPeriphImg from "@/assets/images/cat-periph.png";
import catCaseImg from "@/assets/images/cat-case.png";
import catCoolingImg from "@/assets/images/cat-cooling.png";


// Mock Product Data - UK Pricing
const featuredProducts = [
  { id: 1, name: "Thorn RTX 4090 Ultra X", price: 1599.99, priceStr: "£1,599.99", category: "Graphics Cards", image: catGpuImg, badge: "New Release" },
  { id: 2, name: "Ryzen 9 7950X3D", price: 699.99, priceStr: "£699.99", category: "Processors", image: catCpuImg, badge: "Best Seller" },
  { id: 3, name: "Dominator Platinum 64GB DDR5", price: 249.99, priceStr: "£249.99", category: "Memory", image: catCpuImg, badge: "" },
  { id: 4, name: "NVMe 2TB Gen4 M.2", price: 159.99, priceStr: "£159.99", category: "Storage", image: catGpuImg, badge: "Sale" },
  { id: 5, name: "Z790 AORUS Master", price: 429.99, priceStr: "£429.99", category: "Motherboards", image: catMoboImg, badge: "" },
  { id: 6, name: "Thorn Pro Mechanical Keyboard", price: 129.99, priceStr: "£129.99", category: "Peripherals", image: catPeriphImg, badge: "Popular" },
  { id: 7, name: "O11 Dynamic EVO Case", price: 169.99, priceStr: "£169.99", category: "Cases", image: catCaseImg, badge: "" },
  { id: 8, name: "Kraken Elite 360 RGB", price: 259.99, priceStr: "£259.99", category: "Cooling", image: catCoolingImg, badge: "Low Stock" },
];

const categories = [
  { id: "gpus", name: "Graphics Cards", icon: <Monitor className="w-8 h-8 mb-4 text-primary" />, desc: "Unleash max frames" },
  { id: "cpus", name: "Processors", icon: <Cpu className="w-8 h-8 mb-4 text-primary" />, desc: "The brain of your rig" },
  { id: "motherboards", name: "Motherboards", icon: <Server className="w-8 h-8 mb-4 text-primary" />, desc: "The foundation" },
  { id: "memory", name: "Memory (RAM)", icon: <Zap className="w-8 h-8 mb-4 text-primary" />, desc: "Multitask seamlessly" },
  { id: "storage", name: "Storage", icon: <HardDrive className="w-8 h-8 mb-4 text-primary" />, desc: "Lightning fast loads" },
  { id: "cooling", name: "Cooling", icon: <Fan className="w-8 h-8 mb-4 text-primary" />, desc: "Keep temperatures low" },
  { id: "cases", name: "Cases", icon: <Box className="w-8 h-8 mb-4 text-primary" />, desc: "Showcase your build" },
  { id: "peripherals", name: "Peripherals", icon: <Mouse className="w-8 h-8 mb-4 text-primary" />, desc: "Precision control" },
];

export default function Home() {
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoImg} alt="Thorn Tech Solutions Logo" className="w-12 h-12 object-contain" />
              <div className="hidden md:block">
                <h1 className="font-display font-bold text-xl tracking-wider leading-none">THORN TECH</h1>
                <span className="text-xs text-primary uppercase tracking-[0.2em]">Solutions Ltd</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <Input 
              type="text" 
              placeholder="Search components, peripherals, and more..." 
              className="w-full bg-black/50 border-white/20 focus-visible:ring-primary pl-4 pr-10 h-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="w-5 h-5" />
            </Button>
            
            {/* Shopify Basket Drawer */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group" data-testid="button-cart">
                  <ShoppingBasket className="w-5 h-5 group-hover:text-primary transition-colors" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold flex items-center justify-center rounded-full">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md border-l border-white/10 bg-background/95 backdrop-blur-xl flex flex-col">
                <SheetHeader className="border-b border-white/10 pb-4">
                  <SheetTitle className="font-display tracking-wider text-left">YOUR BASKET</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                      <ShoppingBasket className="w-16 h-16 opacity-20" />
                      <p>Your basket is empty</p>
                      <Button variant="outline" onClick={() => setIsCartOpen(false)}>
                        Continue Shopping
                      </Button>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex gap-4 items-center">
                        <div className="w-20 h-20 bg-black/40 rounded border border-white/5 p-2 flex-shrink-0">
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                          <div className="text-primary font-display font-bold text-sm mb-2">{item.product.priceStr}</div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm w-4 text-center">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => updateQuantity(item.product.id, -item.quantity)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Subtotal</span>
                      <span className="font-display">£{cartTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">VAT included. Shipping calculated at checkout.</p>
                    <div className="grid gap-2">
                      <Button className="w-full font-display tracking-widest bg-primary hover:bg-primary/80 h-12 text-lg">
                        SECURE CHECKOUT
                      </Button>
                      <Button className="w-full bg-[#5A31F4] hover:bg-[#5A31F4]/90 text-white font-bold h-12 flex items-center justify-center gap-2">
                        <span className="text-xl tracking-tight">Shop</span> <span className="bg-white text-[#5A31F4] px-1 rounded text-sm">Pay</span>
                      </Button>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            <Button variant="outline" className="hidden sm:flex border-primary/50 hover:bg-primary/20 hover:text-white transition-all font-display tracking-widest">
              SIGN IN
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
        {/* UK Secondary Nav / Categories */}
        <div className="hidden md:flex bg-black/60 border-t border-white/5 px-4">
          <div className="container mx-auto flex items-center gap-6 h-10 text-sm text-muted-foreground font-medium overflow-x-auto whitespace-nowrap scrollbar-hide">
            <a href="#" className="hover:text-primary transition-colors">Special Offers</a>
            <a href="#" className="hover:text-primary transition-colors">Custom PCs</a>
            <a href="#" className="hover:text-primary transition-colors">Components</a>
            <a href="#" className="hover:text-primary transition-colors">Peripherals</a>
            <a href="#" className="hover:text-primary transition-colors">Monitors</a>
            <a href="#" className="hover:text-primary transition-colors">Networking</a>
            <a href="#" className="hover:text-primary transition-colors text-primary flex items-center gap-1">
              <Zap className="w-3 h-3" /> Next Day UK Delivery
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBgImg} alt="PC Background" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
        </div>
        
        <div className="container relative z-10 px-4 flex flex-col md:flex-row items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              UK's Premier PC Hardware Store
            </div>
            <h2 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-6 leading-tight">
              BUILD YOUR <br/>
              <span className="tech-gradient-text">ULTIMATE RIG</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-balance max-w-xl border-l-2 border-primary/50 pl-4">
              Premium PC components, bespoke water-cooled builds, and enthusiast peripherals. Experience uncompromised performance with next-day UK delivery.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-display tracking-wider rounded-none px-8">
                SHOP ALL COMPONENTS
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 font-display tracking-wider rounded-none px-8 group">
                CUSTOM PC BUILDER
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid - Expanded */}
      <section className="py-20 relative z-20 -mt-10">
        <div className="container px-4 mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold mb-2">BROWSE <span className="text-primary">CATEGORIES</span></h2>
              <div className="h-1 w-16 bg-primary rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="tech-border glass-panel p-4 rounded-lg group cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors mb-3">
                  {cat.icon}
                </div>
                <h3 className="font-display font-bold text-sm mb-1 group-hover:text-primary transition-colors">{cat.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 container mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-display font-bold mb-2">LATEST <span className="text-primary">DROPS</span></h2>
            <div className="h-1 w-20 bg-primary rounded-full"></div>
          </div>
          <Button variant="link" className="hidden sm:flex text-muted-foreground hover:text-primary">
            View All Products <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <div key={product.id} className="group flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-colors relative">
              <div className="relative aspect-square p-6 bg-black/40 flex items-center justify-center overflow-hidden">
                {product.badge && (
                  <div className="absolute top-3 left-3 z-10 bg-primary text-xs font-bold px-2 py-1 rounded">
                    {product.badge}
                  </div>
                )}
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-contain filter drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category}</span>
                <h3 className="font-medium text-lg mb-2 leading-tight flex-1 hover:text-primary cursor-pointer transition-colors">{product.name}</h3>
                <div className="font-display font-bold text-xl text-primary mb-1">{product.priceStr}</div>
                <div className="text-xs text-muted-foreground mb-4">inc. VAT</div>
                
                {/* Shopify-style Add to Basket actions */}
                <div className="grid gap-2 mt-auto">
                  <Button 
                    onClick={() => addToCart(product)}
                    className="w-full font-display tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    data-testid={`button-add-cart-${product.id}`}
                  >
                    ADD TO BASKET
                  </Button>
                  <Button 
                    onClick={() => addToCart(product)}
                    className="w-full bg-[#5A31F4] hover:bg-[#5A31F4]/90 text-white font-bold flex items-center justify-center gap-2"
                    data-testid={`button-buy-now-${product.id}`}
                  >
                    Buy with <span className="text-lg tracking-tight">Shop</span> <span className="bg-white text-[#5A31F4] px-1 rounded text-xs">Pay</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 border-t border-b border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">UK Warranty</h4>
              <p className="text-sm text-muted-foreground max-w-xs">All components come with full UK manufacturer warranties and local support.</p>
            </div>
            <div className="flex flex-col items-center">
              <Truck className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">Next Day DPD Delivery</h4>
              <p className="text-sm text-muted-foreground max-w-xs">Free next working day delivery via DPD on all orders over £150.</p>
            </div>
            <div className="flex flex-col items-center">
              <Headset className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">UK Based Support</h4>
              <p className="text-sm text-muted-foreground max-w-xs">Our team of PC building veterans based in London is ready to assist.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 mt-auto border-t border-white/10">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoImg} alt="Thorn Tech Solutions" className="w-8 h-8 object-contain" />
              <h3 className="font-display font-bold tracking-wider">THORN TECH</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The UK's ultimate destination for premium PC components and bespoke enthusiast builds.
            </p>
            <p className="text-xs text-muted-foreground">
              VAT No: GB 123 4567 89<br/>
              Company Reg: 12345678 (England & Wales)
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold mb-4">Shop Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Graphics Cards (GPUs)</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Processors (CPUs)</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Motherboards</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Memory & Storage</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cooling & Cases</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Gaming Peripherals</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Track Order / DPD</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Returns & Refunds</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">UK Warranty Info</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Finance Options (Klarna/Clearpay)</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe for hardware drops and exclusive UK deals.</p>
            <div className="flex gap-2">
              <Input placeholder="Enter your email" className="bg-white/5 border-white/10" />
              <Button className="bg-primary hover:bg-primary/80">Subscribe</Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Thorn Tech Solutions Ltd. All rights reserved. Powered by Shopify.
        </div>
      </footer>
    </div>
  );
}