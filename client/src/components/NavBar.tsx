import { Link, useLocation } from "wouter";
import { ShoppingBasket, Search, Menu, X, Minus, Plus, User, Truck, Phone, Mail, Trash2, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { proxyImageUrl } from "@/lib/utils";
import logoImg from "@/assets/images/logo.png";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

function CartItemImage({ product }: { product: any }) {
  const [failed, setFailed] = useState(false);
  const imgUrl = product.image;

  if (!imgUrl || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <ShoppingBasket className="w-6 h-6 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <img
      src={proxyImageUrl(imgUrl)}
      alt={product.name}
      className="w-full h-full object-contain p-1.5"
      onError={() => setFailed(true)}
    />
  );
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function NavBar() {
  const { items, isOpen, setOpen, updateQuantity, removeItem, getTotal, getCount } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const cartCount = getCount();
  const cartTotal = getTotal();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) {
      setLocation(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <>
      <div className="bg-primary/10 border-b border-primary/20 hidden md:block">
        <div className="container mx-auto px-4 h-9 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="w-3.5 h-3.5 text-primary" />
              Free UK Delivery Over £200
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 text-primary" />
              07868 552028
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="w-3.5 h-3.5 text-primary" />
            thorntech@hotmail.com
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoImg} alt="Thorn Tech Solutions Logo" className="w-10 h-10 object-contain" />
              <div className="hidden md:block">
                <h1 className="font-display font-bold text-lg tracking-wider leading-none">THORN TECH</h1>
                <span className="text-[10px] text-primary uppercase tracking-[0.2em]">Solutions Ltd</span>
              </div>
            </Link>

            <div ref={catRef} className="relative hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors font-display tracking-wider"
                onClick={() => setCatOpen(!catOpen)}
                data-testid="button-categories-dropdown"
              >
                <Menu className="w-4 h-4" />
                CATEGORIES
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`} />
              </Button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 max-h-[70vh] overflow-y-auto bg-background/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 py-2">
                  {categories.map(cat => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      onClick={() => setCatOpen(false)}
                    >
                      <div className="px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" data-testid={`link-category-${cat.slug}`}>
                        {cat.name}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8 relative">
            <Input
              type="text"
              placeholder="Search for components, brands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border-white/20 focus-visible:ring-primary pl-4 pr-10 h-10"
              data-testid="input-search"
            />
            <button type="submit" className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center bg-primary/20 hover:bg-primary/40 rounded-r-md transition-colors">
              <Search className="w-4 h-4 text-primary" />
            </button>
          </form>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/account">
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-sm hover:text-primary transition-colors" data-testid="button-account">
                  <User className="w-4 h-4" />
                  <span className="font-display tracking-wider">{user.name.split(" ")[0].toUpperCase()}</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-sm hover:text-primary transition-colors" data-testid="button-signin">
                  <User className="w-4 h-4" />
                  <span className="font-display tracking-wider">SIGN IN</span>
                </Button>
              </Link>
            )}

            <Link href="/search">
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-search-mobile"><Search className="w-5 h-5" /></Button>
            </Link>

            <Sheet open={isOpen} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative flex items-center gap-2" data-testid="button-cart">
                  <ShoppingBasket className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold flex items-center justify-center rounded-full">{cartCount}</span>
                  )}
                  {cartCount > 0 && (
                    <span className="hidden sm:inline text-xs font-display tracking-wider">{formatPrice(cartTotal)}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md border-l border-white/10 bg-background/95 backdrop-blur-xl flex flex-col">
                <SheetHeader className="border-b border-white/10 pb-4">
                  <SheetTitle className="font-display tracking-wider text-left flex items-center gap-2">
                    YOUR BASKET
                    {cartCount > 0 && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-normal">{cartCount} {cartCount === 1 ? "item" : "items"}</span>}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                      <ShoppingBasket className="w-16 h-16 opacity-20" />
                      <p className="font-display tracking-wider text-sm">YOUR BASKET IS EMPTY</p>
                      <p className="text-xs text-center max-w-[200px]">Browse our range of PC components and add items to get started.</p>
                      <Button variant="outline" onClick={() => setOpen(false)} className="font-display tracking-wider">CONTINUE SHOPPING</Button>
                    </div>
                  ) : (
                    items.map(item => (
                      <div key={item.product.id} className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                        <div className="w-16 h-16 rounded-lg border border-white/10 overflow-hidden flex-shrink-0 bg-white">
                          <CartItemImage product={item.product} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/product/${item.product.slug}`} onClick={() => setOpen(false)}>
                            <h4 className="font-medium text-sm line-clamp-2 leading-tight hover:text-primary transition-colors cursor-pointer">{item.product.name}</h4>
                          </Link>
                          <div className="text-primary font-display font-bold text-sm mt-1">{formatPrice(item.product.price)}</div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                              <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.product.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {items.length > 0 && (
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatPrice(cartTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Delivery</span>
                        <span>{cartTotal >= 200 ? <span className="text-green-400">FREE</span> : "£7.99"}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2"></div>
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total</span>
                        <span className="font-display text-primary">{formatPrice(cartTotal >= 200 ? cartTotal : cartTotal + 7.99)}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">All prices include VAT{cartTotal < 200 ? " — Free delivery over £200" : ""}</p>
                    <Link href="/checkout">
                      <Button className="w-full font-display tracking-widest bg-primary hover:bg-primary/80 h-12 text-base" onClick={() => setOpen(false)} data-testid="button-checkout">SECURE CHECKOUT</Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[64px] z-40 bg-background/95 backdrop-blur-xl border-b border-white/10 max-h-[70vh] overflow-y-auto">
          <div className="container mx-auto px-4 py-3">
            <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className="mb-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for components..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border-white/20 focus-visible:ring-primary pl-4 pr-10 h-10"
                  data-testid="input-search-mobile-menu"
                />
                <button type="submit" className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center bg-primary/20 hover:bg-primary/40 rounded-r-md transition-colors">
                  <Search className="w-4 h-4 text-primary" />
                </button>
              </div>
            </form>
            <p className="text-xs text-muted-foreground font-display tracking-wider mb-2 px-1">CATEGORIES</p>
            <div className="grid grid-cols-2 gap-1">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md" data-testid={`link-mobile-category-${cat.slug}`}>
                    {cat.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
