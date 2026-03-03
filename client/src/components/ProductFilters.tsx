import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@shared/schema";

interface FilterState {
  brands: string[];
  priceMin: string;
  priceMax: string;
  search: string;
  sortBy: string;
}

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

export function useProductFilters(products: Product[]) {
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    priceMin: "",
    priceMax: "",
    search: "",
    sortBy: "default",
  });

  const availableBrands = useMemo(() => {
    const brands = new Map<string, number>();
    products.forEach(p => {
      if (p.vendor) {
        const v = p.vendor.trim();
        if (v) brands.set(v, (brands.get(v) || 0) + 1);
      }
    });
    return Array.from(brands.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [products]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map(p => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (filters.brands.length > 0) {
      result = result.filter(p => p.vendor && filters.brands.includes(p.vendor.trim()));
    }

    const min = parseFloat(filters.priceMin);
    const max = parseFloat(filters.priceMax);
    if (!isNaN(min)) result = result.filter(p => p.price >= min);
    if (!isNaN(max)) result = result.filter(p => p.price <= max);

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.vendor && p.vendor.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    switch (filters.sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "name-asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": result.sort((a, b) => b.name.localeCompare(a.name)); break;
    }

    return result;
  }, [products, filters]);

  const activeCount = (filters.brands.length > 0 ? 1 : 0)
    + (filters.priceMin ? 1 : 0)
    + (filters.priceMax ? 1 : 0)
    + (filters.search ? 1 : 0);

  const clearAll = () => setFilters({ brands: [], priceMin: "", priceMax: "", search: "", sortBy: "default" });

  return { filters, setFilters, filtered, availableBrands, priceRange, activeCount, clearAll };
}

export default function ProductFilters({
  filters,
  setFilters,
  availableBrands,
  priceRange,
  activeCount,
  clearAll,
  totalCount,
  filteredCount,
}: {
  filters: FilterState;
  setFilters: (f: FilterState | ((prev: FilterState) => FilterState)) => void;
  availableBrands: [string, number][];
  priceRange: { min: number; max: number };
  activeCount: number;
  clearAll: () => void;
  totalCount: number;
  filteredCount: number;
}) {
  const [brandOpen, setBrandOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const BRANDS_SHOWN = 8;
  const [showAllBrands, setShowAllBrands] = useState(false);

  const filteredBrands = useMemo(() => {
    let b = availableBrands;
    if (brandSearch) {
      const q = brandSearch.toLowerCase();
      b = b.filter(([name]) => name.toLowerCase().includes(q));
    }
    return b;
  }, [availableBrands, brandSearch]);

  const displayBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, BRANDS_SHOWN);

  const toggleBrand = (brand: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  const sidebar = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          Filters
        </h3>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            data-testid="button-clear-filters"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {activeCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredCount} of {totalCount} products
        </p>
      )}

      <div className="space-y-1">
        <Input
          type="text"
          placeholder="Filter by model / keyword..."
          value={filters.search}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="bg-black/40 border-white/10 h-9 text-sm"
          data-testid="input-filter-model"
        />
      </div>

      <div>
        <button
          onClick={() => setBrandOpen(!brandOpen)}
          className="flex items-center justify-between w-full py-2 border-b border-white/10"
          data-testid="button-toggle-brand-filter"
        >
          <span className="font-display font-bold text-xs tracking-wider uppercase">Brand</span>
          {brandOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {brandOpen && (
          <div className="pt-3 space-y-1">
            {availableBrands.length > BRANDS_SHOWN && (
              <Input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                className="bg-black/40 border-white/10 h-8 text-xs mb-2"
                data-testid="input-search-brands"
              />
            )}
            {displayBrands.map(([brand, count]) => (
              <label
                key={brand}
                className="flex items-center gap-2 py-1 cursor-pointer hover:text-primary transition-colors text-sm group"
                data-testid={`filter-brand-${brand.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  filters.brands.includes(brand)
                    ? "bg-primary border-primary"
                    : "border-white/20 group-hover:border-primary/50"
                }`}>
                  {filters.brands.includes(brand) && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                      <path d="M3 6l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="flex-1 truncate">{brand}</span>
                <span className="text-xs text-muted-foreground">({count})</span>
              </label>
            ))}
            {filteredBrands.length > BRANDS_SHOWN && (
              <button
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                data-testid="button-show-more-brands"
              >
                {showAllBrands ? "Show less" : `Show all ${filteredBrands.length} brands`}
              </button>
            )}
            {filteredBrands.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">No brands found</p>
            )}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setPriceOpen(!priceOpen)}
          className="flex items-center justify-between w-full py-2 border-b border-white/10"
          data-testid="button-toggle-price-filter"
        >
          <span className="font-display font-bold text-xs tracking-wider uppercase">Price Range</span>
          {priceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {priceOpen && (
          <div className="pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                <Input
                  type="number"
                  placeholder={String(priceRange.min)}
                  value={filters.priceMin}
                  onChange={e => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                  className="bg-black/40 border-white/10 h-9 text-sm pl-6"
                  data-testid="input-price-min"
                  min={0}
                />
              </div>
              <span className="text-muted-foreground text-sm">–</span>
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                <Input
                  type="number"
                  placeholder={String(priceRange.max)}
                  value={filters.priceMax}
                  onChange={e => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                  className="bg-black/40 border-white/10 h-9 text-sm pl-6"
                  data-testid="input-price-max"
                  min={0}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Under £50", min: "", max: "50" },
                { label: "£50–£100", min: "50", max: "100" },
                { label: "£100–£250", min: "100", max: "250" },
                { label: "£250–£500", min: "250", max: "500" },
                { label: "£500+", min: "500", max: "" },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setFilters(prev => ({ ...prev, priceMin: preset.min, priceMax: preset.max }))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filters.priceMin === preset.min && filters.priceMax === preset.max
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-white/10 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`button-price-preset-${preset.label.replace(/[^a-z0-9]/gi, '')}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="font-display font-bold text-xs tracking-wider uppercase block mb-2">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          className="w-full bg-black/40 border border-white/10 rounded-md h-9 text-sm px-2 text-foreground"
          data-testid="select-sort"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="border-white/20 gap-2"
          data-testid="button-mobile-filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters {activeCount > 0 && `(${activeCount})`}
        </Button>
        {mobileOpen && (
          <div className="mt-4 p-4 bg-card border border-white/10 rounded-xl">
            {sidebar}
          </div>
        )}
      </div>

      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-4 p-4 bg-card/50 border border-white/5 rounded-xl">
          {sidebar}
        </div>
      </aside>
    </>
  );
}
