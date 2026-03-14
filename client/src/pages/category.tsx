import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight, Truck, ShieldCheck, Tag, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductFilters, { useProductFilters } from "@/components/ProductFilters";
import { usePageTitle, BreadcrumbJsonLd, FAQJsonLd } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";

const CATEGORY_CONTENT: Record<string, { intro: string; guide: string; faqs: { q: string; a: string }[] }> = {
  "processors": {
    intro: "Whether you're building a gaming rig, a content creation workstation, or a budget office PC, the processor is the heart of your system. We stock the latest Intel Core and AMD Ryzen CPUs, from affordable dual-core chips to high-end multi-threaded powerhouses. Every CPU we sell is brand new, sealed, and comes with a full UK manufacturer warranty.",
    guide: "When choosing a CPU, consider what you'll use your PC for. For gaming, a 6-core or 8-core processor like the AMD Ryzen 5 or Intel Core i5 offers excellent value. For video editing, 3D rendering, or streaming while gaming, look at 8-core to 16-core chips like the Ryzen 7, Ryzen 9, Core i7, or Core i9. Make sure your motherboard socket matches your chosen CPU — AM5 for latest AMD, LGA 1700/1851 for latest Intel. Don't forget a compatible cooler, as high-performance CPUs generate significant heat under load.",
    faqs: [
      { q: "What CPU do I need for gaming?", a: "For 1080p gaming, a 6-core CPU like the AMD Ryzen 5 7600 or Intel Core i5-14600K is ideal. For 1440p and 4K, the GPU matters more than the CPU, but an 8-core chip ensures no bottlenecking in demanding titles." },
      { q: "Do your CPUs come with coolers?", a: "Some CPUs include a stock cooler in the box (marked 'with cooler' or 'BOX' in the listing). Higher-end chips often sell without a cooler, requiring a separate aftermarket cooler purchase." },
      { q: "What's the difference between AMD and Intel?", a: "Both offer excellent performance. AMD Ryzen CPUs tend to offer more cores for the price and better multi-threaded performance. Intel CPUs often edge ahead in single-threaded tasks and some games. Check benchmarks for your specific workload." },
    ]
  },
  "graphics-cards": {
    intro: "The graphics card is the single most important component for gaming performance. We stock NVIDIA GeForce RTX and AMD Radeon RX GPUs from trusted brands like ASUS, MSI, Gigabyte, EVGA, Sapphire, and XFX. Whether you need a budget card for esports titles or a flagship GPU for 4K ray-traced gaming, you'll find it here with fast UK delivery.",
    guide: "Match your GPU to your monitor resolution. For 1080p gaming, mid-range cards like the RTX 4060 or RX 7600 deliver smooth frame rates. For 1440p, step up to an RTX 4070 or RX 7800 XT. For 4K gaming at high settings, you'll want an RTX 4080 or RTX 4090. Check that your power supply has enough wattage and the right PCIe power connectors — modern GPUs can draw 200-450W. Also ensure the card physically fits in your case (measure length and check slot width).",
    faqs: [
      { q: "What GPU do I need for 1440p gaming?", a: "For 1440p at high settings and 60+ FPS, we recommend at least an NVIDIA RTX 4070 or AMD RX 7800 XT. For high refresh rate 1440p (144Hz+), consider an RTX 4070 Ti Super or better." },
      { q: "How do I know if a GPU fits my case?", a: "Check the GPU length (in mm) in its specifications and compare it to your case's maximum GPU clearance. Most mid-tower cases support cards up to 350mm, but always verify with your case manufacturer's specs." },
      { q: "NVIDIA or AMD for gaming?", a: "Both are excellent. NVIDIA offers superior ray tracing and DLSS upscaling. AMD often provides better raw rasterisation value for money. NVIDIA is preferred for content creation (CUDA) and AI workloads." },
    ]
  },
  "motherboards": {
    intro: "Your motherboard determines which CPU, RAM, and expansion cards your system supports. We carry a full range of ATX, Micro-ATX, and Mini-ITX boards for both Intel and AMD platforms. From budget B-series boards perfect for everyday builds to high-end X/Z-series boards with PCIe 5.0, DDR5, and extensive VRM cooling for overclocking enthusiasts.",
    guide: "Start by picking your CPU, then choose a motherboard with the matching socket (AM5 for AMD Ryzen 7000+, LGA 1700 for Intel 12th-14th Gen, LGA 1851 for Arrow Lake). Consider the chipset tier: B-series for mainstream builds, X/Z-series for overclocking and extra features. Check how many M.2 slots, USB ports, and PCIe lanes you need. If you want WiFi and Bluetooth built-in, look for boards with 'WiFi' in the name — otherwise you'll need a separate adapter.",
    faqs: [
      { q: "Which motherboard chipset should I choose?", a: "For AMD: B650 for mainstream, X670/X870 for enthusiast. For Intel: B760 for mainstream, Z790 for overclocking. Higher-tier chipsets offer more USB ports, M.2 slots, and PCIe lanes." },
      { q: "Do I need DDR5 or DDR4?", a: "Newer platforms (AMD AM5, Intel LGA 1851) require DDR5. Some Intel LGA 1700 boards support either DDR4 or DDR5 — check before buying. DDR5 offers higher bandwidth but DDR4 is more affordable." },
      { q: "What size motherboard should I get?", a: "ATX is the most popular and fits standard mid-tower cases. Micro-ATX is slightly smaller with fewer expansion slots. Mini-ITX is compact for small form factor builds but limits upgrade options." },
    ]
  },
  "memory": {
    intro: "RAM directly impacts how smoothly your PC runs, especially when multitasking, gaming, or editing large files. We stock DDR4 and DDR5 desktop and laptop memory kits from leading brands including Corsair, Kingston, G.Skill, and Crucial. From budget 16GB kits to high-performance 64GB+ configurations with RGB lighting.",
    guide: "For most gaming PCs in 2026, 32GB (2x16GB) of DDR5 is the sweet spot. Budget builds can get by with 16GB (2x8GB). Always buy RAM in matched pairs for dual-channel performance — it roughly doubles your memory bandwidth. Check your motherboard's QVL (Qualified Vendor List) for guaranteed compatibility, and ensure the speed (e.g. DDR5-6000) is supported. For DDR5 AMD systems, DDR5-6000 is the optimal speed for the Infinity Fabric.",
    faqs: [
      { q: "How much RAM do I need for gaming?", a: "32GB (2x16GB) is now the recommended amount for modern gaming. Some AAA titles use 16GB+, so 32GB gives you comfortable headroom. 16GB is the minimum for a budget build." },
      { q: "Does RAM speed matter?", a: "Yes, especially on AMD platforms where the Infinity Fabric clock ties to RAM speed. DDR5-6000 is the sweet spot for AMD. For Intel, the difference between speeds is smaller but still noticeable." },
      { q: "Can I mix different RAM brands?", a: "It's possible but not recommended. Mixing brands or speeds can cause instability. For best results, buy a matched kit (sold together) from the same manufacturer." },
    ]
  },
  "storage": {
    intro: "Fast storage transforms your PC experience — from boot times under 10 seconds to near-instant game loading. We stock NVMe M.2 SSDs (PCIe Gen3, Gen4, and Gen5), SATA SSDs, and traditional hard drives. Top brands include Samsung, Western Digital, Crucial, Seagate, Kingston, and Sabrent. All drives come with full UK warranty.",
    guide: "For your boot drive, an NVMe SSD is essential. PCIe Gen4 drives like the Samsung 990 Pro offer read speeds over 7,000 MB/s — perfect for Windows, games, and creative apps. If you need bulk storage for media files and backups, a large SATA SSD or HDD offers cost-effective capacity. Most modern motherboards have at least two M.2 slots, so you can run an NVMe boot drive alongside additional storage. Check whether your M.2 slot supports Gen4 or Gen5 before buying the fastest drives.",
    faqs: [
      { q: "NVMe vs SATA SSD — what's the difference?", a: "NVMe SSDs connect via the M.2 slot and are 5-10x faster than SATA SSDs. SATA SSDs use the older SATA interface (limited to ~550 MB/s). For a boot drive, always choose NVMe. SATA SSDs are fine for secondary storage." },
      { q: "How much storage do I need?", a: "1TB is the minimum we recommend for a gaming PC — modern games can be 50-150GB each. If you store lots of media or games, consider 2TB. Add an HDD for bulk file storage." },
      { q: "What is PCIe Gen5?", a: "PCIe Gen5 NVMe SSDs offer speeds up to 14,000 MB/s — double Gen4. They're ideal for professional workloads and future-proofing, but Gen4 is still excellent for gaming and everyday use." },
    ]
  },
  "power-supplies": {
    intro: "A quality power supply protects your entire system and ensures stable, efficient power delivery. We stock modular and semi-modular PSUs from 450W to 1600W, rated 80+ Bronze through Titanium. Trusted brands include Corsair, Seasonic, be quiet!, EVGA, Thermaltake, and Fractal Design. Never cheap out on the PSU — it's the foundation of a reliable build.",
    guide: "Calculate your system's total power draw, then add 20-30% headroom. A typical mid-range gaming PC (RTX 4070, Ryzen 7) needs around 650W. High-end builds with an RTX 4090 should have 850W-1000W. Choose 80+ Gold efficiency or better for lower electricity bills and less heat. Modular PSUs let you connect only the cables you need, making builds cleaner and improving airflow. Check that the PSU has the right GPU power connectors — newer GPUs may need a 12VHPWR (16-pin) connector.",
    faqs: [
      { q: "How many watts do I need?", a: "For a mid-range build: 650W. For a high-end build with an RTX 4080/4090: 850W-1000W. Always leave headroom — running a PSU at 50-70% load is most efficient." },
      { q: "What does 80+ Gold mean?", a: "80+ ratings indicate power efficiency. 80+ Gold means the PSU is at least 87% efficient at typical loads, meaning less energy wasted as heat and lower electricity costs. Gold is the best value tier for most builders." },
      { q: "Modular vs non-modular?", a: "Modular PSUs let you detach unused cables, giving a cleaner build and better airflow. Semi-modular PSUs have fixed essential cables (24-pin, 8-pin CPU) with detachable extras. Non-modular have all cables permanently attached." },
    ]
  },
  "cooling": {
    intro: "Effective cooling keeps your CPU and system running quietly at peak performance. We stock tower air coolers, 120mm/240mm/360mm AIO liquid coolers, and case fans from Noctua, Corsair, Arctic, be quiet!, Deepcool, and more. Whether you need whisper-quiet operation or maximum thermal headroom for overclocking, we have the right solution.",
    guide: "For most builds, a quality tower air cooler like the Noctua NH-D15 or Deepcool AK620 offers excellent performance and reliability. AIO liquid coolers are ideal when you want a cleaner look, need to cool high-TDP processors, or have limited tower cooler clearance. 240mm AIOs suit most mid-range CPUs, while 360mm units are best for high-end chips. Don't forget case fans — good airflow with 2-3 intake and 1-2 exhaust fans keeps everything cool. Check your case's cooler height clearance and radiator mount points before buying.",
    faqs: [
      { q: "Air cooler or liquid cooler?", a: "Air coolers are reliable, quieter, and maintenance-free. AIO liquid coolers offer cleaner aesthetics and slightly better peak cooling. For most users, a high-end air cooler matches or beats a 240mm AIO. Choose 360mm AIO for enthusiast overclocking." },
      { q: "How many case fans do I need?", a: "Minimum 2-3 fans for good airflow. Ideal setup: 2-3 front intake fans and 1-2 rear/top exhaust fans. This creates positive pressure that reduces dust buildup inside the case." },
      { q: "Will this cooler fit my case?", a: "Check your case's maximum CPU cooler height (for tower coolers) or radiator mount sizes (for AIOs). Most mid-tower cases support coolers up to 160mm tall and 360mm radiators, but always verify." },
    ]
  },
  "cases": {
    intro: "Your PC case houses everything and defines the look of your build. We stock ATX mid-towers, full-towers, Micro-ATX, and Mini-ITX cases from Corsair, NZXT, Fractal Design, Lian Li, be quiet!, Phanteks, and more. From minimalist mesh-front designs for maximum airflow to sleek tempered glass showpieces for RGB builds.",
    guide: "Match your case to your motherboard size — ATX is the most common. Key things to check: maximum GPU length (measure your graphics card), CPU cooler height clearance, number of fan mounts and radiator support, and drive bays for your storage. Good cable management features (grommets, PSU shroud, tie-down points) make building easier and improve airflow. Mesh front panels offer the best cooling, while solid panels are quieter. Consider how many USB ports you want on the front panel.",
    faqs: [
      { q: "What case size should I choose?", a: "Mid-tower ATX cases are the most versatile — they fit standard ATX motherboards and full-size GPUs while remaining reasonably compact. Full towers offer more space but are very large. Mini-ITX cases are for compact builds." },
      { q: "Does the case come with fans?", a: "Most cases include 1-3 pre-installed fans. Check the product listing for details. You may want to add more fans for optimal airflow, especially in mesh-front cases that benefit from strong intake." },
      { q: "Mesh or solid front panel?", a: "Mesh front panels allow significantly more airflow, keeping components cooler — ideal for high-performance builds. Solid panels look sleeker and can be quieter, but may run hotter under load." },
    ]
  },
  "monitors": {
    intro: "The right monitor makes all the difference in your gaming and work experience. We stock 1080p, 1440p, and 4K monitors with refresh rates from 60Hz to 360Hz+. Panel types include IPS for colour accuracy, VA for contrast, and TN for speed. Top brands include ASUS, LG, Samsung, BenQ, MSI, Dell, and AOC.",
    guide: "For gaming, 1440p at 144Hz+ is the current sweet spot — you get sharp visuals and smooth motion without needing a top-tier GPU. Competitive esports players may prefer 1080p 240Hz+ for maximum responsiveness. Content creators should look for IPS panels with wide colour gamut (sRGB 100%+, DCI-P3). Ultrawide 21:9 monitors are excellent for productivity and immersive gaming. Check that your GPU can drive the resolution and refresh rate of your chosen monitor. Adaptive sync (G-Sync/FreeSync) eliminates screen tearing.",
    faqs: [
      { q: "What monitor size is best for gaming?", a: "27 inches at 1440p is the most popular gaming sweet spot. 24 inches suits 1080p. For 4K, 27-32 inches is ideal. Ultrawide 34-inch monitors offer immersive gameplay and great for productivity." },
      { q: "IPS, VA, or TN panel?", a: "IPS: Best colour accuracy and viewing angles — ideal for most users. VA: Higher contrast ratios for deeper blacks — great for dark games and movies. TN: Fastest response times but poorest colours — mainly for competitive esports." },
      { q: "Do I need G-Sync or FreeSync?", a: "Adaptive sync (G-Sync for NVIDIA GPUs, FreeSync for AMD) eliminates screen tearing without the input lag of V-Sync. Most modern FreeSync monitors also work with NVIDIA GPUs via 'G-Sync Compatible' mode." },
    ]
  },
  "keyboards": {
    intro: "From responsive mechanical switches to quiet membrane keys, we have keyboards for every preference and budget. Gaming keyboards with per-key RGB, macro keys, and N-key rollover. Productivity keyboards with ergonomic layouts and wireless connectivity. Brands include Corsair, Razer, Logitech, SteelSeries, HyperX, and Ducky.",
    guide: "Mechanical keyboards offer the best typing and gaming feel, with different switch types for different preferences: linear (Red) for smooth keypresses, tactile (Brown) for a bump feedback, and clicky (Blue) for an audible click. Hot-swappable boards let you change switches without soldering. For wireless freedom, look for low-latency 2.4GHz wireless options. Full-size keyboards have a number pad, TKL (tenkeyless) saves desk space, and 60/65% compact layouts are popular for minimalist setups.",
    faqs: [
      { q: "What keyboard switch should I choose?", a: "Red/Linear: Smooth, quiet, great for gaming. Brown/Tactile: Slight bump, good all-rounder for typing and gaming. Blue/Clicky: Loud, satisfying click — not ideal for shared spaces." },
      { q: "Wired or wireless keyboard?", a: "Wired keyboards have zero latency and never need charging. Modern 2.4GHz wireless gaming keyboards have near-identical latency to wired. Bluetooth is fine for productivity but adds slight input lag for gaming." },
    ]
  },
  "mice": {
    intro: "Precision matters — whether you're gaming, designing, or browsing. We stock gaming mice with high-DPI sensors, ultra-lightweight competition mice, ergonomic office mice, and wireless options from Logitech, Razer, SteelSeries, Corsair, Zowie, and Pulsar. Find the right shape, weight, and sensor for your grip style.",
    guide: "For gaming, look for mice with optical sensors rated 16,000+ DPI, low click latency, and a shape that suits your grip (palm, claw, or fingertip). Weight matters — sub-60g mice are popular for FPS gaming. Wireless gaming mice from Logitech and Razer now match wired performance. For productivity, ergonomic mice reduce wrist strain during long work sessions. Programmable side buttons are useful for both gaming macros and productivity shortcuts.",
    faqs: [
      { q: "What DPI should I use for gaming?", a: "Most competitive gamers use 400-1600 DPI. Higher DPI isn't better — it's about finding a sensitivity that suits your playstyle. The sensor quality matters more than the maximum DPI number." },
      { q: "Wireless gaming mice — any input lag?", a: "Modern wireless gaming mice from Logitech (Lightspeed), Razer (HyperSpeed), and others have 1ms polling rates, matching wired mice. Battery life is typically 60-100+ hours." },
    ]
  },
};

