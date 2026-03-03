import { Link } from "wouter";
import { Box, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import type { Product, Category } from "@shared/schema";
import { useState } from "react";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

export default function ProductCard({ product, category }: { product: Product; category?: Category }) {
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden hover:border-primary/50 transition-colors" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square bg-black/40 flex items-center justify-center overflow-hidden cursor-pointer">
          {product.badge && (
            <div className={`absolute top-3 left-3 z-10 text-xs font-bold px-2 py-1 rounded ${product.badge === "Sale" ? "bg-red-600" : "bg-primary"}`}>{product.badge}</div>
          )}
          {!product.inStock && (
            <div className="absolute top-3 right-3 z-10 text-xs font-bold px-2 py-1 rounded bg-gray-600/80">Out of Stock</div>
          )}
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Box className="w-10 h-10 text-muted-foreground/30" />
            </div>
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
