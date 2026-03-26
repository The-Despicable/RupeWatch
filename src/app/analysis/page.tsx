"use client";

import { UserButton } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import PricePredictionCard from "@/components/PricePredictionCard";
import NewsSection from "@/components/NewsSection";

type AssetTab = "gold" | "silver" | "petrol";

type MetalData = {
  price: number;
  change24h: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
};

type MetalsResponse = {
  gold: MetalData;
  silver: MetalData;
  petrol: MetalData;
};

const DEFAULT_DATA = {
  gold: { price: 2341.84, change24h: 1.24, prevClose: 2312.45, dayHigh: 2345.12, dayLow: 2310.20 },
  silver: { price: 28.42, change24h: 0.85, prevClose: 28.18, dayHigh: 28.65, dayLow: 28.10 },
  petrol: { price: 84.15, change24h: -0.42, prevClose: 84.50, dayHigh: 85.20, dayLow: 83.80 },
};

export default function AssetAnalysisPage() {
  const [activeTab, setActiveTab] = useState<AssetTab>("gold");
  const [metals, setMetals] = useState<MetalsResponse>(DEFAULT_DATA as MetalsResponse);
  const [loading, setLoading] = useState(true);

  const fetchMetals = useCallback(async () => {
    try {
      const res = await fetch('/api/metals');
      if (res.ok) {
        const data = await res.json();
        setMetals(data);
      }
    } catch (error) {
      console.error('Failed to fetch metals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetals();
    const interval = setInterval(fetchMetals, 60000);
    return () => clearInterval(interval);
  }, [fetchMetals]);

  const getAssetData = (tab: AssetTab) => {
    const metal = metals[tab];
    return {
      pair: tab === 'gold' ? 'GOLD' : tab === 'silver' ? 'SILVER' : 'CRUDE',
      price: metal.price,
      symbol: tab === 'gold' ? 'XAU/USD' : tab === 'silver' ? 'XAG/USD' : 'BCX/USD',
      label: tab === 'gold' ? 'Spot Gold' : tab === 'silver' ? 'Spot Silver' : 'Brent Crude',
      change: metal.change24h,
      prevClose: metal.prevClose,
      dayHigh: metal.dayHigh,
      dayLow: metal.dayLow,
    };
  };

  const tabs: { id: AssetTab; label: string }[] = [
    { id: "gold", label: "Gold" },
    { id: "silver", label: "Silver" },
    { id: "petrol", label: "Petrol" },
  ];

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
          <a href="/dashboard" className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high hover:text-white transition-colors">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-medium text-sm">Dashboard</span>
          </a>
          <a href="/analysis" className="flex items-center gap-3 text-primary-container font-bold bg-surface-container-high rounded-lg px-4 py-3">
            <span className="material-symbols-outlined">payments</span>
            <span className="font-medium text-sm">Precious Metals</span>
          </a>
          <a href="#" className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high hover:text-white transition-colors">
            <span className="material-symbols-outlined">local_gas_station</span>
            <span className="font-medium text-sm">Fuel Rates</span>
          </a>
          <a href="#" className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high hover:text-white transition-colors">
            <span className="material-symbols-outlined">currency_exchange</span>
            <span className="font-medium text-sm">Currency</span>
          </a>
          <a href="#" className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-high hover:text-white transition-colors">
            <span className="material-symbols-outlined">history</span>
            <span className="font-medium text-sm">History</span>
          </a>
        </nav>
        <div className="p-4 mt-auto">
          <a href="/upgrade" className="block w-full gold-gradient text-on-primary font-bold py-3 rounded-xl text-sm shadow-[0_10px_20px_-10px_rgba(255,215,0,0.3)] hover:scale-[1.02] transition-transform text-center">
            Upgrade to Pro
          </a>
          <div className="mt-6 flex flex-col gap-1">
            <a href="#" className="flex items-center gap-3 text-on-surface-variant px-4 py-2 hover:text-white text-xs transition-colors">
              <span className="material-symbols-outlined text-lg">help</span>
              Help Center
            </a>
            <a href="#" className="flex items-center gap-3 text-error/80 px-4 py-2 hover:text-error text-xs transition-colors">
              <span className="material-symbols-outlined text-lg">logout</span>
              Logout
            </a>
          </div>
        </div>
      </aside>

      {/* Main content area with left margin for sidebar */}
      <div className="ml-64">
        {/* Top Bar */}
        <header className="flex justify-between items-center w-full px-8 py-6 bg-surface sticky top-0 z-30 shadow-[0_24px_48px_-5px_rgba(6,14,32,0.4)]">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-black tracking-wider text-primary-container font-headline">
              Asset Analysis
            </h2>
            <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? "gold-gradient text-on-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="bg-surface-container-lowest border-none rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                placeholder="Search markets..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-on-surface-variant hover:bg-surface-bright/60 rounded-full transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-bright/60 rounded-full transition-all">
                <span className="material-symbols-outlined">settings</span>
              </button>
              <UserButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8 space-y-8 max-w-[1400px] mx-auto">
        {/* Hero Stats Bento */}
        <div className="grid grid-cols-12 gap-6 h-[480px]">
          {/* Main Chart Card */}
          <div className="col-span-8 bg-surface-container-low rounded-xl relative overflow-hidden flex flex-col p-6 shadow-xl">
            <div className="flex justify-between items-start mb-8 z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-primary-container/10 text-primary-container px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">
                    Live Market
                  </span>
                  <h3 className="text-on-surface-variant text-sm font-medium">
                    {activeTab === "gold" && "Spot Gold (XAU/USD)"}
                    {activeTab === "silver" && "Spot Silver (XAG/USD)"}
                    {activeTab === "petrol" && "Brent Crude (BCX/USD)"}
                  </h3>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-extrabold font-headline tracking-tight">
                    {loading ? "..." : `$${getAssetData(activeTab).price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className={`${getAssetData(activeTab).change >= 0 ? 'text-secondary' : 'text-error'} font-bold text-lg flex items-center`}>
                    <span className="material-symbols-outlined">{getAssetData(activeTab).change >= 0 ? 'trending_up' : 'trending_down'}</span>
                    {getAssetData(activeTab).change >= 0 ? '+' : ''}{getAssetData(activeTab).change.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {["1H", "4H", "1D", "1W"].map((period) => (
                  <button
                    key={period}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === "1D"
                        ? "bg-primary-container text-on-primary"
                        : "bg-surface-container-high text-on-surface hover:bg-surface-bright"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="flex-1 w-full bg-surface-container-lowest rounded-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/5 to-transparent" />
              <svg
                className="absolute bottom-0 left-0 w-full h-48 opacity-60"
                preserveAspectRatio="none"
                viewBox="0 0 400 100"
              >
                <path
                  d="M0,80 Q50,70 100,85 T200,60 T300,40 T400,20"
                  fill="none"
                  stroke="#4edea3"
                  strokeWidth="3"
                />
                <path
                  d="M0,80 Q50,70 100,85 T200,60 T300,40 T400,20 V100 H0 Z"
                  fill="url(#gradient)"
                  opacity="0.2"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#4edea3", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#4edea3", stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-on-surface-variant/20 font-headline font-black text-6xl tracking-tighter pointer-events-none uppercase">
                  Market Momentum
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center z-10">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                    Volume (24h)
                  </span>
                  <span className="text-sm font-bold">$42.8B</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                    Market Cap
                  </span>
                  <span className="text-sm font-bold">$14.2T</span>
                </div>
              </div>
              <button className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary-container text-primary-container font-bold text-sm hover:bg-primary-container/10 transition-all">
                <span className="material-symbols-outlined text-lg">notifications_active</span>
                Set Alert
              </button>
            </div>
          </div>

          {/* Market Sentiment Card */}
          <div className="col-span-4 space-y-6">
            <div className="bg-surface-container-low p-6 rounded-xl shadow-lg h-1/2 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <h3 className="font-headline font-bold text-lg">Market Sentiment</h3>
                <span className="material-symbols-outlined text-secondary">psychology</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-secondary">Bullish</span>
                  <span className="text-error">Bearish</span>
                </div>
                <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-secondary shadow-[0_0_15px_rgba(78,222,163,0.5)]"
                    style={{ width: "72%" }}
                  />
                  <div className="h-full bg-error" style={{ width: "28%" }} />
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Strong buying pressure observed in Asian markets. Fed rate pause
                  expectations driving gold demand.
                </p>
              </div>
            </div>

            {/* Key Statistics */}
            <div className="bg-surface-container-low p-6 rounded-xl shadow-lg h-1/2 overflow-hidden relative">
              <h3 className="font-headline font-bold text-lg mb-4">Key Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">Previous Close</span>
                  <span className="text-sm font-bold">${getAssetData(activeTab).prevClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">Open</span>
                  <span className="text-sm font-bold">${getAssetData(activeTab).prevClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">Day Range</span>
                  <div className="text-right">
                    <div className="text-sm font-bold">${getAssetData(activeTab).dayLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${getAssetData(activeTab).dayHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="h-1 w-24 bg-surface-container-highest rounded-full mt-1 ml-auto overflow-hidden">
                      <div className="h-full bg-primary-container w-4/5 ml-auto" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">52-Week High</span>
                  <span className="text-sm font-bold text-secondary">${(getAssetData(activeTab).dayHigh * 1.05).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 opacity-5">
                <span
                  className="material-symbols-outlined text-9xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  analytics
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-9 bg-surface-container-low p-8 rounded-xl shadow-lg border border-outline-variant/5">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-headline font-bold text-xl mb-1">
                  Technical Indicators
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Real-time analysis of 14 key oscillator and moving average signals
                </p>
              </div>
              <button className="text-primary-container text-xs font-bold flex items-center gap-1 hover:underline">
                View All
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "RSI (14)", value: "64.2", status: "Neutral" },
                { label: "MACD (12,26)", value: "Buy", status: "Strong Signal", isBuy: true },
                { label: "SMA (50)", value: "$2,284", status: "Above", isAbove: true },
                { label: "Fibonacci", value: "$2,350", status: "Resistance" },
              ].map((indicator, i) => (
                <div
                  key={i}
                  className="bg-surface-container-highest/40 p-5 rounded-xl border border-outline-variant/10 text-center"
                >
                  <span className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest block mb-2">
                    {indicator.label}
                  </span>
                  <span className="text-2xl font-bold block mb-1">{indicator.value}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      indicator.isBuy
                        ? "bg-secondary/10 text-secondary"
                        : indicator.isAbove
                        ? "bg-secondary/10 text-secondary"
                        : "bg-surface-container rounded text-on-surface-variant"
                    }`}
                  >
                    {indicator.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Market Pairs */}
          <div className="col-span-3 space-y-6">
            <div className="bg-surface-container-low p-6 rounded-xl shadow-lg">
              <h3 className="font-headline font-bold text-lg mb-6">Market Pairs</h3>
              <div className="space-y-6">
                {[
                  { name: "XAG/USD", label: "Silver Spot", price: "$28.42", change: "+0.85%", up: true },
                  { name: "Brent Crude", label: "Oil Futures", price: "$84.15", change: "-0.42%", up: false },
                  { name: "EUR/USD", label: "Currency Pair", price: "1.0842", change: "+0.12%", up: true },
                ].map((pair, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg text-on-surface">
                          {i === 0 ? "diamond" : i === 1 ? "local_gas_station" : "euro"}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{pair.name}</div>
                        <div className="text-[10px] text-on-surface-variant font-medium">
                          {pair.label}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{pair.price}</div>
                      <div className={`text-[10px] ${pair.up ? "text-secondary" : "text-error"}`}>
                        {pair.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Prediction Card */}
            <PricePredictionCard 
              pair={getAssetData(activeTab).pair} 
              currentPrice={getAssetData(activeTab).price} 
            />
          </div>
        </div>

        {/* Insights / News Grid */}
        <NewsSection
          title="News & Insights"
          limit={6}
          category="Markets"
        />
      </main>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full gold-gradient text-on-primary shadow-[0_15px_30px_-5px_rgba(255,215,0,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          add_chart
        </span>
      </button>
    </div>
  );
}
