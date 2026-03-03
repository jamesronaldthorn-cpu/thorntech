import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";

export default function CategoryDropdown() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cols = categories.length > 12 ? 4 : categories.length > 6 ? 3 : 2;

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-display font-bold tracking-wider text-white hover:text-primary transition-colors whitespace-nowrap py-3"
        data-testid="button-categories-dropdown"
      >
        COMPONENTS
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-[calc(5rem+3rem)] bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-0 z-50 min-w-[320px]">
            <div className="bg-[#0f0f14] border border-white/10 rounded-lg shadow-2xl shadow-black/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-xs font-display tracking-widest text-primary uppercase">Browse by Category</span>
              </div>
              <div className={`grid gap-0 ${cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2"}`} style={{ minWidth: cols === 4 ? "480px" : cols === 3 ? "400px" : "320px" }}>
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    onClick={() => setOpen(false)}
                  >
                    <div
                      className="flex items-center gap-2 px-4 py-3 hover:bg-primary/10 border-b border-r border-white/5 transition-colors cursor-pointer group"
                      data-testid={`link-dropdown-category-${cat.slug}`}
                    >
                      <ChevronDown className="w-3 h-3 text-primary/50 -rotate-90 group-hover:text-primary transition-colors" />
                      <span className="text-sm text-muted-foreground group-hover:text-white transition-colors whitespace-nowrap">{cat.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
