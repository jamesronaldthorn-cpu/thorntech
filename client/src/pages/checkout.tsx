import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, CreditCard, ShieldCheck, Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<"stripe" | "paypal" | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        email: user.email || prev.email,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
        address: user.address || prev.address,
        city: user.city || prev.city,
        postcode: user.postcode || prev.postcode,
      }));
    }
  }, [user]);

  const subtotal = getTotal();
  const shipping = subtotal >= 150 ? 0 : 5.99;
  const total = subtotal + shipping;

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.email || !form.name || !form.address || !form.city || !form.postcode) {
      setError("Please fill in all required fields");
      return false;
    }
    if (!form.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  };

  const handleStripeCheckout = async () => {
    if (!validateForm()) return;
    setLoading("stripe");
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          ...form,
          userId: user?.id || null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
        setLoading(null);
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  };

  const handlePaypalCheckout = async () => {
    if (!validateForm()) return;
    setLoading("paypal");
    try {
      const createRes = await fetch("/api/checkout/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          ...form,
          userId: user?.id || null,
        }),
      });
      const orderData = await createRes.json();

      if (orderData.error) {
        setError(orderData.error);
        setLoading(null);
        return;
      }

      if (orderData.approvalUrl) {
        clearCart();
        window.location.href = orderData.approvalUrl;
      } else {
        setError("Failed to create PayPal order. Please try again or use card payment.");
        setLoading(null);
      }
    } catch (e: any) {
      setError("PayPal is not configured yet. Please use card payment.");
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <NavBar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <h2 className="text-2xl font-display font-bold">Your Basket is Empty</h2>
          <p className="text-muted-foreground">Add some items to your basket to checkout</p>
          <Link href="/"><Button className="bg-primary">Continue Shopping</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Checkout</span>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold mb-8">CHECKOUT</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-white/10 rounded-xl p-6">
              <h2 className="font-display font-bold text-lg mb-4">DELIVERY DETAILS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Full Name *</label>
                  <Input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="John Smith" className="bg-black/50 border-white/20" data-testid="input-name" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Email Address *</label>
                  <Input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="john@example.com" className="bg-black/50 border-white/20" data-testid="input-email" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Phone Number</label>
                  <Input type="tel" value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="07700 900000" className="bg-black/50 border-white/20" data-testid="input-phone" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Address *</label>
                  <Input value={form.address} onChange={e => updateField("address", e.target.value)} placeholder="123 High Street" className="bg-black/50 border-white/20" data-testid="input-address" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">City *</label>
                  <Input value={form.city} onChange={e => updateField("city", e.target.value)} placeholder="London" className="bg-black/50 border-white/20" data-testid="input-city" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Postcode *</label>
                  <Input value={form.postcode} onChange={e => updateField("postcode", e.target.value)} placeholder="SW1A 1AA" className="bg-black/50 border-white/20" data-testid="input-postcode" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-xl p-6">
              <h2 className="font-display font-bold text-lg mb-4">PAYMENT METHOD</h2>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm">{error}</div>
              )}
              <div className="space-y-4">
                <Button
                  onClick={handleStripeCheckout}
                  disabled={loading !== null}
                  className="w-full h-14 bg-[#635bff] hover:bg-[#5851db] text-white font-display tracking-wider text-lg"
                  data-testid="button-pay-stripe"
                >
                  {loading === "stripe" ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><CreditCard className="w-5 h-5 mr-2" /> Pay with Card (Stripe)</>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>

                <Button
                  onClick={handlePaypalCheckout}
                  disabled={loading !== null}
                  className="w-full h-14 bg-[#ffc439] hover:bg-[#f0b72d] text-black font-bold tracking-wider text-lg"
                  data-testid="button-pay-paypal"
                >
                  {loading === "paypal" ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    "Pay with PayPal"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-card border border-white/10 rounded-xl p-6 sticky top-24">
              <h2 className="font-display font-bold text-lg mb-4">ORDER SUMMARY</h2>
              <div className="space-y-4 mb-6">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-display font-bold">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">DPD Delivery</span>
                  <span className={shipping === 0 ? "text-green-400" : ""}>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>VAT (included)</span>
                  <span>{formatPrice(total / 6)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="font-display text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Secure SSL encryption</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>{subtotal >= 150 ? "Free next day DPD delivery" : "Free delivery over £150"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
