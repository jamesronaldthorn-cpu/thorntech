import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Fan,
  Box,
  Keyboard,
  CircuitBoard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Product, Category } from "@shared/schema";

import logoImg from "@/assets/images/logo.png";
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
};

function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}

export default function Home() {
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
  });

  const addToCart = (product: Product) => {
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
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
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

          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <Input type="text" placeholder="Search components..." className="w-full bg-black/50 border-white/20 focus-visible:ring-primary pl-4 pr-10 h-10" data-testid="input-search" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-4">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group" data-testid="button-cart">
                  <ShoppingBasket className="w-5 h-5 group-hover:text-primary transition-colors" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold flex items-center justify-center rounded-full">{cartCount}</span>
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
                      <Button variant="outline" onClick={() => setIsCartOpen(false)}>Continue Shopping</Button>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex gap-4 items-center">
                        <div className="w-20 h-20 bg-black/40 rounded border border-white/5 p-2 flex-shrink-0 flex items-center justify-center">
                          <ShoppingBasket className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                          <div className="text-primary font-display font-bold text-sm mb-2">{formatPrice(item.product.price)}</div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, -1)}><Minus className="w-3 h-3" /></Button>
                            <span className="text-sm w-4 text-center">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, 1)}><Plus className="w-3 h-3" /></Button>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => updateQuantity(item.product.id, -item.quantity)}><X className="w-4 h-4" /></Button>
                      </div>
                    ))
                  )}
                </div>
                {cart.length > 0 && (
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Subtotal</span>
                      <span className="font-display">{formatPrice(cartTotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">VAT included. Shipping calculated at checkout</p>
                    <Button className="w-full font-display tracking-widest bg-primary hover:bg-primary/80 h-12 text-lg">CHECKOUT</Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
            <Button variant="outline" className="hidden sm:flex border-primary/50 hover:bg-primary/20 hover:text-white transition-all font-display tracking-widest" data-testid="button-signin">SIGN IN</Button>
            <Button variant="ghost" size="icon" className="md:hidden"><Menu className="w-6 h-6" /></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
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
              UK's Premier PC Hardware Store
            </div>
            <h2 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-6 leading-tight">
              BUILD YOUR <br/><span className="tech-gradient-text">ULTIMATE RIG</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl border-l-2 border-primary/50 pl-4">
              Premium PC components, bespoke water-cooled builds, and enthusiast peripherals for gamers, creators, and professionals.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-display tracking-wider rounded-none px-8">SHOP ALL COMPONENTS</Button>
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 font-display tracking-wider rounded-none px-8 group">
                CUSTOM PC BUILDER <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 relative z-20 -mt-20">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className="tech-border glass-panel p-4 rounded-lg group cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center" data-testid={`link-category-${cat.slug}`}>
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors mb-3">
                  {iconMap[cat.icon || ""] || <Box className="w-6 h-6 text-primary" />}
                </div>
                <h3 className="font-display font-bold text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 container mx-auto px-4">
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
          {products.map((product) => (
            <div key={product.id} className="group flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-colors" data-testid={`card-product-${product.id}`}>
              <div className="relative aspect-square p-6 bg-black/40 flex items-center justify-center overflow-hidden">
                {product.badge && (
                  <div className={`absolute top-3 left-3 z-10 text-xs font-bold px-2 py-1 rounded ${product.badge === 'Sale' ? 'bg-red-600' : 'bg-primary'}`}>{product.badge}</div>
                )}
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  {iconMap[categories.find(c => c.id === product.categoryId)?.icon || ""] || <Box className="w-10 h-10 text-muted-foreground/30" />}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.vendor}</span>
                <h3 className="font-medium text-lg mb-2 leading-tight flex-1 hover:text-primary cursor-pointer transition-colors" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  {product.compareAtPrice && <span className="text-muted-foreground line-through text-sm">{formatPrice(product.compareAtPrice)}</span>}
                  <span className="font-display font-bold text-xl text-primary">{formatPrice(product.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">inc. VAT</p>
                <div className="grid gap-2 mt-auto">
                  <Button onClick={() => addToCart(product)} className="w-full font-display tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/10" data-testid={`button-add-cart-${product.id}`}>
                    ADD TO BASKET
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
              <p className="text-sm text-muted-foreground max-w-xs">Our team of PC building veterans is ready to assist you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 mt-auto border-t border-white/10">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logoImg} alt="Thorn Tech Solutions" className="w-8 h-8 object-contain" />
              <h3 className="font-display font-bold tracking-wider">THORN TECH</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">The UK's ultimate destination for premium PC components and bespoke enthusiast builds.</p>
            <p className="text-xs text-muted-foreground/60">Company Reg: 17058756 (England & Wales)</p>
          </div>
          <div>
            <h4 className="font-display font-bold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categories.slice(0, 4).map(c => (
                <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-primary transition-colors">{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Track Order / DPD</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Returns & Refunds</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">UK Warranty Info</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe for hardware drops and exclusive UK deals.</p>
            <div className="flex gap-2">
              <Input placeholder="Enter your email" className="bg-white/5 border-white/10" data-testid="input-newsletter" />
              <Button className="bg-primary hover:bg-primary/80" data-testid="button-subscribe">Subscribe</Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Thorn Tech Solutions Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
