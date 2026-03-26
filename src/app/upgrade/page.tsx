"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import QRCode from "react-qr-code";

const UPI_ID = "yaser.hussain69-1@oksbi";
const PAYEE_NAME = "RupeWatch";
const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

type Plan = { name: string; amount: number; label: string; key: string };

const PLANS: Record<string, Plan> = {
  weekly:  { name: "Weekly Alchemist",  amount: 7,  label: "1 Week",  key: "weekly" },
  monthly: { name: "Monthly Alchemist", amount: 50, label: "1 Month", key: "monthly" },
  master:  { name: "Master Alchemist",  amount: 100, label: "3 Months", key: "master" },
};

function buildUpiUrl(app: "gpay" | "phonepe" | "paytm" | "generic", plan: Plan) {
  const note = encodeURIComponent(`RupeWatch ${plan.name}`);
  const name = encodeURIComponent(PAYEE_NAME);
  const base = `upi://pay?pa=${UPI_ID}&pn=${name}&am=${plan.amount}&cu=INR&tn=${note}`;
  if (app === "gpay")    return `tez://upi/pay?pa=${UPI_ID}&pn=${name}&am=${plan.amount}&cu=INR&tn=${note}`;
  if (app === "phonepe") return `phonepe://${base.replace("upi://", "")}`;
  if (app === "paytm")   return `paytmmp://pay?pa=${UPI_ID}&pn=${name}&am=${plan.amount}&cu=INR&tn=${note}`;
  return base;
}

