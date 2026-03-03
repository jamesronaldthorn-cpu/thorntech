import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import type { Category } from "@shared/schema";

export default function CategoryDropdown() {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center flex-1 min-w-0">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 h-full px-1 bg-gradient-to-r from-background to-transparent"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onLoad={checkScroll}
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map(cat => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-display tracking-wider text-muted-foreground hover:text-white hover:bg-white/5 transition-all cursor-pointer whitespace-nowrap"
              data-testid={`link-category-tab-${cat.slug}`}
            >
              {cat.name.toUpperCase()}
            </div>
          </Link>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 h-full px-1 bg-gradient-to-l from-background to-transparent"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
