import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star, Quote, ShieldCheck, Truck, Award, ThumbsUp, ChevronRight, Send, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/components/SEO";

interface Review {
  id: number;
  name: string;
  location: string | null;
  rating: number;
  title: string;
  text: string;
  product: string | null;
  createdAt: string | null;
}

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

function StarInput({ rating, setRating }: { rating: number; setRating: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => setRating(i)}
          className="transition-transform hover:scale-110"
          data-testid={`star-input-${i}`}
        >
          <Star
            className={`w-8 h-8 ${i <= (hover || rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-600 hover:text-yellow-400/50"} transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function ReviewsPage() {
  usePageTitle("Customer Reviews | PC Components UK", "Read customer reviews of Thorn Tech Solutions Ltd. See what UK buyers say about our PC components, delivery speed, and customer service.");

  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
    queryFn: () => fetch("/api/reviews").then(r => r.json()),
  });

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [product, setProduct] = useState("");
  const [formError, setFormError] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, email, rating, title, text, product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      return data;
    },
    onSuccess: () => {
      setSubmitted(true);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) { setFormError("Please enter your name"); return; }
    if (rating === 0) { setFormError("Please select a star rating"); return; }
    if (!title.trim()) { setFormError("Please enter a review title"); return; }
    if (!text.trim() || text.trim().length < 10) { setFormError("Please write at least a few sentences for your review"); return; }
    submitMutation.mutate();
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <NavBar />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Customer Reviews</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold" data-testid="text-reviews-title">
              CUSTOMER <span className="text-primary">REVIEWS</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Hear from real customers who have bought PC components from Thorn Tech Solutions Ltd.
            </p>
          </div>
          {!showForm && !submitted && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-primary/80 text-white font-display tracking-wider shrink-0"
              data-testid="button-add-review"
            >
              <Send className="w-4 h-4 mr-2" />
              WRITE A REVIEW
            </Button>
          )}
        </div>

        {submitted && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8 flex items-center gap-4" data-testid="review-submitted-message">
            <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <h3 className="font-bold text-green-400">Thank you for your review!</h3>
              <p className="text-sm text-muted-foreground mt-1">Your review has been submitted and will appear on this page once it's been approved. We appreciate your feedback!</p>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white/[0.03] border border-primary/20 rounded-xl p-6 mb-8" data-testid="review-form">
            <h2 className="text-xl font-display font-bold mb-6">WRITE YOUR <span className="text-primary">REVIEW</span></h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. James M."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-review-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Manchester"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-review-location"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email (optional, not displayed)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-review-email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Product Category</label>
                  <input
                    type="text"
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                    placeholder="e.g. Graphics Card, Processor"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
                    data-testid="input-review-product"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Rating *</label>
                <StarInput rating={rating} setRating={setRating} />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Review Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Sum up your experience in a few words"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
                  data-testid="input-review-title"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Review *</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Tell us about your experience — what you bought, delivery, quality, customer service..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors resize-none"
                  data-testid="input-review-text"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400" data-testid="text-review-error">{formError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="bg-primary hover:bg-primary/80 text-white font-display tracking-wider"
                  data-testid="button-submit-review"
                >
                  {submitMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : <><Send className="w-4 h-4 mr-2" /> SUBMIT REVIEW</>}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-white/10 hover:bg-white/5"
                  data-testid="button-cancel-review"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {reviews.length > 0 && (
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
              <div className="text-4xl font-display font-bold text-green-400 mb-2">
                {reviews.length > 0 ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100) : 0}%
              </div>
              <div className="flex justify-center mb-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-sm text-muted-foreground">Would Recommend</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            Loading reviews...
          </div>
        )}

        {!isLoading && reviews.length === 0 && !submitted && (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-xl mb-8">
            <Quote className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to leave a review! We'd love to hear about your experience.</p>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/80 text-white font-display tracking-wider"
                data-testid="button-add-first-review"
              >
                <Send className="w-4 h-4 mr-2" />
                WRITE THE FIRST REVIEW
              </Button>
            )}
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-6 mb-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-6" data-testid={`card-review-${review.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <div>
                    <h3 className="font-bold text-lg">{review.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                  {review.product && (
                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{review.product}</span>
                  )}
                </div>
                <div className="flex gap-3 mb-3">
                  <Quote className="w-5 h-5 text-primary/40 shrink-0 mt-0.5" />
                  <p className="text-muted-foreground leading-relaxed">{review.text}</p>
                </div>
                <div className="text-sm text-muted-foreground/70 flex items-center gap-2">
                  <span className="font-medium text-foreground/80">{review.name}</span>
                  {review.location && (
                    <>
                      <span>•</span>
                      <span>{review.location}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
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
            {!showForm && !submitted && (
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10 text-primary font-display tracking-wider mr-4"
                data-testid="button-leave-review-bottom"
              >
                <Send className="w-4 h-4 mr-2" />
                LEAVE A REVIEW
              </Button>
            )}
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
