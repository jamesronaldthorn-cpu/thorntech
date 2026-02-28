import { Link } from "wouter";
import { ShoppingBasket, Search, Menu, X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import logoImg from "@/assets/images/logo.png";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

export default function NavBar() {
  const { items, isOpen, setOpen, updateQuantity, removeItem, getTotal, getCount } = useCart();
  const cartCount = getCount();
  const cartTotal = getTotal();

  return (
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
          <Sheet open={isOpen} onOpenChange={setOpen}>
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
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                    <ShoppingBasket className="w-16 h-16 opacity-20" />
                    <p>Your basket is empty</p>
                    <Button variant="outline" onClick={() => setOpen(false)}>Continue Shopping</Button>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.product.id} className="flex gap-4 items-center">
                      <div className="w-20 h-20 bg-black/40 rounded border border-white/5 p-2 flex-shrink-0 flex items-center justify-center">
                        <ShoppingBasket className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                        <div className="text-primary font-display font-bold text-sm mb-2">{formatPrice(item.product.price)}</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                          <span className="text-sm w-4 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-white/20" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.product.id)}><X className="w-4 h-4" /></Button>
                    </div>
                  ))
                )}
              </div>
              {items.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Subtotal</span>
                    <span className="font-display">{formatPrice(cartTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">VAT included. {cartTotal >= 150 ? "Free next day DPD delivery!" : "Free delivery over £150"}</p>
                  <Link href="/checkout">
                    <Button className="w-full font-display tracking-widest bg-primary hover:bg-primary/80 h-12 text-lg" onClick={() => setOpen(false)} data-testid="button-checkout">CHECKOUT</Button>
                  </Link>
                </div>
              )}
            </SheetContent>
          </Sheet>
          <Button variant="outline" className="hidden sm:flex border-primary/50 hover:bg-primary/20 hover:text-white transition-all font-display tracking-widest" data-testid="button-signin">SIGN IN</Button>
          <Button variant="ghost" size="icon" className="md:hidden"><Menu className="w-6 h-6" /></Button>
        </div>
      </div>
    </nav>
  );
}
