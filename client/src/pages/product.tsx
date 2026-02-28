import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight, ShieldCheck, Truck, Package, Box, Monitor, Cpu, CircuitBoard, Zap, HardDrive, Fan, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import type { Product, Category } from "@shared/schema";

const iconMap: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-20 h-20 text-muted-foreground/20" />,
  Cpu: <Cpu className="w-20 h-20 text-muted-foreground/20" />,
  CircuitBoard: <CircuitBoard className="w-20 h-20 text-muted-foreground/20" />,
  Zap: <Zap className="w-20 h-20 text-muted-foreground/20" />,
  HardDrive: <HardDrive className="w-20 h-20 text-muted-foreground/20" />,
  Fan: <Fan className="w-20 h-20 text-muted-foreground/20" />,
  Box: <Box className="w-20 h-20 text-muted-foreground/20" />,
  Keyboard: <Keyboard className="w-20 h-20 text-muted-foreground/20" />,
};

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", slug],
    queryFn: () => fetch(`/api/products/${slug}`).then(r => r.json()),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
  });

  const catMap = new Map(categories.map(c => [c.id, c]));
  const category = product ? catMap.get(product.categoryId ?? 0) : undefined;
  const relatedProducts = product ? allProducts.filter(p => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading product...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <NavBar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <h2 className="text-2xl font-display font-bold">Product Not Found</h2>
          <Link href="/"><Button>Back to Shop</Button></Link>
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
          {category && (
            <>
              <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative">
            {product.badge && (
              <div className={`absolute top-4 left-4 z-10 text-sm font-bold px-3 py-1 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"}`}>{product.badge}</div>
            )}
            {iconMap[category?.icon || ""] || <Box className="w-20 h-20 text-muted-foreground/20" />}
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-primary uppercase tracking-wider mb-2">{product.vendor}</span>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid="text-product-title">{product.name}</h1>

            <div className="flex items-center gap-3 mb-6">
              {product.compareAtPrice && (
                <span className="text-xl text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
              )}
              <span className="text-3xl font-display font-bold text-primary" data-testid="text-product-price">{formatPrice(product.price)}</span>
              <span className="text-sm text-muted-foreground">inc. VAT</span>
            </div>

            {product.compareAtPrice && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm font-medium mb-6 w-fit">
                Save {formatPrice(product.compareAtPrice - product.price)}
              </div>
            )}

            <p className="text-muted-foreground mb-8 leading-relaxed">{product.description}</p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm">
                <Package className="w-4 h-4 text-primary" />
                <span>{product.inStock ? "In Stock — Ready to Ship" : "Out of Stock"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Truck className="w-4 h-4 text-primary" />
                <span>Free Next Day DPD Delivery on orders over £150</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Full UK Manufacturer Warranty</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/80 font-display tracking-widest h-14 text-lg"
                onClick={() => addItem(product)}
                disabled={!product.inStock}
                data-testid="button-add-to-basket"
              >
                {product.inStock ? "ADD TO BASKET" : "OUT OF STOCK"}
              </Button>
            </div>

            <div className="mt-8 p-4 rounded-lg border border-white/10 bg-white/[0.02]">
              <h4 className="font-display font-bold text-sm mb-2">PAYMENT METHODS</h4>
              <p className="text-xs text-muted-foreground">We accept Visa, Mastercard, American Express via Stripe, and PayPal. All payments are secured with industry-standard encryption.</p>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-display font-bold mb-8">RELATED <span className="text-primary">PRODUCTS</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} category={catMap.get(p.categoryId ?? 0)} />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
