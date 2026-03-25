import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight, ShieldCheck, Truck, CheckCircle, XCircle, Box, ChevronLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { proxyImageUrl } from "@/lib/utils";
import { usePageTitle, ProductJsonLd, BreadcrumbJsonLd } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";

function formatPrice(p: number) {
  return `£${p.toFixed(2)}`;
}


function normalizeKey(url: string) {
  return url.toLowerCase().replace(/-lg\./i, ".").replace(/-th\./i, ".").replace(/\.jpeg$/i, ".jpg");
}

function parseTargetKeySpecs(featuresJson: string | null | undefined): { label: string; value: string }[] {
  if (!featuresJson) return [];
  try {
    const arr: string[] = JSON.parse(featuresJson);
    const result: { label: string; value: string }[] = [];
    for (const item of arr) {
      const parts = item.split(/\s{2,}/);
      for (const part of parts) {
        const ci = part.indexOf(": ");
        if (ci > 0) {
          result.push({ label: part.substring(0, ci).trim(), value: part.substring(ci + 2).trim() });
        }
      }
    }
    return result;
  } catch { return []; }
}

type DescSection = { heading: string | null; lines: string[] };

function parseRichDescription(desc: string | null | undefined): DescSection[] {
  if (!desc) return [];
  const lines = desc.split("\n").map(l => l.trim());
  const sections: DescSection[] = [];
  let current: DescSection = { heading: null, lines: [] };

  for (const line of lines) {
    if (!line) continue;
    const isBold = line.startsWith("**") && line.endsWith("**") && line.length > 4;
    if (isBold) {
      if (current.heading !== null || current.lines.length > 0) sections.push(current);
      current = { heading: line.replace(/^\*\*|\*\*$/g, ""), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading !== null || current.lines.length > 0) sections.push(current);
  return sections;
}

function ImagePanel({ product }: { product: Product }) {
  const rawUrls: string[] = [];
  if (product.image) rawUrls.push(product.image);
  try {
    const extra: string[] = JSON.parse(product.images as string || "[]");
    for (const u of extra) { if (u && !rawUrls.includes(u)) rawUrls.push(u); }
  } catch {}

  const seen = new Set<string>();
  const images: string[] = [];
  for (const u of rawUrls) {
    const lg = u.includes("pictureserver") && !u.includes("-lg.") ? u.replace(/(\.[a-zA-Z]+)$/, "-lg$1") : u;
    const key = normalizeKey(u);
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(lg);
  }

  const [active, setActive] = useState(0);
  const [thumbErr, setThumbErr] = useState<Set<number>>(new Set());
  const [zoomed, setZoomed] = useState(false);

  const valid = images.filter((_, i) => !thumbErr.has(i));
  const idx = Math.min(active, valid.length - 1);

  if (valid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/10" style={{ minHeight: 280 }}>
        <Box className="w-20 h-20 text-white/20" />
        {product.vendor && <p className="text-xs text-white/30 mt-2 uppercase tracking-widest">{product.vendor}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="bg-white rounded-xl border border-gray-200 flex items-center justify-center cursor-zoom-in relative overflow-hidden"
        style={{ aspectRatio: "1", width: "100%", maxWidth: 340 }}
        onClick={() => setZoomed(true)}
        data-testid="image-main"
      >
        <img
          key={valid[idx]}
          src={proxyImageUrl(valid[idx])}
          alt={product.name}
          className="w-full h-full object-contain p-3"
          style={{ imageRendering: "auto" }}
        />
        {valid.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setActive(i => (i - 1 + valid.length) % valid.length); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={e => { e.stopPropagation(); setActive(i => (i + 1) % valid.length); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {valid.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {valid.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              data-testid={`thumb-${i}`}
              className={`bg-white rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all ${i === idx ? "border-primary shadow-md shadow-primary/30" : "border-gray-200 hover:border-gray-400"}`}
              style={{ width: 60, height: 60 }}
            >
              <img
                src={proxyImageUrl(img)}
                alt=""
                className="w-full h-full object-contain p-1"
                onError={() => setThumbErr(s => new Set(s).add(images.indexOf(img)))}
              />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setZoomed(false)} data-testid="lightbox">
          <button onClick={() => setZoomed(false)} className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10">
            <XCircle className="w-7 h-7" />
          </button>
          {valid.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setActive(i => (i - 1 + valid.length) % valid.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 z-10">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button onClick={e => { e.stopPropagation(); setActive(i => (i + 1) % valid.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 z-10">
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}
          <img src={proxyImageUrl(valid[idx])} alt={product.name} className="max-w-[88vw] max-h-[88vh] object-contain bg-white rounded-xl p-4" onClick={e => e.stopPropagation()} />
          {valid.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 px-4 py-2 rounded-full">
              {valid.map((img, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setActive(i); }}
                  className={`w-10 h-10 rounded border-2 overflow-hidden bg-white ${i === idx ? "border-primary" : "border-transparent hover:border-white/40"}`}>
                  <img src={proxyImageUrl(img)} alt="" className="w-full h-full object-contain p-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"specification" | "warranty">("specification");

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
  const relatedProducts = product
    ? allProducts.filter(p => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4)
    : [];

  usePageTitle(
    product ? `${product.name} - Buy Online UK` : undefined,
    product ? `Buy ${product.name} at Thorn Tech Solutions Ltd. ${product.inStock ? "In stock" : "Out of stock"}. ${product.price ? `£${product.price.toFixed(2)} inc. VAT.` : ""} Fast UK delivery.` : undefined
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading product...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product || (product as any).error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <h2 className="text-2xl font-display font-bold">Product Not Found</h2>
          <Link href="/"><Button>Back to Shop</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const keySpecs = parseTargetKeySpecs(product.features as string);

  let structuredSpecs: { label: string; value: string }[] = [];
  try {
    const raw: Record<string, string> = JSON.parse(product.specs as string || "{}");
    structuredSpecs = Object.entries(raw).map(([k, v]) => ({ label: k, value: v }));
  } catch {}

  const descSections = parseRichDescription(product.description);

  const exVat = (product.price / 1.2).toFixed(2);
  const incVat = product.price.toFixed(2);

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

      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {category && (
            <>
              <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground/70 line-clamp-1 text-xs">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-4">
        <h1 className="text-xl md:text-2xl font-display font-bold leading-snug mb-5" data-testid="text-product-title">
          {product.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr_220px] lg:grid-cols-[320px_1fr_240px] gap-6 items-start">
          <ImagePanel product={product} />

          <div>
            {keySpecs.length > 0 ? (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-primary/10 border-b border-white/10 px-4 py-2.5">
                  <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">Key Specifications</h2>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {keySpecs.map((s, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}>
                        <td className="px-4 py-2.5 text-muted-foreground font-medium w-2/5 border-r border-white/5">{s.label}</td>
                        <td className="px-4 py-2.5 text-foreground">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : structuredSpecs.length > 0 ? (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-primary/10 border-b border-white/10 px-4 py-2.5">
                  <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">Key Specifications</h2>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {structuredSpecs.slice(0, 10).map((s, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}>
                        <td className="px-4 py-2.5 text-muted-foreground font-medium w-2/5 border-r border-white/5">{s.label}</td>
                        <td className="px-4 py-2.5 text-foreground">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : product.description ? (
              <div className="rounded-xl border border-white/10 p-5">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-8">{product.description.replace(/\*\*/g, "")}</p>
              </div>
            ) : null}

            {product.badge && (
              <div className="mt-4 inline-flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider">{product.badge}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1">
                <span className="text-3xl font-display font-bold text-primary" data-testid="text-product-price">£{incVat}</span>
                <span className="text-xs text-muted-foreground ml-1">inc. VAT</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">£{exVat} ex. VAT · Price Per Unit</p>

              {product.compareAtPrice && (
                <div className="text-xs text-muted-foreground line-through mb-2">Was {formatPrice(product.compareAtPrice)}</div>
              )}

              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Quantity:</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-8 px-2 text-sm rounded border border-white/20 bg-white/5 text-foreground text-center"
                  data-testid="input-quantity"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                {product.inStock ? (
                  <div className="flex items-center gap-1.5 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">In Stock</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-400 text-sm">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">Out of Stock</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/80 font-display tracking-wider h-10"
                onClick={() => { for (let i = 0; i < qty; i++) addItem(product); }}
                disabled={!product.inStock}
                data-testid="button-add-to-basket"
              >
                {product.inStock ? "ADD TO BASKET" : "OUT OF STOCK"}
              </Button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{product.price >= 200 ? <><span className="text-green-400 font-medium">Free Delivery</span> — 1–3 days</> : "£7.99 delivery — Free over £200"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Full UK Manufacturer Warranty</span>
              </div>
            </div>
          </div>
        </div>

        {(product.vendor || product.ean || product.mpn) && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground">
            {product.vendor && (
              <span><span className="text-foreground/60 font-medium">Manufacturer:</span> {product.vendor}</span>
            )}
            {product.ean && (
              <span><span className="text-foreground/60 font-medium">EAN:</span> {product.ean}</span>
            )}
            {product.mpn && (
              <span><span className="text-foreground/60 font-medium">Manufacturer Part Code:</span> {product.mpn}</span>
            )}
            {product.source && (
              <span><span className="text-foreground/60 font-medium">Source:</span> {product.source}</span>
            )}
          </div>
        )}

        <div className="mt-8">
          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab("specification")}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "specification" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Specification
            </button>
            <button
              onClick={() => setActiveTab("warranty")}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "warranty" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Warranty
            </button>
          </div>

          {activeTab === "specification" && (
            <div className="max-w-4xl">
              {descSections.length > 0 ? (
                <div className="space-y-5 text-sm leading-relaxed">
                  {descSections.map((sec, i) => (
                    <div key={i}>
                      {sec.heading && (
                        <h3 className={`font-bold mb-1.5 ${i === 0 ? "text-base text-foreground" : "text-foreground/90"}`}>
                          {sec.heading}
                        </h3>
                      )}
                      {sec.lines.map((line, j) => (
                        <p key={j} className="text-muted-foreground leading-relaxed">{line}</p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {structuredSpecs.length > 0 ? (
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {structuredSpecs.map((s, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                              <td className="px-4 py-2.5 text-muted-foreground font-medium w-1/3 border-r border-white/5">{s.label}</td>
                              <td className="px-4 py-2.5 text-foreground">{s.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No specification data available for this product.</p>
                  )}
                </div>
              )}

              {structuredSpecs.length > 0 && descSections.length > 0 && (
                <div className="mt-8 rounded-xl border border-white/10 overflow-hidden">
                  <div className="bg-primary/10 border-b border-white/10 px-4 py-2.5">
                    <h3 className="text-sm font-display font-bold text-primary uppercase tracking-wider">Full Specifications</h3>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {structuredSpecs.map((s, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                          <td className="px-4 py-2.5 text-muted-foreground font-medium w-1/3 border-r border-white/5">{s.label}</td>
                          <td className="px-4 py-2.5 text-foreground">{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "warranty" && (
            <div className="max-w-2xl text-sm text-muted-foreground space-y-3">
              <p>This product is covered by the manufacturer's standard UK warranty.</p>
              <p>If you experience any issues, please contact us and we will arrange a repair, replacement, or refund in accordance with UK consumer law.</p>
              <p>Warranty claims must be accompanied by proof of purchase. Items showing signs of physical damage or misuse may not be covered.</p>
              <p>For specific warranty duration and terms, please refer to the manufacturer's documentation included with the product or visit the manufacturer's website.</p>
            </div>
          )}
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-display font-bold mb-5 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Related Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
