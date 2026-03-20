import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, X, SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@shared/schema";

const IGNORED_SPEC_KEYS = new Set([
  "Package Type", "Package Width", "Package Length", "Package Height",
  "Gross Weight", "Net Weight", "Package Contents", "Keywords", "UPC",
  "EAN", "Product Width", "Product Length", "Product Height", "Product Weight",
  "Barcode", "MPN", "Model", "Model Number", "Item Weight", "Dimensions",
  "Box Width", "Box Height", "Box Depth", "Box Weight",
]);

const USEFUL_SPEC_KEYS_ORDER = [
  "Socket", "CPU Socket", "Socket Type", "No. of Cores", "Cores", "Threads",
  "Chipset", "Memory Types", "Memory Type", "RAM Technology", "Memory Speed",
  "Video Memory", "VRAM", "RAM Capacity", "Max. Memory Support",
  "Interface", "Bus Standard", "Form Factor", "Drive Interface", "Connection Interface",
  "Capacity", "Storage Capacity",
  "Resolution", "Max. Resolution", "Panel Type", "Refresh Rate", "Screen Size",
  "Form Factor", "Wattage", "Power Output", "Efficiency Rating",
  "Wireless Technology", "Connectivity", "Connection Type",
  "Switch Type", "Switch", "Layout",
  "Colour", "Color",
  "Warranty",
];

