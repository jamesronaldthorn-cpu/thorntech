import { useEffect } from "react";

export function usePageTitle(title?: string, description?: string) {
  useEffect(() => {
    const base = "Thorn Tech Solutions Ltd";
    document.title = title ? `${title} | ${base}` : `Buy PC Components Online UK | ${base}`;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = `Buy PC Components Online UK | ${base}`;
    };
  }, [title, description]);
}

export function ProductJsonLd({ product, category }: { product: { name: string; description?: string | null; price: number; image?: string | null; inStock: boolean; slug: string; vendor?: string | null; mpn?: string | null; ean?: string | null }; category?: string }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-jsonld";
    const data: any = {
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
        "itemCondition": "https://schema.org/NewCondition",
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
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": product.price >= 200 ? "0.00" : "7.99",
            "currency": "GBP"
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
    };
    if (product.mpn) data.mpn = product.mpn;
    if (product.ean) data.gtin13 = product.ean;
    script.textContent = JSON.stringify(data);
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

export function ItemListJsonLd({ products }: { products: any[] }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "itemlist-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": products.map((product, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `https://thorntechsolutionsltd.com/product/${product.slug}`
      }))
    });
    const existing = document.getElementById("itemlist-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [products]);

  return null;
}

export function FAQJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    });
    const existing = document.getElementById("faq-jsonld");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [faqs]);

  return null;
}
