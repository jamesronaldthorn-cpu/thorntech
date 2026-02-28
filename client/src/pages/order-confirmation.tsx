import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle2, Package, Truck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { useCart } from "@/lib/cart";

interface OrderDetails {
  id: number;
  email: string;
  name: string;
  total: number;
  status: string;
  paymentMethod: string;
  items: string;
  createdAt: string;
}

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

export default function OrderConfirmationPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const orderId = params.get("order_id");
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        if (sessionId) {
          const res = await fetch(`/api/checkout/stripe/verify/${sessionId}`);
          const data = await res.json();
          if (data.orderId) {
            const orderRes = await fetch(`/api/orders/${data.orderId}`);
            const orderData = await orderRes.json();
            setOrder(orderData);
            clearCart();
          }
        } else if (orderId) {
          const orderRes = await fetch(`/api/orders/${orderId}`);
          const orderData = await orderRes.json();
          setOrder(orderData);
        }
      } catch (e) {
        console.error("Failed to verify order:", e);
      }
      setVerifying(false);
    };
    verify();
  }, [sessionId, orderId]);

  const parsedItems = order ? JSON.parse(order.items) : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />

      <section className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        {verifying ? (
          <div className="text-center">
            <div className="animate-pulse text-muted-foreground text-lg">Verifying your payment...</div>
          </div>
        ) : order ? (
          <div className="max-w-2xl w-full">
            <div className="text-center mb-10">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-display font-bold mb-2">ORDER CONFIRMED</h1>
              <p className="text-muted-foreground">Thank you for your order, {order.name}!</p>
              <p className="text-sm text-muted-foreground mt-1">A confirmation email has been sent to {order.email}</p>
            </div>

            <div className="bg-card border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-display font-bold">Order #{order.id}</h2>
                <span className="text-sm px-3 py-1 rounded-full bg-green-600/20 text-green-400 font-medium capitalize">{order.status}</span>
              </div>

              <div className="space-y-3 mb-6">
                {parsedItems.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-display">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Paid</span>
                  <span className="font-display text-primary">{formatPrice(order.total)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Paid via {order.paymentMethod === "stripe" ? "Card (Stripe)" : "PayPal"}
                </div>
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-xl p-6 mb-8">
              <h3 className="font-display font-bold mb-4">WHAT HAPPENS NEXT</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Order Processing</p>
                    <p className="text-xs text-muted-foreground">Your order is being prepared for dispatch</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Dispatch</p>
                    <p className="text-xs text-muted-foreground">You'll receive a tracking number via email within 1-3 days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/">
                <Button className="bg-primary hover:bg-primary/80 font-display tracking-wider">CONTINUE SHOPPING</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-display font-bold mb-4">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">We couldn't find your order details.</p>
            <Link href="/"><Button>Back to Shop</Button></Link>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