interface FilterState {
  brands: string[];
  priceMin: string;
  priceMax: string;
  search: string;
  sortBy: string;
  inStockOnly: boolean;
  specs: Record<string, string[]>;
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
    inStockOnly: false,
    specs: {},
  });

  const availableBrands = useMemo(() => {
    const brands = new Map<string, number>();
    products.forEach(p => {
      if (p.vendor) {
        const v = p.vendor.trim();
        if (v) brands.set(v, (brands.get(v) || 0) + 1);
      }
    });
    return Array.from(brands.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map(p => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const availableSpecs = useMemo(() => {
    const specMap = new Map<string, Map<string, number>>();
    products.forEach(p => {
      if (!p.specs) return;
      try {
        const specs = JSON.parse(p.specs as string);
        Object.entries(specs).forEach(([key, value]) => {
          if (IGNORED_SPEC_KEYS.has(key)) return;
          const val = String(value).trim();
          if (!val || val.length > 60 || val.length < 1) return;
          if (!specMap.has(key)) specMap.set(key, new Map());
          const vm = specMap.get(key)!;
          vm.set(val, (vm.get(val) || 0) + 1);
        });
      } catch {}
    });

    const result: { key: string; values: [string, number][] }[] = [];
    const orderedKeys = [
      ...USEFUL_SPEC_KEYS_ORDER.filter(k => specMap.has(k)),
      ...Array.from(specMap.keys()).filter(k => !USEFUL_SPEC_KEYS_ORDER.includes(k) && !IGNORED_SPEC_KEYS.has(k)),
    ];

    for (const key of orderedKeys) {
      const vm = specMap.get(key);
      if (!vm) continue;
      const values = Array.from(vm.entries()).sort((a, b) => b[1] - a[1]);
      if (values.length < 2 || values.length > 25) continue;
      result.push({ key, values });
      if (result.length >= 6) break;
    }
    return result;
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (filters.inStockOnly) {
      result = result.filter(p => p.inStock);
    }

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
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.mpn && p.mpn.toLowerCase().includes(q))
      );
    }

    const activeSpecFilters = Object.entries(filters.specs).filter(([, vals]) => vals.length > 0);
    if (activeSpecFilters.length > 0) {
      result = result.filter(p => {
        if (!p.specs) return false;
        try {
          const specs = JSON.parse(p.specs as string);
          return activeSpecFilters.every(([key, vals]) => {
            const v = specs[key];
            if (!v) return false;
            return vals.some(fv => String(v).toLowerCase().includes(fv.toLowerCase()) || fv.toLowerCase().includes(String(v).toLowerCase()));
          });
        } catch {
          return false;
        }
      });
    }

    switch (filters.sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "name-asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": result.sort((a, b) => b.name.localeCompare(a.name)); break;
    }

    return result;
  }, [products, filters]);

  const activeCount =
    (filters.brands.length > 0 ? 1 : 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    Object.values(filters.specs).filter(v => v.length > 0).length;

  const clearAll = () => setFilters({
    brands: [], priceMin: "", priceMax: "", search: "",
    sortBy: "default", inStockOnly: false, specs: {},
  });

  return { filters, setFilters, filtered, availableBrands, priceRange, activeCount, clearAll, availableSpecs };
}

function CheckRow({ checked, label, count, onClick, testId }: {
  checked: boolean; label: string; count?: number; onClick: () => void; testId?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 py-1 cursor-pointer hover:text-primary transition-colors text-sm group"
      data-testid={testId}
    >
      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
        checked ? "bg-primary border-primary" : "border-white/20 group-hover:border-primary/50"
      }`}>
        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </div>
      <span className="flex-1 truncate text-xs">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground flex-shrink-0">({count})</span>}
    </div>
  );
}

function FilterSection({ title, open, onToggle, children, testId }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode; testId?: string;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-2 border-b border-white/10"
        data-testid={testId}
      >
        <span className="font-display font-bold text-xs tracking-wider uppercase">{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
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
  availableSpecs,
}: {
  filters: FilterState;
  setFilters: (f: FilterState | ((prev: FilterState) => FilterState)) => void;
  availableBrands: [string, number][];
  priceRange: { min: number; max: number };
  activeCount: number;
  clearAll: () => void;
  totalCount: number;
  filteredCount: number;
  availableSpecs: { key: string; values: [string, number][] }[];
}) {
  const [brandOpen, setBrandOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [openSpecs, setOpenSpecs] = useState<Record<string, boolean>>({});
  const BRANDS_SHOWN = 8;

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return availableBrands;
    const q = brandSearch.toLowerCase();
    return availableBrands.filter(([name]) => name.toLowerCase().includes(q));
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

  const toggleSpec = (key: string, val: string) => {
    setFilters(prev => {
      const cur = prev.specs[key] || [];
      return {
        ...prev,
        specs: {
          ...prev.specs,
          [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val],
        },
      };
    });
  };

  const sidebar = (
    <div className="space-y-5">
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
        <p className="text-xs text-muted-foreground -mt-2">
          Showing {filteredCount} of {totalCount} products
        </p>
      )}

      <div className="space-y-1.5">
        <Input
          type="text"
          placeholder="Search by model, keyword..."
          value={filters.search}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="bg-black/40 border-white/10 h-9 text-sm"
          data-testid="input-filter-model"
        />
      </div>

      <div
        onClick={() => setFilters(prev => ({ ...prev, inStockOnly: !prev.inStockOnly }))}
        className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors group"
        data-testid="filter-in-stock"
      >
        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          filters.inStockOnly ? "bg-primary border-primary" : "border-white/20 group-hover:border-primary/50"
        }`}>
          {filters.inStockOnly && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
        <span className="text-xs font-medium">In Stock Only</span>
      </div>

      <FilterSection title="Brand" open={brandOpen} onToggle={() => setBrandOpen(!brandOpen)} testId="button-toggle-brand-filter">
        <div className="space-y-0.5">
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
            <CheckRow
              key={brand}
              checked={filters.brands.includes(brand)}
              label={brand}
              count={count}
              onClick={() => toggleBrand(brand)}
              testId={`filter-brand-${brand.replace(/\s+/g, '-').toLowerCase()}`}
            />
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
      </FilterSection>

      {availableSpecs.map(({ key, values }) => (
        <FilterSection
          key={key}
          title={key}
          open={openSpecs[key] ?? true}
          onToggle={() => setOpenSpecs(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))}
          testId={`button-toggle-spec-${key.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <div className="space-y-0.5">
            {values.map(([val, count]) => (
              <CheckRow
                key={val}
                checked={(filters.specs[key] || []).includes(val)}
                label={val}
                count={count}
                onClick={() => toggleSpec(key, val)}
                testId={`filter-spec-${key.replace(/\s+/g, '-').toLowerCase()}-${val.replace(/\s+/g, '-').toLowerCase()}`}
              />
            ))}
          </div>
        </FilterSection>
      ))}

      <FilterSection title="Price Range" open={priceOpen} onToggle={() => setPriceOpen(!priceOpen)} testId="button-toggle-price-filter">
        <div className="space-y-3">
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
      </FilterSection>

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
      <div className="lg:hidden mb-4 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="border-white/20 gap-2"
          data-testid="button-mobile-filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters {activeCount > 0 && `(${activeCount} active)`}
        </Button>
        {mobileOpen && (
          <div className="mt-4 p-4 bg-card border border-white/10 rounded-xl">
            {sidebar}
          </div>
        )}
      </div>

      <aside className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto p-4 bg-card/50 border border-white/5 rounded-xl [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          {sidebar}
        </div>
      </aside>
    </>
  );
}
