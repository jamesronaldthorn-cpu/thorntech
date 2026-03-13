import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight, ShieldCheck, Truck, Package, Box, CheckCircle, XCircle, Cpu, Monitor, HardDrive, Zap, Fan, Keyboard, MemoryStick, Cable, Mouse, Wifi, Speaker, Headset, CircuitBoard, Server, Star, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { usePageTitle, ProductJsonLd, BreadcrumbJsonLd } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

function ImageGallery({ product, imgError, setImgError }: { product: Product; imgError: boolean; setImgError: (v: boolean) => void }) {
  const allImages: string[] = [];
  if (product.image && !imgError) allImages.push(product.image);
  try {
    const extra = product.images ? JSON.parse(product.images as string) : [];
    if (Array.isArray(extra)) {
      extra.forEach((img: string) => {
        if (img && !allImages.includes(img)) allImages.push(img);
      });
    }
  } catch {}

  const [selected, setSelected] = useState(0);
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set());

  const validImages = allImages.filter((_, i) => !thumbErrors.has(i));

  if (validImages.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl">
        <div className="text-primary/30 mb-4">
          <Box className="w-20 h-20" />
        </div>
        {product.vendor && (
          <span className="text-sm uppercase tracking-[0.2em] text-white/25 font-display">{product.vendor}</span>
        )}
      </div>
    );
  }

  const activeIdx = Math.min(selected, validImages.length - 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="w-[280px] h-[280px] bg-white rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden mx-auto">
        {product.badge && (
          <div className={`absolute top-4 left-4 z-10 text-sm font-bold px-3 py-1 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"} text-white`}>{product.badge}</div>
        )}
        <img
          src={validImages[activeIdx]}
          alt={product.name}
          className="max-w-[240px] max-h-[240px] object-contain product-image"
          onError={() => {
            if (activeIdx === 0 && allImages[0] === product.image) setImgError(true);
            setThumbErrors(prev => new Set(prev).add(allImages.indexOf(validImages[activeIdx])));
          }}
        />
        {validImages.length > 1 && (
          <>
            <button
              onClick={() => setSelected(s => (s - 1 + validImages.length) % validImages.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelected(s => (s + 1) % validImages.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 bg-white ${i === activeIdx ? "border-primary" : "border-white/10 hover:border-white/30"} transition-colors`}
            >
              <img src={img} alt="" className="w-full h-full object-contain p-1" onError={() => setThumbErrors(prev => new Set(prev).add(allImages.indexOf(img)))} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);

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

  usePageTitle(
    product ? `${product.name} - Buy Online UK` : undefined,
    product ? `Buy ${product.name} online at Thorn Tech Solutions Ltd. ${product.inStock ? "In stock" : "Currently out of stock"}. ${product.price ? `£${product.price.toFixed(2)} inc. VAT.` : ""} Fast UK delivery, secure checkout.` : undefined
  );

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

  const descLines = product.description?.split("\n").filter(l => l.trim()) || [];
  const descSpecs: { label: string; value: string }[] = [];
  const descParagraphs: string[] = [];

  descLines.forEach(line => {
    const colonMatch = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (colonMatch) {
      descSpecs.push({ label: colonMatch[1].trim(), value: colonMatch[2].trim() });
    } else {
      descParagraphs.push(line.trim());
    }
  });

  let webSpecs: Record<string, string> = {};
  try {
    if (product.specs) webSpecs = JSON.parse(product.specs as string);
  } catch {}

  let features: string[] = [];
  try {
    if (product.features) features = JSON.parse(product.features as string);
  } catch {}

  const allSpecs = [
    ...descSpecs.map(s => ({ label: s.label, value: s.value })),
    ...Object.entries(webSpecs).map(([k, v]) => ({ label: k, value: v })),
  ];
  const seenLabels = new Set<string>();
  const uniqueSpecs = allSpecs.filter(s => {
    const key = s.label.toLowerCase();
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  const hasRichContent = features.length > 0 || uniqueSpecs.length > 0 || descParagraphs.length > 0 || product.description;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      {product && <ProductJsonLd product={product} category={category?.name} />}
      {product && (
        <BreadcrumbJsonLd items={[
          { name: "Home", url: "/" },
          ...(category ? [{ name: category.name, url: `/category/${category.slug}` }] : []),
          { name: product.name, url: `/product/${product.slug}` },
        ]} />
      )}

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
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
          <ImageGallery product={product} imgError={imgError} setImgError={setImgError} />

          <div className="flex flex-col">
            {product.vendor && (
              <span className="text-sm text-primary uppercase tracking-wider mb-2 font-medium">{product.vendor}</span>
            )}
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-4 leading-tight" data-testid="text-product-title">{product.name}</h1>

            {product.mpn && (
              <p className="text-xs text-muted-foreground mb-2">MPN: {product.mpn}</p>
            )}

            <div className="flex items-center gap-3 mb-2">
              {product.compareAtPrice && (
                <span className="text-xl text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
              )}
              <span className="text-3xl font-display font-bold text-primary" data-testid="text-product-price">{formatPrice(product.price)}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">inc. VAT</p>

            {product.compareAtPrice && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm font-medium mb-4 w-fit">
                Save {formatPrice(product.compareAtPrice - product.price)}
              </div>
            )}

            {features.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <h3 className="text-sm font-display font-bold mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  KEY FEATURES
                </h3>
                <ul className="space-y-1.5">
                  {features.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 mb-6">
              {product.inStock ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">In Stock</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Out of Stock</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5 mb-6 p-4 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="w-4 h-4 text-primary shrink-0" />
                <span>{product.price >= 200 || product.slug === "test-product-do-not-buy" ? "Free Delivery (1-3 Working Days)" : "£7.99 Delivery (1-3 Working Days) — Free over £200"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Full UK Manufacturer Warranty</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <span>Secure Packaging & Tracked Shipping</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/80 font-display tracking-widest h-14 text-lg mb-6"
              onClick={() => addItem(product)}
              disabled={!product.inStock}
              data-testid="button-add-to-basket"
            >
              {product.inStock ? "ADD TO BASKET" : "OUT OF STOCK"}
            </Button>

            <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02]">
              <h4 className="font-display font-bold text-sm mb-2">PAYMENT METHODS</h4>
              <p className="text-xs text-muted-foreground">We accept Visa, Mastercard, American Express via Stripe, and PayPal. All payments are secured with industry-standard encryption.</p>
            </div>
          </div>
        </div>
      </section>

      {hasRichContent && (
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {(descParagraphs.length > 0 || (product.description && descSpecs.length === 0 && descParagraphs.length === 0)) && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-6">
                  <h2 className="text-xl font-display font-bold mb-4">DESCRIPTION</h2>
                  <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
                    {descParagraphs.length > 0 ? descParagraphs.map((p, i) => (
                      <p key={i}>{p}</p>
                    )) : (
                      <p>{product.description}</p>
                    )}
                  </div>
                </div>
              )}

              {features.length > 6 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                  <h2 className="text-xl font-display font-bold mb-4">ALL FEATURES</h2>
                  <ul className="space-y-2">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {uniqueSpecs.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                <h2 className="text-xl font-display font-bold mb-4">SPECIFICATIONS</h2>
                <div className="divide-y divide-white/5">
                  {uniqueSpecs.map((spec, i) => (
                    <div key={i} className="flex py-2.5 text-sm">
                      <span className="w-2/5 text-muted-foreground font-medium shrink-0">{spec.label}</span>
                      <span className="text-foreground">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

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
