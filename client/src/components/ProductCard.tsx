import { Link } from "wouter";
import { Box, Monitor, Cpu, CircuitBoard, Zap, HardDrive, Fan, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import type { Product, Category } from "@shared/schema";

const iconMap: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-10 h-10 text-muted-foreground/30" />,
  Cpu: <Cpu className="w-10 h-10 text-muted-foreground/30" />,
  CircuitBoard: <CircuitBoard className="w-10 h-10 text-muted-foreground/30" />,
  Zap: <Zap className="w-10 h-10 text-muted-foreground/30" />,
  HardDrive: <HardDrive className="w-10 h-10 text-muted-foreground/30" />,
  Fan: <Fan className="w-10 h-10 text-muted-foreground/30" />,
  Box: <Box className="w-10 h-10 text-muted-foreground/30" />,
  Keyboard: <Keyboard className="w-10 h-10 text-muted-foreground/30" />,
};

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

export default function ProductCard({ product, category }: { product: Product; category?: Category }) {
  const { addItem } = useCart();

  return (
    <div className="group flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-colors" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square p-6 bg-black/40 flex items-center justify-center overflow-hidden cursor-pointer">
          {product.badge && (
            <div className={`absolute top-3 left-3 z-10 text-xs font-bold px-2 py-1 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"}`}>{product.badge}</div>
          )}
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            {iconMap[category?.icon || ""] || <Box className="w-10 h-10 text-muted-foreground/30" />}
          </div>
        </div>
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.vendor}</span>
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-lg mb-2 leading-tight flex-1 hover:text-primary cursor-pointer transition-colors" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
        </Link>
        <div className="flex items-center gap-2 mb-4">
          {product.compareAtPrice && <span className="text-muted-foreground line-through text-sm">{formatPrice(product.compareAtPrice)}</span>}
          <span className="font-display font-bold text-xl text-primary">{formatPrice(product.price)}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">inc. VAT</p>
        <div className="grid gap-2 mt-auto">
          <Button onClick={() => addItem(product)} className="w-full font-display tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/10" data-testid={`button-add-cart-${product.id}`}>
            ADD TO BASKET
          </Button>
        </div>
      </div>
    </div>
  );
}