const RELATED_CATEGORIES: Record<string, string[]> = {
  "processors": ["motherboards", "cooling", "memory"],
  "graphics-cards": ["power-supplies", "cases", "monitors"],
  "motherboards": ["processors", "memory", "cases"],
  "memory": ["processors", "motherboards", "storage"],
  "storage": ["motherboards", "cases", "memory"],
  "power-supplies": ["graphics-cards", "cases", "cables-adapters"],
  "cooling": ["processors", "cases", "accessories"],
  "cases": ["motherboards", "cooling", "power-supplies"],
  "monitors": ["graphics-cards", "cables-adapters", "mice"],
  "keyboards": ["mice", "headsets-audio", "accessories"],
  "mice": ["keyboards", "headsets-audio", "monitors"],
  "headsets-audio": ["keyboards", "mice", "controllers-gaming"],
  "laptops": ["monitors", "mice", "keyboards"],
  "networking": ["cables-adapters", "accessories", "software"],
  "cables-adapters": ["monitors", "networking", "power-supplies"],
  "controllers-gaming": ["headsets-audio", "mice", "keyboards"],
  "accessories": ["keyboards", "mice", "cables-adapters"],
  "pre-built-pcs": ["monitors", "keyboards", "mice"],
  "software": ["storage", "networking", "pre-built-pcs"],
  "optical-drives": ["cables-adapters", "software", "storage"],
};

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: catLoading } = useQuery<Category>({
    queryKey: ["/api/categories", slug],
    queryFn: () => fetch(`/api/categories/${slug}`).then(r => r.json()),
  });

  const { data: products = [], isLoading: prodsLoading } = useQuery<Product[]>({
    queryKey: ["/api/categories", slug, "products"],
    queryFn: () => fetch(`/api/categories/${slug}/products`).then(r => r.json()),
    enabled: !!slug,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const { filters, setFilters, filtered, availableBrands, priceRange, activeCount, clearAll } = useProductFilters(products);

  const catContent = category ? CATEGORY_CONTENT[category.slug] : undefined;
  const relatedSlugs = category ? RELATED_CATEGORIES[category.slug] || [] : [];
  const relatedCats = categories.filter(c => relatedSlugs.includes(c.slug));
  const brands = [...new Set(products.map(p => p.vendor).filter(Boolean))];

  usePageTitle(
    category ? `Buy ${category.name} Online UK` : undefined,
    category ? `Shop ${category.name} at Thorn Tech Solutions Ltd. ${brands.slice(0, 5).join(", ")}${brands.length > 5 ? " and more" : ""}. ${products.filter(p => p.inStock).length} products in stock. Fast 1-3 day UK delivery, free over £200.` : undefined
  );

  const isLoading = catLoading || prodsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <NavBar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <h2 className="text-2xl font-display font-bold">Category Not Found</h2>
          <Link href="/"><Button>Back to Shop</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      {category && (
        <BreadcrumbJsonLd items={[
          { name: "Home", url: "/" },
          { name: category.name, url: `/category/${category.slug}` },
        ]} />
      )}

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{category.name}</span>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">{category.name}</h1>
          {category.description && <p className="text-muted-foreground">{category.description}</p>}
          <div className="h-1 w-20 bg-primary rounded-full mt-4"></div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <Button
                variant={cat.slug === slug ? "default" : "outline"}
                size="sm"
                className={cat.slug === slug ? "bg-primary" : "border-white/20 hover:bg-white/5"}
                data-testid={`button-filter-${cat.slug}`}
              >
                {cat.name}
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex gap-8">
          <ProductFilters
            filters={filters}
            setFilters={setFilters}
            availableBrands={availableBrands}
            priceRange={priceRange}
            activeCount={activeCount}
            clearAll={clearAll}
            totalCount={products.length}
            filteredCount={filtered.length}
          />

          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg mb-2">No products match your filters.</p>
                <button onClick={clearAll} className="text-primary hover:text-primary/80 text-sm" data-testid="button-clear-filters-empty">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} category={category} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {catContent && (
        <>
          {catContent.faqs.length > 0 && (
            <FAQJsonLd faqs={catContent.faqs.map(f => ({ question: f.q, answer: f.a }))} />
          )}

          <section className="py-12 border-t border-white/5">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl font-display font-bold mb-4">
                    {category.name} — <span className="text-primary">Buying Guide</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">{catContent.intro}</p>
                  <p className="text-muted-foreground leading-relaxed">{catContent.guide}</p>
                  {brands.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-display font-bold uppercase tracking-wider text-primary mb-3">Brands We Stock</h3>
                      <div className="flex flex-wrap gap-2">
                        {brands.map(b => (
                          <span key={b} className="text-xs px-2.5 py-1 rounded bg-white/5 border border-white/10 text-muted-foreground">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Fast UK Delivery</h4>
                      <p className="text-xs text-muted-foreground">1-3 working days. Free on orders over £200.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Full UK Warranty</h4>
                      <p className="text-xs text-muted-foreground">Every component is brand new with manufacturer warranty.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <Tag className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">VAT Included</h4>
                      <p className="text-xs text-muted-foreground">All prices include 20% VAT. No hidden costs at checkout.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {catContent.faqs.length > 0 && (
            <section className="py-12 bg-muted/20">
              <div className="container mx-auto px-4 max-w-3xl">
                <div className="flex items-center gap-3 mb-8">
                  <HelpCircle className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-display font-bold">{category.name} <span className="text-primary">FAQ</span></h2>
                </div>
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {catContent.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-white/10 bg-background px-5 rounded-lg">
                      <AccordionTrigger className="hover:no-underline font-bold py-4 text-sm">{faq.q}</AccordionTrigger>
                      <AccordionContent className="pb-4 text-muted-foreground text-sm leading-relaxed">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          )}
        </>
      )}

      {relatedCats.length > 0 && (
        <section className="py-10 border-t border-white/5">
          <div className="container mx-auto px-4">
            <h2 className="text-lg font-display font-bold mb-4">Related <span className="text-primary">Categories</span></h2>
            <div className="flex flex-wrap gap-3">
              {relatedCats.map(rc => (
                <Link key={rc.id} href={`/category/${rc.slug}`}>
                  <Button variant="outline" size="sm" className="border-white/20 hover:bg-primary/10 hover:border-primary/40">
                    {rc.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
