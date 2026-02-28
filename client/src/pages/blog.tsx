import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { Calendar, ArrowLeft, Clock, ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/components/SEO";
import type { BlogPost } from "@shared/schema";

function formatDate(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function estimateReadTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-display font-bold text-white mt-8 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-display font-bold text-white mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-3xl font-display font-bold text-white mt-10 mb-4">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="text-gray-300 ml-6 list-disc">
          {line.slice(2)}
        </li>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} className="text-white font-semibold mt-4 mb-2">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-4" />);
    } else {
      elements.push(
        <p key={i} className="text-gray-300 leading-relaxed">
          {line}
        </p>
      );
    }
  }

  return elements;
}

export function BlogListPage() {
  usePageTitle("Blog");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-purple-400 transition" data-testid="link-breadcrumb-home">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-purple-400">Blog</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4" data-testid="text-blog-title">
            Blog
          </h1>
          <p className="text-gray-400 text-lg mb-12">
            Tech tips, build guides, and the latest in PC hardware.
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-gray-400 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="block group"
                  data-testid={`card-blog-${post.id}`}
                >
                  <article className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:bg-white/[0.07]">
                    <div className="flex flex-col md:flex-row">
                      {post.image && (
                        <div className="md:w-72 md:min-h-[200px] flex-shrink-0">
                          <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-48 md:h-full object-cover"
                            data-testid={`img-blog-${post.id}`}
                          />
                        </div>
                      )}
                      <div className="p-6 flex-1">
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(post.createdAt as any)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {estimateReadTime(post.content)} min read
                          </span>
                        </div>
                        <h2 className="text-xl font-display font-bold text-white mb-2 group-hover:text-purple-400 transition" data-testid={`text-blog-title-${post.id}`}>
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-gray-400 line-clamp-2" data-testid={`text-blog-excerpt-${post.id}`}>
                            {post.excerpt}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1 mt-4 text-sm text-purple-400 group-hover:gap-2 transition-all">
                          Read more <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageTitle(post ? post.title : "Blog");

  useEffect(() => {
    fetch(`/api/blog/${params.slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setPost(data);
          setLoading(false);
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Post Not Found</h1>
          <p className="text-gray-400 mb-6">This blog post doesn't exist or has been removed.</p>
          <Link href="/blog" className="text-purple-400 hover:text-purple-300 transition" data-testid="link-back-blog">
            ← Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-purple-400 transition" data-testid="link-breadcrumb-home">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/blog" className="hover:text-purple-400 transition" data-testid="link-breadcrumb-blog">Blog</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-purple-400 truncate max-w-[200px]">{post.title}</span>
          </div>

          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition mb-6" data-testid="link-back-blog">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
              data-testid="img-blog-hero"
            />
          )}

          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4" data-testid="text-post-title">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-white/10">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(post.createdAt as any)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {estimateReadTime(post.content)} min read
            </span>
          </div>

          <div className="prose prose-invert max-w-none" data-testid="text-post-content">
            {renderContent(post.content)}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <Link href="/blog" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition" data-testid="link-back-blog-bottom">
              <ArrowLeft className="w-4 h-4" /> Back to all posts
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
