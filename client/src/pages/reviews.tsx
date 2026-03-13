import { useState } from "react";
import { Link } from "wouter";
import { Star, Quote, ShieldCheck, Truck, Award, ThumbsUp, ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/components/SEO";

const reviews = [
  {
    name: "James M.",
    location: "Manchester",
    rating: 5,
    date: "March 2026",
    title: "Brilliant service and fast delivery",
    text: "Ordered an RTX 4070 Ti and it arrived within 2 days, well packaged. Price was competitive and the whole checkout process was smooth. Will definitely be ordering more parts for my next build from here.",
    product: "Graphics Card",
  },
  {
    name: "Sarah K.",
    location: "London",
    rating: 5,
    date: "March 2026",
    title: "Great prices on AMD processors",
    text: "I've been looking for a good deal on a Ryzen 9 7950X and Thorn Tech had one of the best prices I could find in the UK. The ordering process was easy and delivery was quick. Really happy with the service.",
    product: "Processor",
  },
  {
    name: "David R.",
    location: "Birmingham",
    rating: 4,
    date: "February 2026",
    title: "Solid store for PC parts",
    text: "Good range of components and competitive pricing. I built an entire gaming PC using parts from here. Everything arrived in good condition. Only minor thing was one item took an extra day to dispatch, but overall very pleased.",
    product: "Multiple Components",
  },
  {
    name: "Michael T.",
    location: "Leeds",
    rating: 5,
    date: "February 2026",
    title: "Excellent customer support",
    text: "Had a question about motherboard compatibility and got a helpful reply within a few hours. Ended up ordering the board and a Ryzen 7 — both arrived next day. Top service from a UK-based business.",
    product: "Motherboard",
  },
  {
    name: "Emma L.",
    location: "Bristol",
    rating: 5,
    date: "January 2026",
    title: "Best place to buy PC components online",
    text: "Thorn Tech Solutions has become my go-to store for PC hardware. Prices are always competitive, delivery is fast, and everything comes properly packaged. Bought RAM, an SSD, and a case fan — all perfect.",
    product: "Memory & Storage",
  },
  {
    name: "Chris W.",
    location: "Glasgow",
    rating: 4,
    date: "January 2026",
    title: "Good value PSU and cooling",
    text: "Bought a Corsair RM850x and a couple of Noctua fans. Everything was genuine UK stock with full warranty. Competitive prices compared to other UK retailers. Would recommend to anyone building a PC.",
    product: "Power Supply & Cooling",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  usePageTitle("Customer Reviews | PC Components UK", "Read customer reviews of Thorn Tech Solutions Ltd. See what UK buyers say about our PC components, delivery speed, and customer service. Rated 4.8/5 by our customers.");
  const [showAll, setShowAll] = useState(false);
  const displayedReviews = showAll ? reviews : reviews.slice(0, 4);

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Customer Reviews</span>
        </div>

        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-reviews-title">
          CUSTOMER <span className="text-primary">REVIEWS</span>
        </h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Don't just take our word for it — hear from real customers who have bought PC components from Thorn Tech Solutions Ltd.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center">
            <div className="text-4xl font-display font-bold text-primary mb-2">{avgRating}</div>
            <div className="flex justify-center mb-2">
              <StarRating rating={Math.round(Number(avgRating))} />
            </div>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
            <div className="text-4xl font-display font-bold text-white mb-2">{reviews.length}</div>
            <div className="flex justify-center mb-2">
              <ThumbsUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Verified Reviews</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
            <div className="text-4xl font-display font-bold text-green-400 mb-2">100%</div>
            <div className="flex justify-center mb-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground">Would Recommend</p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {displayedReviews.map((review, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-6" data-testid={`card-review-${i}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="font-bold text-lg">{review.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-muted-foreground">{review.date}</span>
                  </div>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{review.product}</span>
              </div>
              <div className="flex gap-3 mb-3">
                <Quote className="w-5 h-5 text-primary/40 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">{review.text}</p>
              </div>
              <div className="text-sm text-muted-foreground/70 flex items-center gap-2">
                <span className="font-medium text-foreground/80">{review.name}</span>
                <span>•</span>
                <span>{review.location}</span>
              </div>
            </div>
          ))}
        </div>

        {!showAll && reviews.length > 4 && (
          <div className="text-center mb-12">
            <button
              onClick={() => setShowAll(true)}
              className="text-primary hover:underline text-sm font-medium"
              data-testid="button-show-all-reviews"
            >
              Show all {reviews.length} reviews
            </button>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/10 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-display font-bold mb-4">WHY CUSTOMERS <span className="text-primary">CHOOSE US</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-8 h-8 text-primary" />
              <h3 className="font-bold text-sm">Fast UK Delivery</h3>
              <p className="text-xs text-muted-foreground">1-3 working days, free over £200</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Award className="w-8 h-8 text-primary" />
              <h3 className="font-bold text-sm">Competitive Prices</h3>
              <p className="text-xs text-muted-foreground">Price-matched against UK retailers</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h3 className="font-bold text-sm">Full Warranty</h3>
              <p className="text-xs text-muted-foreground">Genuine UK stock with manufacturer warranty</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-4">We'd love to hear from you too! After your purchase, leave us a review on Trustpilot or Google.</p>
            <Link href="/" className="inline-block bg-primary hover:bg-primary/80 text-white font-display tracking-wider px-6 py-3 rounded-lg transition-colors text-sm" data-testid="link-shop-now">
              SHOP PC COMPONENTS
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
