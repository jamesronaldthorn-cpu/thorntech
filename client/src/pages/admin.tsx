import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package, Tag, ShoppingCart, Plus, Pencil, Trash2, LogOut,
  Eye, EyeOff, X, Save, Search, ChevronDown, ChevronUp, Rss, Upload, Copy, ExternalLink, Download, Loader2, CheckCircle, AlertCircle, Users, KeyRound, BarChart3, TrendingUp, Globe, Calendar
} from "lucide-react";
import type { Product, Category, Order, CustomFeed, FeedSource } from "@shared/schema";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  createdAt: string | null;
}

function adminFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("admin_token") || "";
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem("admin_token", password);
        onLogin();
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-display text-white tracking-wider" data-testid="text-admin-title">ADMIN PANEL</h1>
          <p className="text-gray-500 text-sm mt-1">Thorn Tech Solutions Ltd</p>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-400">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            placeholder="Enter admin password"
            data-testid="input-admin-password"
          />
        </div>
        {error && <p className="text-red-500 text-sm" data-testid="text-login-error">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-admin-login">
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}

function ProductForm({ product, categories, onSave, onCancel }: {
  product?: Product;
  categories: Category[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    price: product?.price?.toString() || "",
    compareAtPrice: product?.compareAtPrice?.toString() || "",
    categoryId: product?.categoryId?.toString() || "",
    image: product?.image || "",
    badge: product?.badge || "",
    inStock: product?.inStock !== false,
    vendor: product?.vendor || "",
  });

  const updateField = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      slug: form.slug || autoSlug(form.name),
      description: form.description || null,
      price: parseFloat(form.price),
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      image: form.image || null,
      badge: form.badge || null,
      inStock: form.inStock,
      vendor: form.vendor || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-display text-white tracking-wider">{product ? "EDIT PRODUCT" : "ADD PRODUCT"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Name *</Label>
          <Input value={form.name} onChange={e => { updateField("name", e.target.value); if (!product) updateField("slug", autoSlug(e.target.value)); }} className="bg-white/5 border-white/10 text-white" required data-testid="input-product-name" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Slug</Label>
          <Input value={form.slug} onChange={e => updateField("slug", e.target.value)} className="bg-white/5 border-white/10 text-white" data-testid="input-product-slug" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Price (£) *</Label>
          <Input type="number" step="0.01" value={form.price} onChange={e => updateField("price", e.target.value)} className="bg-white/5 border-white/10 text-white" required data-testid="input-product-price" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Compare At Price (£)</Label>
          <Input type="number" step="0.01" value={form.compareAtPrice} onChange={e => updateField("compareAtPrice", e.target.value)} className="bg-white/5 border-white/10 text-white" data-testid="input-product-compare-price" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Category</Label>
          <select value={form.categoryId} onChange={e => updateField("categoryId", e.target.value)} className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm" data-testid="select-product-category">
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Vendor</Label>
          <Input value={form.vendor} onChange={e => updateField("vendor", e.target.value)} className="bg-white/5 border-white/10 text-white" data-testid="input-product-vendor" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Image URL</Label>
          <Input value={form.image} onChange={e => updateField("image", e.target.value)} className="bg-white/5 border-white/10 text-white" data-testid="input-product-image" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Badge</Label>
          <Input value={form.badge} onChange={e => updateField("badge", e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="e.g. NEW, SALE, HOT" data-testid="input-product-badge" />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label className="text-gray-400 text-xs">Description</Label>
          <textarea value={form.description} onChange={e => updateField("description", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm resize-none" data-testid="input-product-description" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.inStock} onChange={e => updateField("inStock", e.target.checked)} id="inStock" className="accent-purple-600" data-testid="checkbox-product-instock" />
          <Label htmlFor="inStock" className="text-gray-400 text-xs cursor-pointer">In Stock</Label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" data-testid="button-save-product"><Save className="w-4 h-4 mr-1" /> Save</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="border-white/10 text-gray-400 hover:bg-white/5" data-testid="button-cancel-product"><X className="w-4 h-4 mr-1" /> Cancel</Button>
      </div>
    </form>
  );
}

function CategoryForm({ category, onSave, onCancel }: {
  category?: Category;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    icon: category?.icon || "",
  });

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      slug: form.slug || autoSlug(form.name),
      description: form.description || null,
      icon: form.icon || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-display text-white tracking-wider">{category ? "EDIT CATEGORY" : "ADD CATEGORY"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Name *</Label>
          <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (!category) setForm(f => ({ ...f, slug: autoSlug(e.target.value) })); }} className="bg-white/5 border-white/10 text-white" required data-testid="input-category-name" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Slug</Label>
          <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="bg-white/5 border-white/10 text-white" data-testid="input-category-slug" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Icon (Lucide name)</Label>
          <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="e.g. Monitor, Cpu, HardDrive" data-testid="input-category-icon" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Description</Label>
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" data-testid="input-category-description" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" data-testid="button-save-category"><Save className="w-4 h-4 mr-1" /> Save</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="border-white/10 text-gray-400 hover:bg-white/5" data-testid="button-cancel-category"><X className="w-4 h-4 mr-1" /> Cancel</Button>
      </div>
    </form>
  );
}

