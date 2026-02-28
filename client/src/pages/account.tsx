import { useState } from "react";
import { Link, useLocation } from "wouter";
import { User, Package, Settings, LogOut, ChevronRight, Eye, EyeOff, Loader2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

function formatPrice(price: number) {
  return `£${price.toFixed(2)}`;
}

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <h2 className="font-display text-2xl font-bold tracking-wider text-center mb-6" data-testid="text-login-title">SIGN IN</h2>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3" data-testid="text-login-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-gray-400">Email</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white" placeholder="your@email.com" data-testid="input-login-email" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-400">Password</Label>
        <div className="relative">
          <Input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/5 border-white/10 text-white pr-10" placeholder="Enter your password" data-testid="input-login-password" />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/80 font-display tracking-widest h-12" data-testid="button-login-submit">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIGN IN"}
      </Button>
      <p className="text-center text-gray-500 text-sm">
        Don't have an account? <Link href="/register" className="text-primary hover:underline" data-testid="link-register">Create one</Link>
      </p>
    </form>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name, phone || undefined);
      navigate("/account");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <h2 className="font-display text-2xl font-bold tracking-wider text-center mb-6" data-testid="text-register-title">CREATE ACCOUNT</h2>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3" data-testid="text-register-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-gray-400">Full Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required className="bg-white/5 border-white/10 text-white" placeholder="John Smith" data-testid="input-register-name" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-400">Email *</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white" placeholder="your@email.com" data-testid="input-register-email" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-400">Phone (optional)</Label>
        <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="07xxx xxxxxx" data-testid="input-register-phone" />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-400">Password * (min 8 characters)</Label>
        <div className="relative">
          <Input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/5 border-white/10 text-white pr-10" placeholder="Create a password" data-testid="input-register-password" />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-400">Confirm Password *</Label>
        <Input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} required className="bg-white/5 border-white/10 text-white" placeholder="Confirm your password" data-testid="input-register-confirm" />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/80 font-display tracking-widest h-12" data-testid="button-register-submit">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CREATE ACCOUNT"}
      </Button>
      <p className="text-center text-gray-500 text-sm">
        Already have an account? <Link href="/login" className="text-primary hover:underline" data-testid="link-login">Sign in</Link>
      </p>
    </form>
  );
}

function AccountDashboard() {
  const { user, token, logout, updateProfile } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"orders" | "details" | "password">("orders");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", address: user?.address || "", city: user?.city || "", postcode: user?.postcode || "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/auth/orders"],
    queryFn: () => fetch("/api/auth/orders", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const handleSaveDetails = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateProfile(form);
      setMessage("Details saved");
      setEditing(false);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMessage({ type: "success", text: "Password changed successfully" });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPwMessage({ type: "error", text: err.message });
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wider" data-testid="text-account-title">MY ACCOUNT</h2>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5" data-testid="button-logout">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
        <Button variant={tab === "orders" ? "default" : "ghost"} onClick={() => setTab("orders")} className={tab === "orders" ? "bg-primary" : "text-gray-400"} data-testid="button-tab-orders">
          <Package className="w-4 h-4 mr-2" /> Orders
        </Button>
        <Button variant={tab === "details" ? "default" : "ghost"} onClick={() => setTab("details")} className={tab === "details" ? "bg-primary" : "text-gray-400"} data-testid="button-tab-details">
          <User className="w-4 h-4 mr-2" /> My Details
        </Button>
        <Button variant={tab === "password" ? "default" : "ghost"} onClick={() => setTab("password")} className={tab === "password" ? "bg-primary" : "text-gray-400"} data-testid="button-tab-password">
          <Settings className="w-4 h-4 mr-2" /> Password
        </Button>
      </div>

      {tab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No orders yet</h3>
              <p className="text-gray-600 text-sm mb-4">Your order history will appear here</p>
              <Link href="/">
                <Button className="bg-primary hover:bg-primary/80 font-display tracking-widest" data-testid="button-start-shopping">START SHOPPING</Button>
              </Link>
            </div>
          ) : (
            orders.map((order: any) => {
              const orderItems = JSON.parse(order.items || "[]");
              return (
                <div key={order.id} className="bg-white/5 border border-white/10 rounded-lg p-5" data-testid={`card-order-${order.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-white">Order #{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${order.status === "paid" ? "bg-green-500/20 text-green-400" : order.status === "shipped" ? "bg-blue-500/20 text-blue-400" : order.status === "delivered" ? "bg-purple-500/20 text-purple-400" : "bg-yellow-500/20 text-yellow-400"}`} data-testid={`status-order-${order.id}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString("en-GB")}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {orderItems.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.name} x{item.quantity}</span>
                        <span className="text-gray-400">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-gray-500 text-sm">{order.paymentMethod === "stripe" ? "Card" : "PayPal"}</span>
                    <span className="font-display font-bold text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "details" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 max-w-lg">
          {message && (
            <div className={`flex items-center gap-2 text-sm rounded-lg p-3 mb-4 ${message === "Details saved" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
              {message === "Details saved" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Email</Label>
              <Input value={user?.email || ""} disabled className="bg-white/5 border-white/10 text-gray-500" data-testid="input-account-email" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Name</Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setEditing(true); }} className="bg-white/5 border-white/10 text-white" data-testid="input-account-name" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Phone</Label>
              <Input value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setEditing(true); }} className="bg-white/5 border-white/10 text-white" placeholder="07xxx xxxxxx" data-testid="input-account-phone" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Address</Label>
              <Input value={form.address} onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setEditing(true); }} className="bg-white/5 border-white/10 text-white" placeholder="123 High Street" data-testid="input-account-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">City</Label>
                <Input value={form.city} onChange={e => { setForm(f => ({ ...f, city: e.target.value })); setEditing(true); }} className="bg-white/5 border-white/10 text-white" placeholder="London" data-testid="input-account-city" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Postcode</Label>
                <Input value={form.postcode} onChange={e => { setForm(f => ({ ...f, postcode: e.target.value })); setEditing(true); }} className="bg-white/5 border-white/10 text-white" placeholder="SW1A 1AA" data-testid="input-account-postcode" />
              </div>
            </div>
            {editing && (
              <Button onClick={handleSaveDetails} disabled={saving} className="bg-primary hover:bg-primary/80 w-full" data-testid="button-save-details">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Details
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === "password" && (
        <form onSubmit={handleChangePassword} className="bg-white/5 border border-white/10 rounded-lg p-6 max-w-lg space-y-4">
          {pwMessage && (
            <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${pwMessage.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
              {pwMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {pwMessage.text}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-gray-400">Current Password</Label>
            <Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required className="bg-white/5 border-white/10 text-white" data-testid="input-current-password" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">New Password (min 8 characters)</Label>
            <Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required className="bg-white/5 border-white/10 text-white" data-testid="input-new-password" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Confirm New Password</Label>
            <Input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required className="bg-white/5 border-white/10 text-white" data-testid="input-confirm-new-password" />
          </div>
          <Button type="submit" disabled={pwSaving} className="bg-primary hover:bg-primary/80 w-full" data-testid="button-change-password">
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Change Password
          </Button>
        </form>
      )}
    </div>
  );
}

export function LoginPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user) {
    navigate("/account");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <div className="container mx-auto px-4 py-16">
        <LoginForm />
      </div>
      <Footer />
    </div>
  );
}

export function RegisterPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user) {
    navigate("/account");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <div className="container mx-auto px-4 py-16">
        <RegisterForm />
      </div>
      <Footer />
    </div>
  );
}

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <AccountDashboard />
      </div>
      <Footer />
    </div>
  );
}
