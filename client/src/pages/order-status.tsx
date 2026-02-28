import { useState } from "react";
import { Link } from "wouter";
import { Search, ChevronRight, Package, Clock, Truck, CheckCircle, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { usePageTitle } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "paid", label: "Payment Confirmed", icon: CreditCard },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

function getStatusIndex(status: string) {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function OrderTracker({ status }: { status: string }) {
  const currentIdx = getStatusIndex(status);

  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="font-medium">Order {status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10" />
        <div className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500" style={{ width: `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%` }} />
        {STATUS_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isComplete = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" data-testid={`tracker-step-${step.key}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isComplete ? "bg-primary border-primary text-white" : "bg-background border-white/20 text-gray-500"} ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-xs mt-2 text-center max-w-[80px] ${isComplete ? "text-white font-medium" : "text-gray-500"}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderStatusPage() {
  usePageTitle("Order Status");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.replace("#", ""), email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const orderItems = order ? JSON.parse(order.items || "[]") : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-primary" data-testid="link-home">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">Order Status</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Package className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider" data-testid="text-order-status-title">ORDER STATUS</h1>
        </div>
        <p className="text-gray-400 mb-8">Enter your order number and email address to check the status of your order.</p>

        <form onSubmit={handleLookup} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4" data-testid="text-lookup-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Order Number</Label>
              <Input value={orderId} onChange={e => setOrderId(e.target.value)} required className="bg-white/5 border-white/10 text-white" placeholder="e.g. 1234" data-testid="input-lookup-order" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Email Address</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white" placeholder="your@email.com" data-testid="input-lookup-email" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/80 font-display tracking-widest px-8" data-testid="button-lookup-order">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            CHECK STATUS
          </Button>
        </form>

        {order && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6" data-testid="card-order-result">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-white" data-testid="text-order-number">Order #{order.id}</h2>
              <span className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>

            <OrderTracker status={order.status} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase mb-1">Delivery Address</p>
                <p className="text-white">{order.name}</p>
                <p className="text-gray-400">{order.address}</p>
                <p className="text-gray-400">{order.city}, {order.postcode}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase mb-1">Payment</p>
                <p className="text-white">{order.paymentMethod === "stripe" ? "Card Payment" : "PayPal"}</p>
                <p className="text-gray-400">Status: <span className={order.status === "paid" || order.status === "processing" || order.status === "shipped" || order.status === "delivered" ? "text-green-400" : "text-yellow-400"}>{order.status === "pending" || order.status === "awaiting_payment" ? "Pending" : "Confirmed"}</span></p>
              </div>
            </div>

            <div>
              <p className="text-gray-500 text-xs uppercase mb-3">Items</p>
              <div className="space-y-2">
                {orderItems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-sm">{item.name}</p>
                      <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-gray-300 text-sm font-display">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/10">
                <span className="text-gray-400 font-medium">Total</span>
                <span className="font-display font-bold text-primary text-lg">{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-gray-500 text-xs">Need help with your order? <Link href="/contact" className="text-primary hover:underline">Contact us</Link></p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export { OrderTracker };
