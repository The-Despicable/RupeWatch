"use client";
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserButton } from "@clerk/nextjs";
import PricePredictionCard from "@/components/PricePredictionCard";
import NewsSection from "@/components/NewsSection";
import TrendAnalysis from "@/components/TrendAnalysis";

interface ExchangeRates {
  USD: number;
  EUR: number;
  GBP: number;
  SAR: number;
}

export default function DashboardPage() {
  const [days, setDays] = useState<number>(30);
  const [series, setSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [prevRates, setPrevRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [goldPrice, setGoldPrice] = useState<number | null>(null);
  const [prevGoldPrice, setPrevGoldPrice] = useState<number | null>(null);

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchSeries = useCallback(async (daysCount: number) => {
    try {
      setLoading(true);
      setError(null);
      const end = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - daysCount + 1);
      const startDate = formatDate(start);
      const endDate = formatDate(end);

      const urls = [
        `https://api.frankfurter.app/${startDate}..${endDate}?base=USD&symbols=INR`,
        `https://www.frankfurter.app/${startDate}..${endDate}?base=USD&symbols=INR`,
      ];
      let data: any = null;
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch {
          // try next URL
        }
      }
      if (!data) throw new Error('Failed to fetch exchange rate data');
      const ratesData = data?.rates || {};
      const dates = Object.keys(ratesData).sort();
      const arr = dates.map((date) => ratesData[date]?.INR).filter((v) => typeof v === 'number') as number[];
      setSeries(arr);
    } catch (e: any) {
      setError(e?.message || 'Unknown error while loading chart data');
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrevRates = useCallback(async () => {
    try {
      const res = await fetch('/api/prev-rates');
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;
      setPrevRates(data);
    } catch (e) {
      console.error('Error fetching previous rates:', e);
    }
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const res = await fetch('/api/rates');
      if (!res.ok) throw new Error('Failed to fetch rates');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRates(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      console.error('Error fetching exchange rates:', e);
      setError('Could not fetch live rates. Please try again later.');
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const fetchGold = useCallback(async () => {
    try {
      const res = await fetch('/api/gold');
      if (!res.ok) throw new Error('Gold API failed');
      const data = await res.json();
      setPrevGoldPrice(goldPrice);
      setGoldPrice(data.per10g);
    } catch (e) {
      console.error('Error fetching gold price:', e);
    }
  }, [goldPrice]);

  useEffect(() => {
    fetchExchangeRates();
    fetchPrevRates();
    const interval = setInterval(() => {
      fetchExchangeRates();
      fetchPrevRates();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchExchangeRates, fetchPrevRates]);

  useEffect(() => {
    fetchSeries(days);
  }, [days, fetchSeries]);

  useEffect(() => {
    fetchGold();
    const interval = setInterval(fetchGold, 300000);
    return () => clearInterval(interval);
  }, [fetchGold]);

  const getPercentageChange = (current: number, previous: number): number => {
    if (!previous || !current) return 0;
    return ((current - previous) / previous) * 100;
  };

  const pathD = useMemo(() => {
    const w = 1000;
    const h = 180;
    if (!series.length) return '';
    const min = Math.min(...series);
    const max = Math.max(...series);
    if (max === min) {
      return `M0,${h / 2} L${w},${h / 2}`;
    }
    const step = series.length > 1 ? w / (series.length - 1) : w;
    let d = `M 0,${h - ((series[0] - min) / (max - min)) * h}`;
    for (let i = 1; i < series.length; i++) {
      const x = i * step;
      const y = h - ((series[i] - min) / (max - min)) * h;
      d += ` L ${x},${y}`;
    }
    return d;
  }, [series]);

  const barData = useMemo(() => {
    if (series.length < 5) return [];
    const last5 = series.slice(-5);
    const max = Math.max(...last5);
    const min = Math.min(...last5);
    if (max === min) return last5.map(() => 0.5);
    return last5.map(value => (value - min) / (max - min));
  }, [series]);

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface shadow-[0_24px_48px_-5px_rgba(6,14,32,0.4)]">
        <div className="text-2xl font-bold tracking-tight text-primary-container font-headline">
          RupeWatch
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:bg-surface-bright/60 transition-colors rounded-full active:scale-90 transition-transform">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <UserButton />
        </div>
      </header>

      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 z-40 bg-surface pt-20">
        <nav className="flex-1 px-4 space-y-2">
          {[
            { href: "/dashboard", icon: "dashboard", label: "Dashboard", active: true },
            { href: "/analysis", icon: "analytics", label: "Analysis" },
            { href: "/alerts", icon: "notifications_active", label: "My Alerts" },
            { href: "/history", icon: "history", label: "History" },
            { href: "/settings", icon: "settings", label: "Settings" },
          ].map(({ href, icon, label, active }) => (
            <a
              key={label}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                active
                  ? "text-primary-container border-r-2 border-primary-container bg-surface-container-high font-bold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span className="font-label">{label}</span>
            </a>
          ))}
        </nav>
        <div className="p-6">
          <a href="/upgrade" className="block w-full py-3 px-4 gold-gradient text-on-primary font-bold rounded-full active:scale-95 transition-transform text-center">
            Upgrade to Pro
          </a>
        </div>
      </aside>

      <main className="pt-24 pb-12 px-6 md:pl-72 md:pr-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          {error && (
            <div className="bg-error/10 border border-error/20 text-error rounded-xl p-4 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                {error}
              </span>
              <button onClick={() => setError(null)} className="material-symbols-outlined">close</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* USD/INR */}
            <div className="bg-surface-container-highest p-5 rounded-xl border border-outline-variant/15 flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-on-surface-variant font-label text-sm uppercase tracking-wider">
                  USD / INR
                </span>
                {rates && prevRates && (
                  <span className={`flex items-center text-xs font-bold ${getPercentageChange(rates.USD, prevRates.USD) >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {getPercentageChange(rates.USD, prevRates.USD) >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(getPercentageChange(rates.USD, prevRates.USD)).toFixed(2)}%
                  </span>
                )}
              </div>
              <div>
                {ratesLoading ? (
                  <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                ) : rates ? (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">
                    {rates.USD.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">—</div>
                )}
                <div className="text-on-surface-variant text-xs mt-1">Live Market Rate</div>
              </div>
            </div>

            {/* EUR/INR */}
            <div className="bg-surface-container-highest p-5 rounded-xl border border-outline-variant/15 flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-on-surface-variant font-label text-sm uppercase tracking-wider">
                  EUR / INR
                </span>
                {rates && prevRates && (
                  <span className={`flex items-center text-xs font-bold ${getPercentageChange(rates.EUR, prevRates.EUR) >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {getPercentageChange(rates.EUR, prevRates.EUR) >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(getPercentageChange(rates.EUR, prevRates.EUR)).toFixed(2)}%
                  </span>
                )}
              </div>
              <div>
                {ratesLoading ? (
                  <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                ) : rates ? (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">
                    {rates.EUR.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">—</div>
                )}
                <div className="text-on-surface-variant text-xs mt-1">Live Market Rate</div>
              </div>
            </div>

            {/* GBP/INR */}
            <div className="bg-surface-container-highest p-5 rounded-xl border border-outline-variant/15 flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-on-surface-variant font-label text-sm uppercase tracking-wider">
                  GBP / INR
                </span>
                {rates && prevRates && (
                  <span className={`flex items-center text-xs font-bold ${getPercentageChange(rates.GBP, prevRates.GBP) >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {getPercentageChange(rates.GBP, prevRates.GBP) >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(getPercentageChange(rates.GBP, prevRates.GBP)).toFixed(2)}%
                  </span>
                )}
              </div>
              <div>
                {ratesLoading ? (
                  <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                ) : rates ? (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">
                    {rates.GBP.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">—</div>
                )}
                <div className="text-on-surface-variant text-xs mt-1">Live Market Rate</div>
              </div>
            </div>

            {/* Gold */}
            <div className="bg-surface-container-highest p-5 rounded-xl border border-outline-variant/15 flex flex-col justify-between h-40 ring-1 ring-primary-container/30 shadow-lg shadow-primary-container/5">
              <div className="flex justify-between items-start">
                <span className="text-primary-container font-label text-sm font-bold uppercase tracking-wider">
                  Gold / 10g
                </span>
                {goldPrice !== null && prevGoldPrice !== null && (
                  <span className={`flex items-center text-xs font-bold ${getPercentageChange(goldPrice, prevGoldPrice) >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {getPercentageChange(goldPrice, prevGoldPrice) >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(getPercentageChange(goldPrice, prevGoldPrice)).toFixed(2)}%
                  </span>
                )}
              </div>
              <div>
                {goldPrice === null ? (
                  <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                ) : (
                  <div className="text-3xl font-headline font-extrabold text-primary-container">
                    ₹{goldPrice.toLocaleString('en-IN')}
                  </div>
                )}
                <div className="text-on-surface-variant text-xs mt-1">24K Bullion Rate</div>
              </div>
            </div>
          </div>

          {/* SAR/INR Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-highest p-5 rounded-xl border border-outline-variant/15 flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <span className="text-on-surface-variant font-label text-sm uppercase tracking-wider">
                  SAR / INR
                </span>
                {rates && prevRates && (
                  <span className={`flex items-center text-xs font-bold ${getPercentageChange(rates.SAR, prevRates.SAR) >= 0 ? 'text-secondary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {getPercentageChange(rates.SAR, prevRates.SAR) >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(getPercentageChange(rates.SAR, prevRates.SAR)).toFixed(2)}%
                  </span>
                )}
              </div>
              <div>
                {ratesLoading ? (
                  <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                ) : rates ? (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">
                    {rates.SAR.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-3xl font-headline font-extrabold text-on-surface">—</div>
                )}
                <div className="text-on-surface-variant text-xs mt-1">Live Market Rate</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-headline font-bold text-on-surface">
                    30-Day USD/INR Trend
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDays(7)}
                      className={days === 7
                        ? 'px-3 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold'
                        : 'px-3 py-1 rounded-full bg-surface-container-high text-xs text-on-surface-variant border border-outline-variant/20'}
                    >
                      7D
                    </button>
                    <button
                      onClick={() => setDays(30)}
                      className={days === 30
                        ? 'px-3 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold'
                        : 'px-3 py-1 rounded-full bg-surface-container-high text-xs text-on-surface-variant border border-outline-variant/20'}
                    >
                      30D
                    </button>
                    <button
                      onClick={() => setDays(365)}
                      className={days === 365
                        ? 'px-3 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold'
                        : 'px-3 py-1 rounded-full bg-surface-container-high text-xs text-on-surface-variant border border-outline-variant/20'}
                    >
                      1Y
                    </button>
                  </div>
                </div>
                <TrendAnalysis series={series} days={days} />
                <div className="bg-surface-container-lowest h-[400px] rounded-2xl border border-outline-variant/10 relative overflow-hidden group">
                  <div className="absolute inset-0 p-8 flex items-end justify-between">
                    {barData.map((heightRatio, idx) => {
                      const barHeight = heightRatio * 100 + 20;
                      return (
                        <div
                          key={idx}
                          className="w-[5%] bg-primary-container/40 rounded-t-lg transition-all duration-300"
                          style={{ height: `${barHeight}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent pointer-events-none" />
                  <svg
                    className="absolute inset-0 w-full h-full opacity-40"
                    preserveAspectRatio="none"
                  >
                    <path d={pathD} fill="none" stroke="#ffd700" strokeWidth="3" />
                  </svg>
                </div>
              </div>

              <NewsSection
                title="Market News & Insights"
                limit={6}
              />
            </div>

            <div className="space-y-6">
              <section className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-on-surface">My Alerts</h3>
                  <a href="/alerts" className="material-symbols-outlined text-primary-container text-xl">
                    add_circle
                  </a>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-high rounded-xl flex items-center justify-between group cursor-pointer hover:bg-surface-bright transition-all">
                    <div>
                      <div className="text-sm font-bold text-on-surface">USD/INR &gt; 88.00</div>
                      <div className="text-[10px] text-on-surface-variant">Created 2 days ago</div>
                    </div>
                    <div className="w-10 h-6 bg-secondary/20 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-secondary rounded-full" />
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-high rounded-xl flex items-center justify-between opacity-60">
                    <div>
                      <div className="text-sm font-bold text-on-surface">Gold &lt; ₹75,000</div>
                      <div className="text-[10px] text-on-surface-variant">Paused</div>
                    </div>
                    <div className="w-10 h-6 bg-surface-container-highest rounded-full relative">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-on-surface-variant rounded-full" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0088cc] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-white text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      send
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-on-surface">RupeWatch Bot</h3>
                </div>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  <div className="flex gap-3">
                    <div className="w-1 bg-secondary rounded-full" />
                    <div className="flex-1">
                      <p className="text-xs text-on-surface leading-relaxed">
                        <span className="font-bold text-primary-container">
                          Gold hit ₹{goldPrice !== null ? goldPrice.toLocaleString('en-IN') : '—'}/10g
                        </span>{' '}
                        - up ₹1,080 today. Highest in 14 days.
                      </p>
                      <span className="text-[9px] text-on-surface-variant mt-1 block">
                        Just now
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1 bg-error rounded-full" />
                    <div className="flex-1">
                      <p className="text-xs text-on-surface leading-relaxed">
                        USD/INR dipped to 87.42 following RBI intervention rumors.
                      </p>
                      <span className="text-[9px] text-on-surface-variant mt-1 block">
                        14 mins ago
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1 bg-secondary rounded-full" />
                    <div className="flex-1">
                      <p className="text-xs text-on-surface leading-relaxed">
                        EUR/INR gains strength; currently trading at 94.18.
                      </p>
                      <span className="text-[9px] text-on-surface-variant mt-1 block">
                        1 hour ago
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-on-surface">AI Price Predictions</h3>
                  <span className="px-3 py-1 bg-secondary/20 text-secondary text-xs font-bold rounded-full">
                    Powered by Claude
                  </span>
                </div>
                <div className="space-y-4">
                  <PricePredictionCard pair="USD/INR" currentPrice={rates?.USD ?? 87.42} />
                  <PricePredictionCard pair="GOLD" currentPrice={goldPrice ?? 0} />
                </div>
                {lastUpdated && (
                  <div className="text-[10px] text-on-surface-variant text-center">
                    Rates updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-4 px-8 flex flex-col md:flex-row justify-between items-center bg-surface-container-lowest border-t border-outline-variant/15 mt-12 gap-4">
        <div className="text-sm font-bold text-primary-container font-headline">RupeWatch</div>
        <div className="text-[12px] font-medium text-on-surface-variant font-label">
          © 2026 RupeWatch. Midnight Alchemist Edition.
        </div>
        <div className="flex gap-6">
          <a className="text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#">
            Terms
          </a>
          <a className="text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#">
            Privacy
          </a>
          <a className="text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#">
            API Status
          </a>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-surface-container-low border-t border-outline-variant/10 flex justify-around items-center z-50">
        {[
          { href: "/dashboard", icon: "dashboard", label: "Home", active: true },
          { href: "/analysis", icon: "analytics", label: "Analysis" },
          { href: "/alerts", icon: "notifications", label: "Alerts" },
          { href: "/profile", icon: "person", label: "Profile" },
        ].map(({ href, icon, label, active }) => (
          <a
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 ${active ? "text-primary-container" : "text-on-surface-variant"}`}
          >
            <span
              className="material-symbols-outlined"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="text-[10px] font-medium">{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
