import { Link } from "wouter";
import { Cpu, Monitor, HardDrive, Zap, Fan, Box, Keyboard, MemoryStick, Cable, Mouse, Wifi, Speaker, Headset, CircuitBoard, Server, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import type { Product, Category } from "@shared/schema";
import { useState } from "react";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

const categoryIcons: Record<string, React.ReactNode> = {
  processors: <Cpu className="w-8 h-8" />,
  "graphics-cards": <Monitor className="w-8 h-8" />,
  motherboards: <CircuitBoard className="w-8 h-8" />,
  memory: <MemoryStick className="w-8 h-8" />,
  storage: <HardDrive className="w-8 h-8" />,
  "power-supplies": <Zap className="w-8 h-8" />,
  cooling: <Fan className="w-8 h-8" />,
  cases: <Box className="w-8 h-8" />,
  keyboards: <Keyboard className="w-8 h-8" />,
  mice: <Mouse className="w-8 h-8" />,
  networking: <Wifi className="w-8 h-8" />,
  speakers: <Speaker className="w-8 h-8" />,
  headsets: <Headset className="w-8 h-8" />,
  cables: <Cable className="w-8 h-8" />,
  servers: <Server className="w-8 h-8" />,
};

function PlaceholderImage({ product, category }: { product: Product; category?: Category }) {
  const icon = category?.slug ? categoryIcons[category.slug] : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#111] border-b border-white/5">
      <div className="text-white/10 mb-1">
        {icon || <Box className="w-8 h-8" />}
      </div>
      {product.vendor && (
        <span className="text-[8px] uppercase tracking-[0.2em] text-white/15 font-display">{product.vendor}</span>
      )}
    </div>
  );
}

export default function ProductCard({ product, category }: { product: Product; category?: Category }) {
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const hasImage = product.image && !imgError;

  return (
    <div className="group flex flex-col bg-card border border-white/5 rounded-lg overflow-hidden hover:border-primary/40 transition-colors" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className={`relative aspect-[4/3] flex items-center justify-center overflow-hidden cursor-pointer ${hasImage ? "bg-white" : ""}`}>
          {product.badge && (
            <div className={`absolute top-2 left-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"} text-white`}>{product.badge}</div>
          )}
          {!product.inStock && (
            <div className="absolute top-2 right-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-700/90 text-white">Out of Stock</div>
          )}
          {hasImage ? (
            <img
              src={product.image!}
              alt={product.name}
              className="w-full h-full object-contain p-2"
              style={{ imageRendering: "auto" }}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <PlaceholderImage product={product} category={category} />
          )}
        </div>
      </Link>
      <div className="p-3 flex-1 flex flex-col">
        {product.vendor && (
          <span className="text-[10px] text-primary/70 uppercase tracking-wider mb-0.5 font-medium">{product.vendor}</span>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-xs mb-1.5 leading-tight flex-1 hover:text-primary cursor-pointer transition-colors line-clamp-2" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
        </Link>
        <div className="flex items-baseline gap-1.5 mb-0.5">
          {product.compareAtPrice && <span className="text-muted-foreground line-through text-[10px]">{formatPrice(product.compareAtPrice)}</span>}
          <span className="font-display font-bold text-base text-primary">{formatPrice(product.price)}</span>
        </div>
        <p className="text-[9px] text-muted-foreground mb-2">inc. VAT</p>
        <Button
          onClick={() => addItem(product)}
          disabled={!product.inStock}
          size="sm"
          className="w-full font-display tracking-widest text-[10px] h-8 bg-white/10 hover:bg-primary/80 hover:text-white text-white border border-white/10 transition-all"
          data-testid={`button-add-cart-${product.id}`}
        >
          <ShoppingBasket className="w-3 h-3 mr-1" />
          {product.inStock ? "ADD TO BASKET" : "OUT OF STOCK"}
        </Button>
      </div>
    </div>
  );
}
