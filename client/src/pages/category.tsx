import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { usePageTitle, BreadcrumbJsonLd } from "@/components/SEO";
import type { Product, Category } from "@shared/schema";

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

  usePageTitle(category ? `${category.name} - Buy Online UK` : undefined);

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

      <section className="container mx-auto px-4 py-8">
        <div className="mb-10">
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

        {products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No products in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard key={p.id} product={p} category={category} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
