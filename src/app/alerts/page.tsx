"use client";

import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

interface Alert {
  id: string; // DB uses cuid strings, not numbers
  asset: string;
  category: string;
  icon: string;
  targetPrice: number;
  condition: "below" | "above" | "equals";
  progress: number;
  color: "primary-container" | "error" | "secondary";
  isActive: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

const colorClasses = {
  "primary-container": {
    bg: "bg-primary-container/10",
    text: "text-primary-container",
  },
  error: {
    bg: "bg-error/10",
    text: "text-error",
  },
  secondary: {
    bg: "bg-secondary/10",
    text: "text-secondary",
  },
};

const ICON_MAP: Record<string, string> = {
  "Gold 24K": "payments",
  "Silver": "diamond",
  "Petrol": "local_gas_station",
  "USD": "currency_exchange",
  "SAR": "currency_exchange",
  "EUR": "currency_exchange",
  "GBP": "currency_exchange",
};

function getIcon(asset: string) {
  const key = Object.keys(ICON_MAP).find((k) => asset.includes(k));
  return key ? ICON_MAP[key] : "notifications";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("Gold 24K (10g)");
  const [condition, setCondition] = useState("Drops Below");
  const [priceValue, setPriceValue] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Load alerts from the database on mount
  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error("Failed to load alerts");
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      setError("Could not load alerts. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAlert() {
    if (!priceValue) return;
    setCreating(true);
    setError(null);

    const asset = category.replace(" (10g)", "").replace(" (Litre)", "");
    const body = {
      asset,
      category,
      icon: getIcon(asset),
      targetPrice: parseFloat(priceValue),
      condition: condition === "Drops Below" ? "below" : condition === "Rises Above" ? "above" : "equals",
      color: "primary-container",
    };

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create alert");
      const newAlert = await res.json();
      setAlerts((prev) => [newAlert, ...prev]);
      setPriceValue("");
    } catch (err) {
      setError("Could not create alert. Please try again.");
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteAlert(id: string) {
    // Optimistic update
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        // Rollback on failure
        fetchAlerts();
        setError("Could not delete alert.");
      }
    } catch (err) {
      fetchAlerts();
      setError("Could not delete alert.");
      console.error(err);
    }
  }

