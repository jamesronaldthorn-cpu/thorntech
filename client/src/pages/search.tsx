import { useQuery } from "@tanstack/react-query";
import { useSearch, Link, useLocation } from "wouter";
import { ChevronRight, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductFilters, { useProductFilters } from "@/components/ProductFilters";
import { usePageTitle } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";

export default function SearchPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const query = params.get("q") || "";
  const [, setLocation] = useLocation();
  const [localQuery, setLocalQuery] = useState(query);

  usePageTitle(query ? `Search: ${query}` : "Search");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/search", query],
    queryFn: () => fetch(`/api/products/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
    enabled: query.length >= 2,
  });

  const { filters, setFilters, filtered, availableBrands, priceRange, activeCount, clearAll } = useProductFilters(products);
  const catMap = new Map(categories.map(c => [c.id, c]));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Search</span>
        </div>
      </div>

      <section className="container mx-auto px-4 py-8 flex-1">
        <form onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const q = localQuery.trim();
          if (q.length >= 2) setLocation(`/search?q=${encodeURIComponent(q)}`);
        }} className="mb-8 relative max-w-xl">
          <Input
            type="text"
            placeholder="Search products..."
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            className="w-full bg-black/50 border-white/20 focus-visible:ring-primary pl-4 pr-10 h-12 text-lg"
            data-testid="input-search-page"
            autoFocus
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          </button>
        </form>

        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold mb-2" data-testid="text-search-heading">
            {query ? `Results for "${query}"` : "Search Products"}
          </h1>
          {query && !isLoading && (
            <p className="text-muted-foreground" data-testid="text-search-count">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
              {activeCount > 0 && ` (filtered from ${products.length})`}
            </p>
          )}
          <div className="h-1 w-20 bg-primary rounded-full mt-4"></div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Searching...</div>
          </div>
        ) : !query || query.length < 2 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Enter at least 2 characters to search</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg mb-2">No products found for "{query}"</p>
            <p className="text-sm">Try different keywords or browse our categories</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {categories.slice(0, 8).map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <span className="inline-block px-3 py-1.5 text-sm border border-white/20 rounded-full hover:bg-white/5 hover:border-primary/50 transition-colors cursor-pointer">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map(p => (
                    <ProductCard key={p.id} product={p} category={p.categoryId ? catMap.get(p.categoryId) : undefined} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
