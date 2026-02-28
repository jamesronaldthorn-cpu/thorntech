import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
}

export function usePageTitle(title?: string) {
  useEffect(() => {
    const base = "Thorn Tech Solutions Ltd";
    document.title = title ? `${title} | ${base}` : `${base} | PC Components & Hardware | UK`;
    return () => {
      document.title = `${base} | PC Components & Hardware | UK`;
    };
  }, [title]);
}

export function ProductJsonLd({ product, category }: { product: { name: string; description?: string | null; price: number; image?: string | null; inStock: boolean; slug: string; vendor?: string | null }; category?: string }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description || product.name,
      "image": product.image || "",
      "url": `https://thorntechsolutionsltd.com/product/${product.slug}`,
      "brand": {
        "@type": "Brand",
        "name": product.vendor || "Thorn Tech Solutions"
      },
      "category": category || "PC Components",
      "offers": {
        "@type": "Offer",
        "price": product.price.toFixed(2),
        "priceCurrency": "GBP",
        "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Thorn Tech Solutions Ltd"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "GB"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "d" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "d" }
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail"
        }
      }
    });
    const existing = document.getElementById("product-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [product]);

  return null;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "breadcrumb-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": item.name,
        "item": `https://thorntechsolutionsltd.com${item.url}`
      }))
    });
    const existing = document.getElementById("breadcrumb-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [items]);

  return null;
}
