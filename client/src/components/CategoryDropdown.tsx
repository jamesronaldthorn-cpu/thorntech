import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";

const categoryGroups: { label: string; slugs: string[] }[] = [
  {
    label: "CORE COMPONENTS",
    slugs: ["processors", "graphics-cards", "graphics-cards-gpu", "motherboards", "memory", "power-supplies", "power-supply-units", "cases"],
  },
  {
    label: "STORAGE",
    slugs: ["storage", "solid-state-drives", "hard-drives", "external-storage", "optical-drives"],
  },
  {
    label: "COOLING",
    slugs: ["cooling", "coolers"],
  },
  {
    label: "DISPLAYS",
    slugs: ["monitors", "projectors", "display-accessories"],
  },
  {
    label: "PERIPHERALS",
    slugs: ["keyboards", "mice", "headsets-audio", "headsets", "speakers", "webcams", "gaming-surfaces-mats"],
  },
  {
    label: "NETWORKING",
    slugs: ["networking", "networking-wired", "networking-wireless"],
  },
  {
    label: "GAMING",
    slugs: ["controllers-gaming", "gaming-accessories", "gaming-furniture", "streaming", "capture-cards", "dj-equipment"],
  },
  {
    label: "SYSTEMS",
    slugs: ["pre-built-pcs", "laptops", "notebooks", "systems", "server-boards-systems"],
  },
  {
    label: "OTHER",
    slugs: ["cables-adapters", "cables", "adapters-docks", "chargers", "io-cards", "software", "accessories", "exclusive-bundles", "toys"],
  },
];

function GroupDropdown({ label, categories }: { label: string; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-display font-bold tracking-wider text-muted-foreground hover:text-white hover:bg-white/5 rounded-md transition-all whitespace-nowrap"
        data-testid={`button-group-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px]">
            <div className="bg-[#0f0f14] border border-white/10 rounded-lg shadow-2xl shadow-black/60 py-1 overflow-hidden">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setOpen(false)}
                >
                  <div
                    className="flex items-center px-4 py-2.5 hover:bg-primary/10 transition-colors cursor-pointer group"
                    data-testid={`link-dropdown-category-${cat.slug}`}
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-white transition-colors">{cat.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CategoryDropdown() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const catBySlug = new Map(categories.map(c => [c.slug, c]));

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {categoryGroups.map(group => {
        const groupCats = group.slugs
          .map(s => catBySlug.get(s))
          .filter((c): c is Category => !!c);
        return (
          <GroupDropdown
            key={group.label}
            label={group.label}
            categories={groupCats}
          />
        );
      })}
    </div>
  );
}