export default function UpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "modal" | "confirming" | "success">("idle");
  const [razorpayReady, setRazorpayReady] = useState(false);

  const plan = selectedPlan ? PLANS[selectedPlan] : null;

  useEffect(() => {
    const loadRazorpay = () => {
      if (!document.getElementById("razorpay-script")) {
        const script = document.createElement("script");
        script.id = "razorpay-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => setRazorpayReady(true);
        document.body.appendChild(script);
      } else {
        setRazorpayReady(true);
      }
    };
    loadRazorpay();
  }, []);

  function openModal(planKey: string) {
    setSelectedPlan(planKey);
    setStep("modal");
  }

  function handleUpiClick(app: "gpay" | "phonepe" | "paytm" | "generic") {
    if (!plan) return;
    window.location.href = buildUpiUrl(app, plan);
  }

  async function handleUpiConfirm() {
    if (!plan) return;
    try {
      await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: plan.key,
          amount: plan.amount,
        }),
      });
      setStep("success");
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Failed to activate subscription. Please contact support.");
    }
  }

  async function handleRazorpay() {
    if (!plan || !razorpayReady || !RAZORPAY_KEY) {
      alert("Payment system not ready. Please try again.");
      return;
    }

    try {
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: plan.amount, plan: plan.key }),
      });

      const order = await res.json();

      if (order.error) {
        alert(order.error);
        return;
      }

      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "RupeWatch",
        description: plan.name,
        order_id: order.id,
        prefill: {
          name: "",
          email: "",
        },
        theme: {
          color: "#FFD700",
        },
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.key,
              amount: plan.amount,
            }),
          });

          const data = await verifyRes.json();

          if (data.success) {
            // Create subscription in database
            await fetch("/api/subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                plan: plan.key,
                paymentId: response.razorpay_payment_id,
                amount: plan.amount,
              }),
            });
            setStep("success");
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            setStep("modal");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    }
  }

  function handleConfirm() { setStep("success"); }
  function handleClose()   { setStep("idle"); setSelectedPlan(null); }

  return (
    <div className="min-h-screen bg-background font-body">
      {/* TopAppBar */}
      <header className="bg-surface shadow-[0_24px_48px_-5px_rgba(6,14,32,0.4)] sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-black text-primary-container tracking-tighter font-headline">
            RupeWatch
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 pb-32">
        {/* Hero Section */}
        <section className="mb-12 relative overflow-hidden rounded-3xl p-8 md:p-12 bg-surface-container-low">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary-container/10 blur-[100px] rounded-full" />
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight">
              Transmute your{" "}
              <span className="text-primary-container">Capital</span> into{" "}
              <span className="text-primary-container">Fortune</span>.
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl font-medium max-w-xl">
              Unlock professional-grade financial tools and exclusive gold-market
              insights with The Midnight Alchemist subscription.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 relative z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-full border border-outline-variant/15">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="text-sm font-semibold tracking-wide uppercase">
                Elite Status
              </span>
            </div>
          </div>
        </section>

        {/* Subscription Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Weekly Alchemist */}
          <div className="glass-card p-6 rounded-3xl border border-outline-variant/10 flex flex-col justify-between hover:bg-surface-bright/50 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-surface-container-high rounded-xl">
                  <span className="material-symbols-outlined text-primary-container text-2xl">
                    schedule
                  </span>
                </div>
                <span className="text-on-surface-variant font-headline font-bold uppercase tracking-widest text-xs">
                  Starter
                </span>
              </div>
              <h3 className="font-headline text-xl font-bold mb-2">
                Weekly Alchemist
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black text-primary-container">
                  ₹7
                </span>
                <span className="text-on-surface-variant font-medium">/week</span>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Basic gold tracking",
                  "Daily market insights",
                  "7-day access",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-lg">
                      check_circle
                    </span>
                    <span className="text-on-surface font-medium text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => openModal("weekly")} className="w-full py-3 bg-surface-container-highest text-primary-container font-headline font-bold rounded-xl active:scale-[0.98] transition-all border border-primary-container/20">
              Get Started
            </button>
          </div>

          {/* Monthly Alchemist */}
          <div className="glass-card p-8 rounded-3xl border border-outline-variant/10 flex flex-col justify-between hover:bg-surface-bright/50 transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-surface-container-high rounded-2xl">
                  <span className="material-symbols-outlined text-primary-container text-3xl">
                    calendar_today
                  </span>
                </div>
                <span className="text-on-surface-variant font-headline font-bold uppercase tracking-widest text-xs">
                  Standard
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">
                Monthly Alchemist
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-primary-container">
                  ₹50
                </span>
                <span className="text-on-surface-variant font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Real-time SAR alerts",
                  "Unlimited gold price tracking",
                  "Basic market insights",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-xl">
                      check_circle
                    </span>
                    <span className="text-on-surface font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => openModal("monthly")} className="w-full py-4 bg-surface-container-highest text-primary-container font-headline font-bold rounded-xl active:scale-[0.98] transition-all border border-primary-container/20">
              Get Started
            </button>
          </div>

          {/* Master Alchemist */}
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-[#1a2336] to-[#0b1326] border-2 border-primary-container/40 flex flex-col justify-between gold-glow group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-container to-primary-fixed px-6 py-1 rounded-full text-on-primary font-headline font-black text-xs uppercase tracking-widest shadow-lg">
              Best Value
            </div>
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-primary-container rounded-2xl">
                  <span
                    className="material-symbols-outlined text-on-primary text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    stars
                  </span>
                </div>
                <span className="text-primary-container font-headline font-bold uppercase tracking-widest text-xs">
                  Elite Tier
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">
                Master Alchemist
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-black text-primary-container">
                  ₹100
                </span>
                <span className="text-on-surface-variant font-medium">/3 months</span>
              </div>
              <p className="text-secondary font-semibold text-sm mb-6 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_down</span>
                Save 33% compared to monthly
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  { icon: "auto_awesome", text: "Predictive sentiment analysis", italic: true },
                  { icon: "check_circle", text: "Real-time SAR alerts" },
                  { icon: "check_circle", text: "Unlimited gold price tracking" },
                  { icon: "check_circle", text: "Priority support alchemist" },
                  { icon: "check_circle", text: "AI-powered predictions" },
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-xl ${
                        feature.italic ? "text-primary-container" : "text-secondary"
                      }`}
                      style={
                        feature.italic
                          ? { fontVariationSettings: "'FILL' 1" }
                          : undefined
                      }
                    >
                      {feature.icon}
                    </span>
                    <span
                      className={`text-on-surface ${
                        feature.italic ? "font-semibold italic" : "font-medium"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => openModal("master")} className="w-full py-4 bg-gradient-to-br from-[#ffd700] to-[#ffe16d] text-[#3a3000] font-headline font-black rounded-xl active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(255,215,0,0.3)]">
              Upgrade Now
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <section className="mb-12">
          <h2 className="font-headline text-xl font-bold mb-6 text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">
              account_balance_wallet
            </span>
            Secure Payment
          </h2>
          <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
            <p className="text-on-surface-variant font-medium text-sm mb-4 uppercase tracking-tighter">
              Powered by UPI
            </p>
            <div className="flex flex-wrap gap-6 items-center">
              {[
                { name: "GPay", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png" },
                { name: "PhonePe", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PhonePe_Logo.svg/512px-PhonePe_Logo.svg.png" },
                { name: "Paytm", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/512px-Paytm_Logo_%28standalone%29.svg.png" },
              ].map((method, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <img
                    src={method.img}
                    alt={method.name}
                    className="h-8 object-contain rounded-md"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {method.name}
                  </span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-4 text-on-surface-variant/40">
                <span className="material-symbols-outlined">lock</span>
                <span className="text-xs font-medium">AES-256 Encrypted</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "query_stats",
              title: "Real-time SAR",
              desc: "Advanced Stop-and-Reverse indicators updated every millisecond for precise entry and exit.",
              color: "text-primary-container",
            },
            {
              icon: "grid_goldenratio",
              title: "Pure Gold Tracking",
              desc: "Track 24K and 22K prices across 50+ global exchanges with zero latency.",
              color: "text-secondary",
            },
            {
              icon: "psychology",
              title: "Sentiment AI",
              desc: "Our proprietary Alchemist AI analyzes social trends to predict market swings before they happen.",
              color: "text-primary-fixed-dim",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 bg-surface-container-lowest rounded-3xl border border-outline-variant/5"
            >
              <span className={`material-symbols-outlined ${feature.color} mb-4 text-3xl`}>
                {feature.icon}
              </span>
              <h4 className="font-headline font-bold text-lg mb-2">
                {feature.title}
              </h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-surface/80 backdrop-blur-xl shadow-[0_-10px_30px_rgba(6,14,32,0.6)] rounded-t-3xl">
        {[
          { icon: "dashboard", label: "Dashboard" },
          { icon: "trending_up", label: "Markets" },
          { icon: "account_balance_wallet", label: "Portfolio" },
        ].map((item, i) => (
          <a
            key={i}
            className="flex flex-col items-center justify-center text-on-surface-variant opacity-70 hover:text-primary-container transition-all active:scale-90 duration-150"
            href="#"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body text-[10px] font-medium tracking-wide uppercase">
              {item.label}
            </span>
          </a>
        ))}
        <a
          className="flex flex-col items-center justify-center bg-gradient-to-br from-primary-container to-primary-fixed text-on-primary rounded-xl px-4 py-1.5 active:scale-90 duration-150"
          href="#"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            stars
          </span>
          <span className="font-body text-[10px] font-medium tracking-wide uppercase">
            Upgrade
          </span>
        </a>
      </nav>

      {/* Visual decoration */}
      <div className="fixed bottom-0 right-0 p-8 opacity-5 pointer-events-none select-none">
        <span className="material-symbols-outlined text-[300px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 100" }}>
          water_drop
        </span>
      </div>

      {/* ── UPI Payment Modal ─────────────────────────────────────────────── */}
      {step !== "idle" && plan && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-surface rounded-3xl border border-outline-variant/20 shadow-2xl overflow-hidden">

            {/* Success screen */}
            {step === "success" ? (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-extrabold text-on-surface">Payment Submitted!</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  We've received your request for <span className="text-primary-container font-bold">{plan.name}</span>.
                  Your account will be upgraded within a few minutes once payment is confirmed.
                </p>
                <button onClick={handleClose} className="mt-4 w-full py-3 bg-gradient-to-br from-[#ffd700] to-[#ffe16d] text-[#3a3000] font-headline font-black rounded-xl active:scale-[0.98] transition-all">
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant/10">
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-0.5">Pay via UPI</p>
                    <h3 className="font-headline font-extrabold text-on-surface text-lg">{plan.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary-container">₹{plan.amount}</span>
                    <p className="text-[10px] text-on-surface-variant">{plan.label}</p>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-3">
                  {step === "modal" ? (
                    <>
                      {/* QR Code Section */}
                      <div className="flex flex-col items-center justify-center mb-4">
                        <div className="p-3 bg-white rounded-xl border border-outline-variant/20 shadow-md flex items-center justify-center">
                          <QRCode
                            value={plan ? buildUpiUrl("generic", plan) : ""}
                            size={180}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 180 180`}
                          />
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-2 text-center">
                          Scan & pay using any UPI app
                        </p>
                      </div>

                      {/* OR Divider */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-px bg-outline-variant/20" />
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">or pay via</span>
                        <div className="flex-1 h-px bg-outline-variant/20" />
                      </div>

                      {/* Razorpay Card */}
                      <button
                        onClick={handleRazorpay}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-[#2b63d0] to-[#1a4fc4] rounded-2xl border border-blue-500/30 hover:from-[#3b73e0] hover:to-[#2a5fd4] transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <span className="text-[#2b63d0] font-black text-lg font-headline">R</span>
                        </div>
                        <span className="font-headline font-bold text-white">Card / Netbanking</span>
                        <span className="material-symbols-outlined text-white/60 ml-auto text-xl">arrow_forward</span>
                      </button>

                      {/* GPay */}
                      <button
                        onClick={() => handleUpiClick("gpay")}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-surface-container-high rounded-2xl border border-outline-variant/10 hover:bg-surface-bright transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/512px-Google_Pay_Logo.svg.png" className="h-6 object-contain" alt="GPay" onError={e => e.currentTarget.style.display='none'} />
                        </div>
                        <span className="font-headline font-bold text-on-surface">Google Pay</span>
                        <span className="material-symbols-outlined text-on-surface-variant ml-auto text-xl">arrow_forward</span>
                      </button>

                      {/* PhonePe */}
                      <button
                        onClick={() => handleUpiClick("phonepe")}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-surface-container-high rounded-2xl border border-outline-variant/10 hover:bg-surface-bright transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#5f259f] flex items-center justify-center shadow-sm">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PhonePe_Logo.svg/512px-PhonePe_Logo.svg.png" className="h-6 object-contain" alt="PhonePe" onError={e => e.currentTarget.style.display='none'} />
                        </div>
                        <span className="font-headline font-bold text-on-surface">PhonePe</span>
                        <span className="material-symbols-outlined text-on-surface-variant ml-auto text-xl">arrow_forward</span>
                      </button>

                      {/* Paytm */}
                      <button
                        onClick={() => handleUpiClick("paytm")}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-surface-container-high rounded-2xl border border-outline-variant/10 hover:bg-surface-bright transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#00b9f1] flex items-center justify-center shadow-sm">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/512px-Paytm_Logo_%28standalone%29.svg.png" className="h-6 object-contain" alt="Paytm" onError={e => e.currentTarget.style.display='none'} />
                        </div>
                        <span className="font-headline font-bold text-on-surface">Paytm</span>
                        <span className="material-symbols-outlined text-on-surface-variant ml-auto text-xl">arrow_forward</span>
                      </button>

                      {/* Any UPI */}
                      <button
                        onClick={() => handleUpiClick("generic")}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-surface-container-high rounded-2xl border border-outline-variant/10 hover:bg-surface-bright transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                        </div>
                        <span className="font-headline font-bold text-on-surface">Any UPI App</span>
                        <span className="material-symbols-outlined text-on-surface-variant ml-auto text-xl">arrow_forward</span>
                      </button>

                      <button
                        onClick={() => setStep("confirming")}
                        className="w-full py-2 mt-2 text-sm text-primary-container hover:underline font-medium"
                      >
                        I have paid (manual confirmation)
                      </button>

                      <button onClick={handleClose} className="w-full pt-2 text-xs text-on-surface-variant hover:text-on-surface transition-colors text-center">
                        Cancel
                      </button>
                    </>
                  ) : ( /* confirming step */
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center animate-pulse">
                        <span className="material-symbols-outlined text-primary-container text-2xl">pending</span>
                      </div>
                      <p className="text-on-surface font-bold">Did you complete the payment?</p>
                      <p className="text-on-surface-variant text-xs">If your UPI app opened and you paid ₹{plan.amount}, tap confirm below.</p>
                      <button onClick={handleUpiConfirm} className="w-full py-3 bg-gradient-to-br from-[#ffd700] to-[#ffe16d] text-[#3a3000] font-headline font-black rounded-xl active:scale-[0.98] transition-all">
                        Yes, I've Paid ✓
                      </button>
                      <button onClick={() => setStep("modal")} className="text-xs text-on-surface-variant hover:text-on-surface transition-colors">
                        No, go back
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
