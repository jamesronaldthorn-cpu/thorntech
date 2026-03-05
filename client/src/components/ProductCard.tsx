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
  processors: <Cpu className="w-12 h-12" />,
  "graphics-cards": <Monitor className="w-12 h-12" />,
  motherboards: <CircuitBoard className="w-12 h-12" />,
  memory: <MemoryStick className="w-12 h-12" />,
  storage: <HardDrive className="w-12 h-12" />,
  "power-supplies": <Zap className="w-12 h-12" />,
  cooling: <Fan className="w-12 h-12" />,
  cases: <Box className="w-12 h-12" />,
  keyboards: <Keyboard className="w-12 h-12" />,
  mice: <Mouse className="w-12 h-12" />,
  networking: <Wifi className="w-12 h-12" />,
  speakers: <Speaker className="w-12 h-12" />,
  headsets: <Headset className="w-12 h-12" />,
  cables: <Cable className="w-12 h-12" />,
  servers: <Server className="w-12 h-12" />,
};

function PlaceholderImage({ product, category }: { product: Product; category?: Category }) {
  const icon = category?.slug ? categoryIcons[category.slug] : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900/80 via-gray-850 to-gray-900 p-6">
      <div className="text-primary/20 mb-2">
        {icon || <Box className="w-8 h-8" />}
      </div>
      {product.vendor && (
        <span className="text-[9px] uppercase tracking-[0.15em] text-white/20 font-display">{product.vendor}</span>
      )}
    </div>
  );
}

export default function ProductCard({ product, category }: { product: Product; category?: Category }) {
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const hasImage = product.image && !imgError;

  return (
    <div className="group flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-colors" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className={`relative aspect-square flex items-center justify-center overflow-hidden cursor-pointer ${hasImage ? "bg-white" : ""}`}>
          {product.badge && (
            <div className={`absolute top-3 left-3 z-10 text-xs font-bold px-2 py-1 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"} text-white`}>{product.badge}</div>
          )}
          {!product.inStock && (
            <div className="absolute top-3 right-3 z-10 text-xs font-bold px-2 py-1 rounded bg-gray-600/80 text-white">Out of Stock</div>
          )}
          {hasImage ? (
            <img
              src={product.image!}
              alt={product.name}
              className="w-full h-full object-contain p-3 product-image"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <PlaceholderImage product={product} category={category} />
          )}
        </div>
      </Link>
      <div className="p-4 flex-1 flex flex-col">
        {product.vendor && (
          <span className="text-xs text-primary/70 uppercase tracking-wider mb-1 font-medium">{product.vendor}</span>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-sm mb-2 leading-tight flex-1 hover:text-primary cursor-pointer transition-colors line-clamp-2" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
        </Link>
        <div className="flex items-baseline gap-2 mb-1">
          {product.compareAtPrice && <span className="text-muted-foreground line-through text-xs">{formatPrice(product.compareAtPrice)}</span>}
          <span className="font-display font-bold text-lg text-primary">{formatPrice(product.price)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">inc. VAT</p>
        <Button
          onClick={() => addItem(product)}
          disabled={!product.inStock}
          className="w-full font-display tracking-widest text-xs bg-white/10 hover:bg-primary/80 hover:text-white text-white border border-white/10 transition-all"
          data-testid={`button-add-cart-${product.id}`}
        >
          <ShoppingBasket className="w-3.5 h-3.5 mr-1.5" />
          {product.inStock ? "ADD TO BASKET" : "OUT OF STOCK"}
        </Button>
      </div>
    </div>
  );
}
