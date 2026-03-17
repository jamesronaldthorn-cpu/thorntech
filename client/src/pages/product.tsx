import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight, ShieldCheck, Truck, Package, Box, CheckCircle, XCircle, Cpu, Monitor, HardDrive, Zap, Fan, Keyboard, MemoryStick, Cable, Mouse, Wifi, Speaker, Headset, CircuitBoard, Server, Star, ChevronLeft, Sparkles, Gauge, Award, Bolt, Layers, Thermometer, Maximize, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { proxyImageUrl } from "@/lib/utils";
import { usePageTitle, ProductJsonLd, BreadcrumbJsonLd } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";

const SPEC_ICONS: Record<string, React.ReactNode> = {
  "clock speed": <Gauge className="w-6 h-6" />,
  "speed": <Gauge className="w-6 h-6" />,
  "boost clock": <Gauge className="w-6 h-6" />,
  "base clock": <Gauge className="w-6 h-6" />,
  "frequency": <Gauge className="w-6 h-6" />,
  "cores": <Cpu className="w-6 h-6" />,
  "threads": <Cpu className="w-6 h-6" />,
  "processor": <Cpu className="w-6 h-6" />,
  "socket": <CircuitBoard className="w-6 h-6" />,
  "chipset": <CircuitBoard className="w-6 h-6" />,
  "memory": <MemoryStick className="w-6 h-6" />,
  "memory / capacity": <MemoryStick className="w-6 h-6" />,
  "capacity": <HardDrive className="w-6 h-6" />,
  "storage": <HardDrive className="w-6 h-6" />,
  "interface": <Cable className="w-6 h-6" />,
  "form factor": <Layers className="w-6 h-6" />,
  "wattage": <Zap className="w-6 h-6" />,
  "tdp": <Thermometer className="w-6 h-6" />,
  "efficiency": <Award className="w-6 h-6" />,
  "resolution": <Maximize className="w-6 h-6" />,
  "refresh rate": <BarChart3 className="w-6 h-6" />,
  "panel type": <Monitor className="w-6 h-6" />,
  "screen size": <Monitor className="w-6 h-6" />,
  "fan size": <Fan className="w-6 h-6" />,
  "cooling type": <Thermometer className="w-6 h-6" />,
  "rgb": <Sparkles className="w-6 h-6" />,
  "lighting": <Sparkles className="w-6 h-6" />,
};

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
  const [zoomed, setZoomed] = useState(false);

  const validImages = allImages.filter((_, i) => !thumbErrors.has(i));

  if (validImages.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl" style={{ minHeight: "400px" }}>
        <div className="text-primary/30 mb-4">
          <Box className="w-24 h-24" />
        </div>
        {product.vendor && (
          <span className="text-sm uppercase tracking-[0.2em] text-white/25 font-display">{product.vendor}</span>
        )}
      </div>
    );
  }

  const activeIdx = Math.min(selected, validImages.length - 1);

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        <div
          className="w-full bg-white rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden cursor-zoom-in"
          style={{ aspectRatio: "1", maxWidth: "500px", margin: "0 auto" }}
          onClick={() => setZoomed(true)}
          data-testid="image-gallery-main"
        >
          {product.badge && (
            <div className={`absolute top-4 left-4 z-10 text-sm font-bold px-3 py-1 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"} text-white`}>{product.badge}</div>
          )}
          <img
            src={proxyImageUrl(validImages[activeIdx])}
            alt={product.name}
            className="max-w-[90%] max-h-[90%] object-contain product-image"
            onError={() => {
              if (activeIdx === 0 && allImages[0] === product.image) setImgError(true);
              setThumbErrors(prev => new Set(prev).add(allImages.indexOf(validImages[activeIdx])));
            }}
          />
          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(s => (s - 1 + validImages.length) % validImages.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(s => (s + 1) % validImages.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <div className="absolute bottom-3 right-3 bg-black/50 text-white/70 text-xs px-2 py-1 rounded flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
            Click to zoom
          </div>
        </div>

        {validImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 px-1 justify-center flex-wrap" style={{ maxWidth: "500px", margin: "0 auto" }}>
            {validImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-[72px] h-[72px] rounded-lg border-2 overflow-hidden shrink-0 bg-white ${i === activeIdx ? "border-primary shadow-lg shadow-primary/20" : "border-white/10 hover:border-white/30"} transition-all`}
                data-testid={`thumb-image-${i}`}
              >
                <img src={proxyImageUrl(img)} alt="" className="w-full h-full object-contain p-1" onError={() => setThumbErrors(prev => new Set(prev).add(allImages.indexOf(img)))} />
              </button>
            ))}
          </div>
        )}

        {validImages.length > 1 && (
          <p className="text-center text-xs text-muted-foreground">{validImages.length} images available — {activeIdx + 1} of {validImages.length}</p>
        )}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setZoomed(false)}
          data-testid="image-lightbox"
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <XCircle className="w-8 h-8" />
          </button>

          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(s => (s - 1 + validImages.length) % validImages.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(s => (s + 1) % validImages.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <img
            src={proxyImageUrl(validImages[activeIdx])}
            alt={product.name}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {validImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 px-4 py-2 rounded-full">
              {validImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSelected(i); }}
                  className={`w-12 h-12 rounded border-2 overflow-hidden bg-white ${i === activeIdx ? "border-primary" : "border-transparent hover:border-white/40"} transition-all`}
                >
                  <img src={proxyImageUrl(img)} alt="" className="w-full h-full object-contain p-0.5" />
                </button>
              ))}
            </div>
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {activeIdx + 1} / {validImages.length}
          </div>
        </div>
      )}
    </>
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

  type DescSection = { heading?: string; content: string[] };
  const descSections: DescSection[] = [];
  const descSpecs: { label: string; value: string }[] = [];
  const descParagraphs: string[] = [];
  const descFeatureBullets: string[] = [];

  if (product.description) {
    const lines = product.description.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    let currentSection: DescSection = { content: [] };
    let inSpecsSection = false;
    let specLabel: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBold = line.startsWith("**") && line.endsWith("**");
      const boldText = isBold ? line.replace(/^\*\*|\*\*$/g, "") : null;

      if (boldText?.toLowerCase() === "specifications" || boldText?.toLowerCase() === "specification") {
        inSpecsSection = true;
        if (currentSection.content.length > 0 || currentSection.heading) {
          descSections.push(currentSection);
        }
        currentSection = { heading: "Specifications", content: [] };
        continue;
      }

      if (boldText?.toLowerCase() === "features" || boldText?.toLowerCase() === "key features") {
        inSpecsSection = false;
        if (currentSection.content.length > 0 || currentSection.heading) {
          descSections.push(currentSection);
        }
        currentSection = { heading: boldText, content: [] };
        continue;
      }

      if (inSpecsSection && isBold && boldText) {
        if (specLabel) {
          descSpecs.push({ label: specLabel, value: "(see description)" });
        }
        specLabel = boldText;
        continue;
      }

      if (inSpecsSection && specLabel) {
        descSpecs.push({ label: specLabel, value: line.replace(/^\*\*|\*\*$/g, "") });
        specLabel = null;
        continue;
      }

      if (isBold && boldText) {
        if (currentSection.content.length > 0 || currentSection.heading) {
          descSections.push(currentSection);
        }
        currentSection = { heading: boldText, content: [] };
        continue;
      }

      if (currentSection.heading?.toLowerCase() === "features" || currentSection.heading?.toLowerCase() === "key features") {
        descFeatureBullets.push(line);
      } else {
        currentSection.content.push(line);
        if (!currentSection.heading) {
          descParagraphs.push(line);
        }
      }
    }
    if (currentSection.content.length > 0 || currentSection.heading) {
      descSections.push(currentSection);
    }
    if (specLabel) {
      descSpecs.push({ label: specLabel, value: "" });
    }
  }

  if (descSpecs.length === 0 && product.description) {
    const singleLineSpecs = product.description.split("\n").filter(l => l.trim());
    singleLineSpecs.forEach(line => {
      const colonMatch = line.match(/^([^:]{2,40}):\s*(.+)$/);
      if (colonMatch && !line.startsWith("**")) {
        descSpecs.push({ label: colonMatch[1].trim(), value: colonMatch[2].trim() });
      }
    });
  }

  let webSpecs: Record<string, string> = {};
  try {
    if (product.specs) webSpecs = JSON.parse(product.specs as string);
  } catch {}

  let features: string[] = [];
  try {
    if (product.features) features = JSON.parse(product.features as string);
  } catch {}

  let vipFeatures: string[] = [];
  try {
    if ((product as any).vipFeatures) vipFeatures = JSON.parse((product as any).vipFeatures as string);
  } catch {}

  const allSpecs = [
    ...Object.entries(webSpecs).map(([k, v]) => ({ label: k, value: v })),
    ...descSpecs.filter(s => !Object.keys(webSpecs).some(k => k.toLowerCase() === s.label.toLowerCase()) && s.value !== "(see description)"),
  ];
  const seenLabels = new Set<string>();
  const uniqueSpecs = allSpecs.filter(s => {
    const key = s.label.toLowerCase();
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  const allFeatures = features.length > 0 ? features : vipFeatures;
  const richDescSections = descSections.filter(s => s.heading && s.heading.toLowerCase() !== "specifications" && s.heading.toLowerCase() !== "features" && s.heading.toLowerCase() !== "key features" && s.content.length > 0);
  const hasRichContent = allFeatures.length > 0 || uniqueSpecs.length > 0 || descParagraphs.length > 0 || richDescSections.length > 0 || descFeatureBullets.length > 0 || product.description;

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
        <div className="grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-10">
          <ImageGallery product={product} imgError={imgError} setImgError={setImgError} />

          <div className="flex flex-col">
            {product.vendor && (
              <span className="text-sm text-primary uppercase tracking-wider mb-2 font-medium">{product.vendor}</span>
            )}
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-4 leading-tight" data-testid="text-product-title">{product.name}</h1>

            {product.mpn && (
              <p className="text-xs text-muted-foreground mb-2">MPN: {product.mpn}</p>
            )}

            {vipFeatures.length > 0 && (
              <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20" data-testid="vip-features-section">
                <h3 className="text-sm font-display font-bold mb-3 flex items-center gap-2 text-primary uppercase tracking-wider">
                  <Star className="w-4 h-4" />
                  Key Features
                </h3>
                <div className="space-y-2">
                  {vipFeatures.map((f, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                      <span>{f}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {(descParagraphs.length > 0 || (product.description && !product.description.includes(":"))) && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4">
                {descParagraphs.length > 0 ? descParagraphs.slice(0, 2).join(" ") : product.description}
              </p>
            )}

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 mb-6">
              <div className="flex items-end gap-3 mb-1">
                {product.compareAtPrice && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
                )}
                <span className="text-4xl font-display font-bold text-primary" data-testid="text-product-price">{formatPrice(product.price)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">inc. VAT</p>

              {product.compareAtPrice && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm font-medium mb-3 w-fit">
                  Save {formatPrice(product.compareAtPrice - product.price)}
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                {product.inStock ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">In Stock — Ready to Ship</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Currently Out of Stock</span>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/80 font-display tracking-widest h-14 text-lg"
                onClick={() => addItem(product)}
                disabled={!product.inStock}
                data-testid="button-add-to-basket"
              >
                {product.inStock ? "ADD TO BASKET" : "OUT OF STOCK"}
              </Button>
            </div>

            {allFeatures.length > 0 && allFeatures.length <= 4 && vipFeatures.length === 0 && (
              <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <h3 className="text-sm font-display font-bold mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  KEY FEATURES
                </h3>
                <ul className="space-y-1.5">
                  {allFeatures.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {allFeatures.length > 4 && vipFeatures.length === 0 && (
              <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary font-display font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {allFeatures.length} SPECIAL FEATURES — See full showcase below
                </p>
              </div>
            )}

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Truck className="w-4 h-4 text-primary shrink-0" />
                <span>{product.price >= 200 || product.slug === "test-product-do-not-buy" ? <><span className="text-green-400 font-medium">Free Delivery</span> — 1-3 Working Days</> : "£7.99 Delivery (1-3 Working Days) — Free over £200"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Full UK Manufacturer Warranty</span>
              </div>
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <span>Secure Packaging & Tracked Shipping</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02]">
              <h4 className="font-display font-bold text-sm mb-2">PAYMENT METHODS</h4>
              <div className="flex items-center gap-3 text-muted-foreground/60 text-xs">
                <span className="px-2 py-1 border border-white/10 rounded">Visa</span>
                <span className="px-2 py-1 border border-white/10 rounded">Mastercard</span>
                <span className="px-2 py-1 border border-white/10 rounded">Amex</span>
                <span className="px-2 py-1 border border-white/10 rounded">PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {(allFeatures.length > 0 || uniqueSpecs.length >= 3) && (
        <section className="relative py-16 overflow-hidden" data-testid="section-special-features">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.03] to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-display font-bold tracking-widest mb-4">
                <Sparkles className="w-4 h-4" />
                SPECIAL FEATURES
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-black">
                WHAT MAKES THIS <span className="text-primary">STAND OUT</span>
              </h2>
              {product.vendor && (
                <p className="text-muted-foreground mt-2">Key highlights of the {product.vendor} {product.name.replace(product.vendor || "", "").trim().split(" ").slice(0, 4).join(" ")}</p>
              )}
            </div>

            {uniqueSpecs.length >= 3 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-12">
                {uniqueSpecs.slice(0, 6).map((spec, i) => {
                  const iconKey = spec.label.toLowerCase();
                  const icon = SPEC_ICONS[iconKey] || <Bolt className="w-6 h-6" />;
                  return (
                    <div key={i} className="group relative bg-background border border-white/10 rounded-xl p-5 text-center hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5" data-testid={`spec-highlight-${i}`}>
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                          {icon}
                        </div>
                        <p className="text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-1">{spec.label}</p>
                        <p className="text-sm font-bold text-foreground leading-tight">{spec.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {allFeatures.length > 0 && (
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allFeatures.map((feature, i) => (
                    <div key={i} className="group flex items-start gap-4 p-5 bg-background border border-white/10 rounded-xl hover:border-primary/30 transition-all" data-testid={`feature-card-${i}`}>
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-relaxed">{feature}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {hasRichContent && (
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {descParagraphs.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                  <h2 className="text-xl font-display font-bold mb-4">OVERVIEW</h2>
                  <div className="space-y-3 text-muted-foreground leading-relaxed text-sm">
                    {descParagraphs.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {richDescSections.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                  <h2 className="text-xl font-display font-bold mb-6">PRODUCT DETAILS</h2>
                  <div className="space-y-6">
                    {richDescSections.map((section, i) => (
                      <div key={i}>
                        <h3 className="text-sm font-bold text-foreground mb-1.5">{section.heading}</h3>
                        {section.content.map((line, j) => (
                          <p key={j} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {descFeatureBullets.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                  <h2 className="text-xl font-display font-bold mb-4">FEATURES</h2>
                  <ul className="space-y-2">
                    {descFeatureBullets.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {descParagraphs.length === 0 && richDescSections.length === 0 && product.description && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                  <h2 className="text-xl font-display font-bold mb-4">DESCRIPTION</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>

            {uniqueSpecs.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 h-fit">
                <h2 className="text-xl font-display font-bold mb-4">SPECIFICATIONS</h2>
                <div className="divide-y divide-white/5">
                  {uniqueSpecs.map((spec, i) => (
                    <div key={i} className="flex py-3 text-sm">
                      <span className="w-2/5 text-muted-foreground font-bold shrink-0">{spec.label}</span>
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