function FeedForm({ feed, onSave, onCancel }: {
  feed?: CustomFeed;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(feed?.name || "");
  const [slug, setSlug] = useState(feed?.slug || "");
  const [content, setContent] = useState(feed?.content || "");
  const [uploadMode, setUploadMode] = useState(false);

  const autoSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string);
      if (!name) {
        const fileName = file.name.replace(/\.xml$/i, "");
        setName(fileName);
        if (!feed) setSlug(autoSlug(fileName));
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      slug: slug || autoSlug(name),
      content,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-display text-white tracking-wider">{feed ? "EDIT FEED" : "ADD CUSTOM FEED"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Feed Name *</Label>
          <Input value={name} onChange={e => { setName(e.target.value); if (!feed) setSlug(autoSlug(e.target.value)); }} className="bg-white/5 border-white/10 text-white" required placeholder="e.g. Google Merchant Custom" data-testid="input-feed-name" />
        </div>
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">URL Slug (serves at /feeds/custom/slug)</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="auto-generated" data-testid="input-feed-slug" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-gray-400 text-xs">XML Content *</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setUploadMode(false)} className={`text-xs px-2 py-1 rounded ${!uploadMode ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`} data-testid="button-paste-mode">Paste XML</button>
            <button type="button" onClick={() => setUploadMode(true)} className={`text-xs px-2 py-1 rounded ${uploadMode ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`} data-testid="button-upload-mode"><Upload className="w-3 h-3 inline mr-1" />Upload File</button>
          </div>
        </div>
        {uploadMode ? (
          <div className="border border-dashed border-white/20 rounded-lg p-6 text-center">
            <input type="file" accept=".xml,text/xml,application/xml" onChange={handleFileUpload} className="hidden" id="xml-upload" data-testid="input-feed-file" />
            <label htmlFor="xml-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Click to upload an XML file</p>
              <p className="text-gray-600 text-xs mt-1">or drag and drop</p>
            </label>
            {content && <p className="text-green-400 text-xs mt-3">File loaded ({content.length.toLocaleString()} characters)</p>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm font-mono resize-y"
            placeholder='<?xml version="1.0" encoding="UTF-8"?>...'
            required
            data-testid="input-feed-content"
          />
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={!content} data-testid="button-save-feed"><Save className="w-4 h-4 mr-1" /> Save Feed</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="border-white/10 text-gray-400 hover:bg-white/5" data-testid="button-cancel-feed"><X className="w-4 h-4 mr-1" /> Cancel</Button>
      </div>
    </form>
  );
}

type Tab = "dashboard" | "products" | "categories" | "orders" | "feeds" | "users";

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("admin_token"));
  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<{ today: number; week: number; month: number; total: number; topPages: { path: string; views: number }[]; recentDays: { date: string; views: number }[] } | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [userMessage, setUserMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingFeed, setEditingFeed] = useState<CustomFeed | null>(null);
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importCategoryId, setImportCategoryId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [runningSource, setRunningSource] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [pRes, cRes, oRes, fRes, sRes, uRes, stRes] = await Promise.all([
        adminFetch("/api/admin/products"),
        adminFetch("/api/admin/categories"),
        adminFetch("/api/admin/orders"),
        adminFetch("/api/admin/feeds"),
        adminFetch("/api/admin/feed-sources"),
        adminFetch("/api/admin/users"),
        adminFetch("/api/admin/stats"),
      ]);
      if (pRes.status === 401) { localStorage.removeItem("admin_token"); setAuthed(false); return; }
      setProducts(await pRes.json());
      setCategories(await cRes.json());
      setOrders(await oRes.json());
      setCustomFeeds(await fRes.json());
      setFeedSources(await sRes.json());
      setUsersList(await uRes.json());
      if (stRes.ok) setStats(await stRes.json());
    } catch {}
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const logout = () => { localStorage.removeItem("admin_token"); setAuthed(false); };

  const saveProduct = async (data: any) => {
    if (editingProduct) {
      await adminFetch(`/api/admin/products/${editingProduct.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await adminFetch("/api/admin/products", { method: "POST", body: JSON.stringify(data) });
    }
    setShowProductForm(false);
    setEditingProduct(null);
    loadData();
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    loadData();
  };

  const saveCategory = async (data: any) => {
    if (editingCategory) {
      await adminFetch(`/api/admin/categories/${editingCategory.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await adminFetch("/api/admin/categories", { method: "POST", body: JSON.stringify(data) });
    }
    setShowCategoryForm(false);
    setEditingCategory(null);
    loadData();
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Delete this category? Products in this category will become uncategorized.")) return;
    await adminFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    loadData();
  };

  const updateOrderStatus = async (id: number, status: string) => {
    await adminFetch(`/api/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    loadData();
  };

  const saveFeed = async (data: any) => {
    if (editingFeed) {
      await adminFetch(`/api/admin/feeds/${editingFeed.id}`, { method: "PUT", body: JSON.stringify(data) });
    } else {
      await adminFetch("/api/admin/feeds", { method: "POST", body: JSON.stringify(data) });
    }
    setShowFeedForm(false);
    setEditingFeed(null);
    loadData();
  };

  const deleteFeed = async (id: number) => {
    if (!confirm("Delete this custom feed?")) return;
    await adminFetch(`/api/admin/feeds/${id}`, { method: "DELETE" });
    loadData();
  };

  const importFromFeed = async () => {
    if (!importUrl) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await adminFetch("/api/admin/import-feed", {
        method: "POST",
        body: JSON.stringify({ url: importUrl, categoryId: importCategoryId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        loadData();
      } else {
        setImportResult({ error: data.error });
      }
    } catch (e: any) {
      setImportResult({ error: e.message });
    }
    setImporting(false);
  };

  const saveSource = async (data: any) => {
    await adminFetch("/api/admin/feed-sources", { method: "POST", body: JSON.stringify(data) });
    setShowSourceForm(false);
    loadData();
  };

  const deleteSource = async (id: number) => {
    if (!confirm("Delete this scheduled feed source?")) return;
    await adminFetch(`/api/admin/feed-sources/${id}`, { method: "DELETE" });
    loadData();
  };

  const toggleSource = async (source: FeedSource) => {
    await adminFetch(`/api/admin/feed-sources/${source.id}`, {
      method: "PUT",
      body: JSON.stringify({ enabled: !source.enabled }),
    });
    loadData();
  };

  const runSourceNow = async (id: number) => {
    setRunningSource(id);
    try {
      await adminFetch(`/api/admin/feed-sources/${id}/run`, { method: "POST" });
      loadData();
    } catch {}
    setRunningSource(null);
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/feeds/custom/${slug}`;
    navigator.clipboard.writeText(url);
  };

  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    (p.vendor || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = orders
    .filter(o =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toString().includes(search)
    )
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number | string }[] = [
    { key: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, count: stats ? stats.today : "—" },
    { key: "products", label: "Products", icon: <Package className="w-4 h-4" />, count: products.length },
    { key: "categories", label: "Categories", icon: <Tag className="w-4 h-4" />, count: categories.length },
    { key: "orders", label: "Orders", icon: <ShoppingCart className="w-4 h-4" />, count: orders.length },
    { key: "users", label: "Users", icon: <Users className="w-4 h-4" />, count: usersList.length },
    { key: "feeds", label: "Feeds", icon: <Rss className="w-4 h-4" />, count: customFeeds.length },
  ];

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || "").includes(search)
  );

  const saveUser = async (user: AdminUser) => {
    setUserMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${user.id}`, { method: "PUT", body: JSON.stringify(user) });
      if (!res.ok) { const data = await res.json(); setUserMessage({ type: "error", text: data.error }); return; }
      setEditingUser(null);
      setUserMessage({ type: "success", text: "User updated" });
      loadData();
    } catch (e: any) {
      setUserMessage({ type: "error", text: e.message });
    }
  };

  const resetUserPassword = async (userId: number) => {
    setUserMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/reset-password`, { method: "PUT", body: JSON.stringify({ newPassword }) });
      const data = await res.json();
      if (!res.ok) { setUserMessage({ type: "error", text: data.error }); return; }
      setResetPasswordId(null);
      setNewPassword("");
      setUserMessage({ type: "success", text: "Password reset successfully" });
    } catch (e: any) {
      setUserMessage({ type: "error", text: e.message });
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user account? This cannot be undone.")) return;
    await adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    loadData();
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    awaiting_payment: "bg-orange-500/20 text-orange-400",
    paid: "bg-green-500/20 text-green-400",
    shipped: "bg-blue-500/20 text-blue-400",
    delivered: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
    refunded: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-display tracking-wider" data-testid="text-admin-header">THORN TECH ADMIN</h1>
            <span className="text-xs text-gray-500 hidden sm:inline">Management Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-gray-400 hover:text-white transition" data-testid="link-view-store"><Eye className="w-3.5 h-3.5 inline mr-1" />View Store</a>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gray-400 hover:text-white" data-testid="button-logout"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition ${tab === t.key ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                data-testid={`tab-${t.key}`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                <span className="text-xs opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="pl-10 bg-white/5 border-white/10 text-white"
              data-testid="input-search"
            />
          </div>
        </div>

        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Globe className="w-4 h-4" />
                  <span>Today</span>
                </div>
                <p className="text-3xl font-display font-bold text-white" data-testid="text-visits-today">{stats?.today ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">page views</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>This Week</span>
                </div>
                <p className="text-3xl font-display font-bold text-white" data-testid="text-visits-week">{stats?.week ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">page views</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>This Month</span>
                </div>
                <p className="text-3xl font-display font-bold text-white" data-testid="text-visits-month">{stats?.month ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">page views</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>All Time</span>
                </div>
                <p className="text-3xl font-display font-bold text-white" data-testid="text-visits-total">{stats?.total ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">page views</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <p className="text-gray-400 text-sm mb-1">Products</p>
                <p className="text-2xl font-display font-bold text-white">{products.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <p className="text-gray-400 text-sm mb-1">Orders</p>
                <p className="text-2xl font-display font-bold text-white">{orders.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <p className="text-gray-400 text-sm mb-1">Registered Users</p>
                <p className="text-2xl font-display font-bold text-white">{usersList.length}</p>
              </div>
            </div>

            {stats && stats.recentDays.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <h3 className="text-sm font-display text-gray-400 mb-4">DAILY VISITS (LAST 30 DAYS)</h3>
                <div className="flex items-end gap-1 h-40">
                  {(() => {
                    const maxViews = Math.max(...stats.recentDays.map(d => d.views), 1);
                    return stats.recentDays.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-white/20 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {day.date}: {day.views} views
                        </div>
                        <div
                          className="w-full bg-purple-600 rounded-t hover:bg-purple-500 transition-colors min-h-[2px]"
                          style={{ height: `${(day.views / maxViews) * 100}%` }}
                        />
                        {i % 5 === 0 && (
                          <span className="text-[9px] text-gray-600 rotate-[-45deg] origin-top-left mt-1 whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {stats && stats.topPages.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <h3 className="text-sm font-display text-gray-400 mb-4">TOP PAGES (LAST 30 DAYS)</h3>
                <div className="space-y-2">
                  {stats.topPages.map((page, i) => {
                    const maxPageViews = stats.topPages[0].views;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-6 text-right">{i + 1}.</span>
                        <div className="flex-1 relative">
                          <div className="bg-purple-600/20 rounded h-8" style={{ width: `${(page.views / maxPageViews) * 100}%` }} />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-white truncate max-w-[300px]">{page.path}</span>
                        </div>
                        <span className="text-sm text-gray-400 w-16 text-right font-display">{page.views}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-4">
            {showProductForm || editingProduct ? (
              <ProductForm
                product={editingProduct || undefined}
                categories={categories}
                onSave={saveProduct}
                onCancel={() => { setShowProductForm(false); setEditingProduct(null); }}
              />
            ) : (
              <Button onClick={() => setShowProductForm(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-product">
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-products">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-left">
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3 hidden md:table-cell">Category</th>
                    <th className="py-3 px-3 hidden md:table-cell">Stock</th>
                    <th className="py-3 px-3 hidden lg:table-cell">Badge</th>
                    <th className="py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition" data-testid={`row-product-${p.id}`}>
                      <td className="py-3 px-3 text-gray-500">{p.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.slug}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-purple-400 font-medium">£{p.price.toFixed(2)}</span>
                        {p.compareAtPrice && <span className="text-xs text-gray-500 line-through ml-1">£{p.compareAtPrice.toFixed(2)}</span>}
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell text-gray-400">{catMap.get(p.categoryId ?? 0) || "—"}</td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded ${p.inStock ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {p.inStock ? "In Stock" : "Out"}
                        </span>
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell text-gray-400">{p.badge || "—"}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingProduct(p); setShowProductForm(false); }} className="text-gray-400 hover:text-white h-8 w-8 p-0" data-testid={`button-edit-product-${p.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteProduct(p.id)} className="text-gray-400 hover:text-red-400 h-8 w-8 p-0" data-testid={`button-delete-product-${p.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-500">No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div className="space-y-4">
            {showCategoryForm || editingCategory ? (
              <CategoryForm
                category={editingCategory || undefined}
                onSave={saveCategory}
                onCancel={() => { setShowCategoryForm(false); setEditingCategory(null); }}
              />
            ) : (
              <Button onClick={() => setShowCategoryForm(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-category">
                <Plus className="w-4 h-4 mr-1" /> Add Category
              </Button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-purple-500/30 transition" data-testid={`card-category-${c.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-white">{c.name}</h3>
                      <p className="text-xs text-gray-500">{c.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingCategory(c); setShowCategoryForm(false); }} className="text-gray-400 hover:text-white h-7 w-7 p-0" data-testid={`button-edit-category-${c.id}`}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)} className="text-gray-400 hover:text-red-400 h-7 w-7 p-0" data-testid={`button-delete-category-${c.id}`}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{c.description || "No description"}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    {products.filter(p => p.categoryId === c.id).length} products | Icon: {c.icon || "none"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-2">
            {filteredOrders.length === 0 && (
              <div className="py-12 text-center text-gray-500">No orders found</div>
            )}
            {filteredOrders.map(o => {
              const expanded = expandedOrder === o.id;
              let orderItems: any[] = [];
              try { orderItems = JSON.parse(o.items); } catch {}
              return (
                <div key={o.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden" data-testid={`card-order-${o.id}`}>
                  <button
                    onClick={() => setExpandedOrder(expanded ? null : o.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition"
                    data-testid={`button-toggle-order-${o.id}`}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-gray-500 text-sm font-mono">#{o.id}</span>
                      <span className="text-white font-medium">{o.name}</span>
                      <span className="text-gray-400 text-sm">{o.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[o.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {o.status}
                      </span>
                      <span className="text-purple-400 font-medium">£{o.total.toFixed(2)}</span>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-500">Address:</span> <span className="text-gray-300">{o.address}, {o.city}, {o.postcode}</span></div>
                        <div><span className="text-gray-500">Phone:</span> <span className="text-gray-300">{o.phone || "—"}</span></div>
                        <div><span className="text-gray-500">Payment:</span> <span className="text-gray-300">{o.paymentMethod}</span></div>
                        <div><span className="text-gray-500">Date:</span> <span className="text-gray-300">{o.createdAt ? new Date(o.createdAt).toLocaleString("en-GB") : "—"}</span></div>
                      </div>
                      <div>
                        <h4 className="text-xs text-gray-500 mb-1">Items:</h4>
                        {orderItems.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                            <span className="text-gray-300">{item.name} x{item.quantity}</span>
                            <span className="text-gray-400">£{((item.price || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-500 text-xs">Update Status:</Label>
                        <select
                          value={o.status}
                          onChange={e => updateOrderStatus(o.id, e.target.value)}
                          className="h-8 px-2 rounded bg-white/5 border border-white/10 text-white text-sm"
                          data-testid={`select-order-status-${o.id}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="awaiting_payment">Awaiting Payment</option>
                          <option value="paid">Paid</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            {userMessage && (
              <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${userMessage.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                {userMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {userMessage.text}
              </div>
            )}

            {editingUser && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-medium text-white">Edit User #{editingUser.id}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Name</Label>
                    <Input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="bg-white/5 border-white/10 text-white" data-testid="input-edit-user-name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Email</Label>
                    <Input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="bg-white/5 border-white/10 text-white" data-testid="input-edit-user-email" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Phone</Label>
                    <Input value={editingUser.phone || ""} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value || null })} className="bg-white/5 border-white/10 text-white" data-testid="input-edit-user-phone" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Address</Label>
                    <Input value={editingUser.address || ""} onChange={e => setEditingUser({ ...editingUser, address: e.target.value || null })} className="bg-white/5 border-white/10 text-white" data-testid="input-edit-user-address" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">City</Label>
                    <Input value={editingUser.city || ""} onChange={e => setEditingUser({ ...editingUser, city: e.target.value || null })} className="bg-white/5 border-white/10 text-white" data-testid="input-edit-user-city" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Postcode</Label>
                    <Input value={editingUser.postcode || ""} onChange={e => setEditingUser({ ...editingUser, postcode: e.target.value || null })} className="bg-white/5 border-white/10 text-white" data-testid="input-edit-user-postcode" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => saveUser(editingUser)} data-testid="button-save-user"><Save className="w-3 h-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingUser(null); setUserMessage(null); }} className="border-white/10 text-gray-400 hover:bg-white/5" data-testid="button-cancel-user"><X className="w-3 h-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            )}

            {resetPasswordId && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-3">
                <h3 className="text-sm font-medium text-white">Reset Password for User #{resetPasswordId}</h3>
                <div className="flex gap-3 items-end max-w-md">
                  <div className="flex-1 space-y-1">
                    <Label className="text-gray-400 text-xs">New Password (min 8 characters)</Label>
                    <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Enter new password" data-testid="input-reset-password" />
                  </div>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={newPassword.length < 8} onClick={() => resetUserPassword(resetPasswordId)} data-testid="button-confirm-reset"><KeyRound className="w-3 h-3 mr-1" /> Reset</Button>
                  <Button size="sm" variant="outline" onClick={() => { setResetPasswordId(null); setNewPassword(""); setUserMessage(null); }} className="border-white/10 text-gray-400 hover:bg-white/5"><X className="w-3 h-3 mr-1" /> Cancel</Button>
                </div>
              </div>
            )}

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{search ? "No users match your search" : "No registered users yet"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-white/5 border border-white/10 rounded-lg p-4" data-testid={`card-user-${u.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white" data-testid={`text-user-name-${u.id}`}>{u.name}</span>
                          <span className="text-xs text-gray-500">#{u.id}</span>
                        </div>
                        <p className="text-sm text-purple-400" data-testid={`text-user-email-${u.id}`}>{u.email}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                          {u.phone && <span>Phone: {u.phone}</span>}
                          {u.address && <span>{u.address}</span>}
                          {u.city && <span>{u.city}</span>}
                          {u.postcode && <span>{u.postcode}</span>}
                          {u.createdAt && <span>Joined: {new Date(u.createdAt).toLocaleDateString("en-GB")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingUser({ ...u }); setResetPasswordId(null); setUserMessage(null); }} className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Edit user" data-testid={`button-edit-user-${u.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setResetPasswordId(u.id); setEditingUser(null); setNewPassword(""); setUserMessage(null); }} className="text-gray-400 hover:text-yellow-400 h-8 w-8 p-0" title="Reset password" data-testid={`button-reset-pw-${u.id}`}><KeyRound className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-400 h-8 w-8 p-0" title="Delete user" data-testid={`button-delete-user-${u.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "feeds" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-white mb-2">Built-in Feeds (auto-generated)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { name: "Google Shopping", url: "/feeds/google-shopping.xml" },
                  { name: "Facebook / Meta", url: "/feeds/facebook.xml" },
                  { name: "Generic Products", url: "/feeds/products.xml" },
                  { name: "Sitemap", url: "/sitemap.xml" },
                ].map(f => (
                  <div key={f.url} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                    <span className="text-gray-300 text-sm">{f.name}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3"><Download className="w-4 h-4 inline mr-1" />Import Products from Feed</h3>
              <p className="text-xs text-gray-500 mb-3">Paste a product feed URL (Google Shopping, Facebook, or generic XML) to import products into your store.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    placeholder="https://example.com/feeds/products.xml"
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="input-import-url"
                  />
                </div>
                <select
                  value={importCategoryId}
                  onChange={e => setImportCategoryId(e.target.value)}
                  className="h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                  data-testid="select-import-category"
                >
                  <option value="">Assign category (optional)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button
                  onClick={importFromFeed}
                  disabled={!importUrl || importing}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-import-feed"
                >
                  {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importing...</> : <><Download className="w-4 h-4 mr-1" /> Import</>}
                </Button>
              </div>
              {importResult && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${importResult.error ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                  {importResult.error ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-red-400">{importResult.error}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">Imported {importResult.imported} of {importResult.totalInFeed} products</span>
                      </div>
                      {importResult.categoriesMatched > 0 && (
                        <p className="text-gray-400 text-xs ml-6">{importResult.categoriesMatched} products auto-matched to categories from feed</p>
                      )}
                      {importResult.skipped > 0 && (
                        <p className="text-gray-400 text-xs ml-6">Skipped {importResult.skipped} (already exist or duplicates)</p>
                      )}
                      {importResult.products?.length > 0 && (
                        <div className="mt-2 ml-6 space-y-0.5">
                          {importResult.products.slice(0, 5).map((p: any) => (
                            <p key={p.id} className="text-gray-300 text-xs">+ {p.name}</p>
                          ))}
                          {importResult.products.length > 5 && <p className="text-gray-500 text-xs">...and {importResult.products.length - 5} more</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white"><Rss className="w-4 h-4 inline mr-1" />Scheduled Feed Sources</h3>
                {!showSourceForm && (
                  <Button size="sm" onClick={() => setShowSourceForm(true)} className="bg-purple-600 hover:bg-purple-700 h-7 text-xs" data-testid="button-add-source">
                    <Plus className="w-3 h-3 mr-1" /> Add Source
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">Add feed URLs that automatically import new products on a schedule.</p>

              {showSourceForm && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-gray-400 text-xs">Source Name *</Label>
                      <Input id="source-name" className="bg-white/5 border-white/10 text-white" placeholder="e.g. Supplier Feed" data-testid="input-source-name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-400 text-xs">Feed URL *</Label>
                      <Input id="source-url" className="bg-white/5 border-white/10 text-white" placeholder="https://supplier.com/feed.xml" data-testid="input-source-url" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-400 text-xs">Category</Label>
                      <select id="source-category" className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm" data-testid="select-source-category">
                        <option value="">No category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-400 text-xs">Import Every</Label>
                      <select id="source-interval" className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm" data-testid="select-source-interval">
                        <option value="1">1 hour</option>
                        <option value="3">3 hours</option>
                        <option value="6" selected>6 hours</option>
                        <option value="12">12 hours</option>
                        <option value="24">24 hours</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" data-testid="button-save-source" onClick={() => {
                      const name = (document.getElementById("source-name") as HTMLInputElement)?.value;
                      const url = (document.getElementById("source-url") as HTMLInputElement)?.value;
                      const catId = (document.getElementById("source-category") as HTMLSelectElement)?.value;
                      const interval = (document.getElementById("source-interval") as HTMLSelectElement)?.value;
                      if (name && url) {
                        saveSource({ name, url, categoryId: catId ? parseInt(catId) : null, intervalHours: parseInt(interval || "6"), enabled: true });
                      }
                    }}><Save className="w-3 h-3 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowSourceForm(false)} className="border-white/10 text-gray-400 hover:bg-white/5"><X className="w-3 h-3 mr-1" /> Cancel</Button>
                  </div>
                </div>
              )}

              {feedSources.length > 0 ? (
                <div className="space-y-2">
                  {feedSources.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-lg px-4 py-3" data-testid={`card-source-${s.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-green-400" : "bg-gray-500"}`}></span>
                          <span className="text-white text-sm font-medium">{s.name}</span>
                          <span className="text-xs text-gray-500">every {s.intervalHours}h</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{s.url}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          {s.lastImportAt && <span>Last: {new Date(s.lastImportAt).toLocaleString("en-GB")}</span>}
                          {s.lastImportCount !== null && <span>{s.lastImportCount} imported</span>}
                          {s.lastError && <span className="text-red-400">Error: {s.lastError}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => runSourceNow(s.id)} disabled={runningSource === s.id} className="text-gray-400 hover:text-white h-8 px-2" data-testid={`button-run-source-${s.id}`}>
                          {runningSource === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleSource(s)} className={`h-8 px-2 ${s.enabled ? "text-green-400 hover:text-red-400" : "text-gray-500 hover:text-green-400"}`} data-testid={`button-toggle-source-${s.id}`}>
                          {s.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteSource(s.id)} className="text-gray-400 hover:text-red-400 h-8 px-2" data-testid={`button-delete-source-${s.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No scheduled sources yet. Add one to automatically import products.</p>
              )}
            </div>

            {showFeedForm || editingFeed ? (
              <FeedForm
                feed={editingFeed || undefined}
                onSave={saveFeed}
                onCancel={() => { setShowFeedForm(false); setEditingFeed(null); }}
              />
            ) : (
              <Button onClick={() => setShowFeedForm(true)} className="bg-purple-600 hover:bg-purple-700" data-testid="button-add-feed">
                <Plus className="w-4 h-4 mr-1" /> Add Custom Feed
              </Button>
            )}

            {customFeeds.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400">Custom Feeds</h3>
                {customFeeds.map(f => (
                  <div key={f.id} className="bg-white/5 border border-white/10 rounded-lg p-4" data-testid={`card-feed-${f.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white">{f.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">/feeds/custom/{f.slug}</code>
                          <button onClick={() => copyUrl(f.slug)} className="text-gray-500 hover:text-white transition" title="Copy URL" data-testid={`button-copy-feed-${f.id}`}><Copy className="w-3.5 h-3.5" /></button>
                          <a href={`/feeds/custom/${f.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition" title="Open feed" data-testid={`link-open-feed-${f.id}`}><ExternalLink className="w-3.5 h-3.5" /></a>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>{f.content.length.toLocaleString()} chars</span>
                          {f.updatedAt && <span>Updated: {new Date(f.updatedAt).toLocaleString("en-GB")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingFeed(f); setShowFeedForm(false); }} className="text-gray-400 hover:text-white h-8 w-8 p-0" data-testid={`button-edit-feed-${f.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteFeed(f.id)} className="text-gray-400 hover:text-red-400 h-8 w-8 p-0" data-testid={`button-delete-feed-${f.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