  const activeAlerts = alerts.filter((a) => a.isActive);
  const historyAlerts = alerts.filter((a) => !a.isActive);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full flex flex-col z-40 bg-surface w-64">
        <div className="px-6 py-8">
          <h1 className="text-xl font-bold text-primary-container font-headline">
            RupeWatch
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-medium">
            Financial Intelligence
          </p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {[
            { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
            { href: "/alerts", icon: "notifications", label: "Alerts", active: true },
            { href: "/analysis", icon: "payments", label: "Precious Metals" },
            { href: "#", icon: "local_gas_station", label: "Fuel Rates" },
            { href: "#", icon: "currency_exchange", label: "Currency" },
            { href: "#", icon: "history", label: "History" },
          ].map(({ href, icon, label, active }) => (
            <a
              key={label}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                active
                  ? "text-primary-container font-bold bg-surface-container-high rounded-lg"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-white"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              <span className="font-medium text-sm">{label}</span>
            </a>
          ))}
        </nav>
        <div className="p-4">
          <a
            href="/upgrade"
            className="block w-full gold-gradient text-on-primary font-bold py-3 rounded-full text-sm text-center"
          >
            Upgrade to Pro
          </a>
        </div>
        <div className="p-4 space-y-1">
          <a href="#" className="flex items-center gap-3 text-on-surface-variant px-4 py-2 hover:text-white text-xs transition-colors">
            <span className="material-symbols-outlined text-lg">help</span>
            Help Center
          </a>
          <a href="#" className="flex items-center gap-3 text-error/80 px-4 py-2 hover:text-error text-xs transition-colors">
            <span className="material-symbols-outlined text-lg">logout</span>
            Logout
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen bg-background relative">
        {/* Top Bar */}
        <header className="flex justify-between items-center w-full px-6 py-4 bg-surface sticky top-0 z-30 shadow-[0_24px_48px_-5px_rgba(6,14,32,0.4)]">
          <h1 className="text-2xl font-black tracking-wider text-primary-container font-headline">
            ALERTS
          </h1>
          <div className="flex items-center gap-6">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="bg-surface-container-lowest border-none rounded-full pl-10 pr-4 py-2 text-sm w-48 focus:ring-2 focus:ring-primary-container/30 transition-all placeholder:text-on-surface-variant/50"
                placeholder="Search..."
                type="text"
              />
            </div>
            <button className="p-2 text-on-surface-variant hover:bg-surface-bright/60 rounded-full transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-bright/60 rounded-full transition-all">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <UserButton />
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-error/10 border border-error/20 text-error rounded-xl text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </span>
            <button onClick={() => setError(null)} className="material-symbols-outlined text-sm">close</button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          {/* Hero Create Alert Section */}
          <section className="relative overflow-hidden rounded-3xl bg-surface-container-low p-8 md:p-12 border border-outline-variant/10">
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-l from-primary-container to-transparent" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-extrabold text-primary-container font-headline mb-4 tracking-tight">
                Configure Vigilance
              </h2>
              <p className="text-on-surface-variant text-lg mb-8 font-body">
                Deploy real-time monitors across precious metals and global currencies. Never miss a market shift.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                    Asset Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface-container-lowest border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary-container/30 py-3 px-4 font-body"
                  >
                    <option>Gold 24K (10g)</option>
                    <option>Silver (1kg)</option>
                    <option>Petrol (Litre)</option>
                    <option>USD/INR</option>
                    <option>SAR/INR</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                    Threshold Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full bg-surface-container-lowest border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary-container/30 py-3 px-4 font-body"
                  >
                    <option>Drops Below</option>
                    <option>Rises Above</option>
                    <option>Equals</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">
                    Price Point
                  </label>
                  <input
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    className="w-full bg-surface-container-lowest border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary-container/30 py-3 px-4 font-body"
                    placeholder="Enter Value"
                    type="number"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateAlert}
                disabled={creating || !priceValue}
                className="mt-8 px-8 py-4 gold-gradient text-on-primary font-black rounded-full shadow-2xl flex items-center gap-3 transition-transform active:scale-95 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Deploying..." : "Deploy Monitor"}
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  {creating ? "hourglass_empty" : "rocket_launch"}
                </span>
              </button>
            </div>
          </section>

          {/* Active Alerts Cards */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold font-headline text-on-surface">Active Vigilance</h3>
                <p className="text-on-surface-variant text-sm mt-1">Monitors currently scouting the market</p>
              </div>
              <span className="px-4 py-1.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-full text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                {loading ? "..." : `${activeAlerts.length} Monitors Active`}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/5 animate-pulse h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAlerts.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-on-surface-variant">
                    No active monitors. Deploy one above!
                  </div>
                )}
                {activeAlerts.map((alert) => {
                  const colors = colorClasses[alert.color as keyof typeof colorClasses] ?? colorClasses["primary-container"];
                  return (
                    <div
                      key={alert.id}
                      className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/5 group hover:border-primary-container/30 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center ${colors.text}`}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {alert.icon}
                          </span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-2 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-primary font-headline">{alert.asset}</h4>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-on-surface">
                          ₹{alert.targetPrice.toLocaleString()}
                        </span>
                        <span className="text-on-surface-variant text-xs">Target</span>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <span className={`text-xs font-bold flex items-center gap-1 ${alert.condition === "below" ? "text-secondary" : "text-error"}`}>
                          <span className="material-symbols-outlined text-sm">
                            {alert.condition === "below" ? "trending_down" : "trending_up"}
                          </span>
                          {alert.condition === "below" ? "Below" : "Above"}
                        </span>
                        <div className="w-24 h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${alert.condition === "below" ? "bg-secondary" : "bg-error"}`}
                            style={{ width: `${alert.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* History / Active Table */}
          <section className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 shadow-2xl">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-outline-variant/5">
              <div className="flex gap-4">
                {(["active", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
                      activeTab === tab
                        ? "bg-primary-container text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button className="text-sm font-bold text-primary-container flex items-center gap-2 hover:underline">
                Download Report <span className="material-symbols-outlined text-sm">download</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body">
                <thead>
                  <tr className="bg-surface-container-lowest/50">
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-on-surface-variant">Asset</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-on-surface-variant">Condition</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-on-surface-variant">Target Price</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-on-surface-variant">Date & Time</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-on-surface-variant text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {activeTab === "active" && activeAlerts.map((alert) => {
                    const colors = colorClasses[alert.color as keyof typeof colorClasses] ?? colorClasses["primary-container"];
                    return (
                      <tr key={alert.id} className="hover:bg-surface-bright/20 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
                              <span className="material-symbols-outlined text-lg">{alert.icon}</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{alert.asset}</p>
                              <p className="text-[10px] text-on-surface-variant">{alert.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${alert.condition === "below" ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
                            {alert.condition === "below" ? "DROPS BELOW" : "RISES ABOVE"} ₹{alert.targetPrice.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-black text-on-surface">₹{alert.targetPrice.toLocaleString()}</td>
                        <td className="px-8 py-6 text-on-surface-variant text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                            {new Date(alert.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-xs font-bold text-error bg-error/10 px-4 py-1.5 rounded-lg hover:bg-error hover:text-on-primary transition-all"
                          >
                            DELETE
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "history" && historyAlerts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">
                        No triggered alerts yet.
                      </td>
                    </tr>
                  )}

                  {activeTab === "history" && historyAlerts.map((alert) => {
                    const colors = colorClasses[alert.color as keyof typeof colorClasses] ?? colorClasses["primary-container"];
                    return (
                      <tr key={alert.id} className="hover:bg-surface-bright/20 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
                              <span className="material-symbols-outlined text-lg">{alert.icon}</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{alert.asset}</p>
                              <p className="text-[10px] text-on-surface-variant">{alert.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${alert.condition === "below" ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
                            {alert.condition === "below" ? "DROPS BELOW" : "RISES ABOVE"} ₹{alert.targetPrice.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-black text-on-surface">₹{alert.targetPrice.toLocaleString()}</td>
                        <td className="px-8 py-6 text-on-surface-variant text-sm">
                          {alert.triggeredAt
                            ? new Date(alert.triggeredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
                              " • " +
                              new Date(alert.triggeredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="text-xs font-bold text-primary-container bg-primary-container/10 px-4 py-1.5 rounded-lg hover:bg-primary-container hover:text-on-primary transition-all">
                            RE-DEPLOY
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "active" && activeAlerts.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">
                        No active alerts. Create one above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface flex justify-around py-3 border-t border-outline-variant/10 z-40 backdrop-blur-lg">
          {[
            { href: "/dashboard", icon: "dashboard", label: "Home" },
            { href: "/alerts", icon: "notifications", label: "Alerts", active: true },
            { href: "#", icon: "history", label: "History" },
            { href: "#", icon: "person", label: "Profile" },
          ].map(({ href, icon, label, active }) => (
            <a key={label} href={href} className={`flex flex-col items-center gap-1 ${active ? "text-primary-container" : "text-on-surface-variant"}`}>
              <span
                className="material-symbols-outlined text-xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              <span className="text-[10px] font-medium font-label">{label}</span>
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
