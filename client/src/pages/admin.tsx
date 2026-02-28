import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package, Tag, ShoppingCart, Plus, Pencil, Trash2, LogOut,
  Eye, EyeOff, X, Save, Search, ChevronDown, ChevronUp
} from "lucide-react";
import type { Product, Category, Order } from "@shared/schema";

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

type Tab = "products" | "categories" | "orders";

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("admin_token"));
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [pRes, cRes, oRes] = await Promise.all([
        adminFetch("/api/admin/products"),
        adminFetch("/api/admin/categories"),
        adminFetch("/api/admin/orders"),
      ]);
      if (pRes.status === 401) { localStorage.removeItem("admin_token"); setAuthed(false); return; }
      setProducts(await pRes.json());
      setCategories(await cRes.json());
      setOrders(await oRes.json());
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "products", label: "Products", icon: <Package className="w-4 h-4" />, count: products.length },
    { key: "categories", label: "Categories", icon: <Tag className="w-4 h-4" />, count: categories.length },
    { key: "orders", label: "Orders", icon: <ShoppingCart className="w-4 h-4" />, count: orders.length },
  ];

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
      </div>
    </div>
  );
}
