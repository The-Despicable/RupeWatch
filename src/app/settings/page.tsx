"use client";

import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchTelegramStatus();
    }
  }, [isLoaded, user]);

  async function fetchTelegramStatus() {
    try {
      const res = await fetch("/api/user/telegram");
      if (res.ok) {
        const data = await res.json();
        setTelegramConnected(data.telegramConnected);
        setTelegramChatId(data.telegramChatId || "");
      }
    } catch (error) {
      console.error("Failed to fetch Telegram status:", error);
    }
  }

  async function handleTelegramConnect() {
    if (!telegramChatId.trim()) {
      setMessage({ type: "error", text: "Please enter your Telegram Chat ID" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: telegramChatId.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTelegramConnected(true);
        setMessage({ type: "success", text: "Telegram connected successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to connect Telegram" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Connection failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleTelegramDisconnect() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTelegramConnected(false);
        setTelegramChatId("");
        setMessage({ type: "success", text: "Telegram disconnected" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to disconnect" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Disconnection failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary-container animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      {/* TopAppBar */}
      <header className="bg-surface shadow-[0_24px_48px_-5px_rgba(6,14,32,0.4)] sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="material-symbols-outlined text-on-surface-variant hover:text-primary-container transition-colors">
              arrow_back
            </Link>
            <div className="text-2xl font-black text-primary-container tracking-tighter font-headline">
              RupeWatch
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-8">Settings</h1>

        {/* Profile Section */}
        <section className="mb-8">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">person</span>
            Profile
          </h2>
          <div className="bg-surface p-6 rounded-3xl border border-outline-variant/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  person
                </span>
              </div>
              <div>
                <p className="text-on-surface font-bold">{user?.fullName || "User"}</p>
                <p className="text-on-surface-variant text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-8">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">notifications</span>
            Notifications
          </h2>
          <div className="bg-surface p-6 rounded-3xl border border-outline-variant/10">
            {/* Telegram Connection */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
                  alt="Telegram"
                  className="w-8 h-8"
                />
                <div>
                  <p className="text-on-surface font-bold">Telegram Notifications</p>
                  <p className="text-on-surface-variant text-sm">Get instant alerts on your phone</p>
                </div>
              </div>

              {telegramConnected ? (
                <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
                    <span className="text-secondary font-bold">Connected</span>
                  </div>
                  <p className="text-on-surface-variant text-xs mb-3 font-mono">
                    Chat ID: {telegramChatId}
                  </p>
                  <button
                    onClick={handleTelegramDisconnect}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-surface-container-high text-error font-bold rounded-xl hover:bg-error/10 transition-all disabled:opacity-50"
                  >
                    {loading ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-on-surface-variant text-sm mb-3">
                      To get your Chat ID, message our bot:
                    </p>
                    <div className="bg-surface-container-highest rounded-xl p-3 flex items-center justify-between">
                      <code className="text-primary-container font-mono text-sm">@RupeeWatchBot</code>
                      <a
                        href="https://t.me/RupeeWatchBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-container hover:underline"
                      >
                        Open
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="text-on-surface-variant text-sm mb-2 block">
                      Enter your Chat ID (starts with - or digits)
                    </label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="e.g., 123456789 or -1001234567890"
                      className="w-full px-4 py-3 bg-surface-container-high rounded-xl border border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container transition-colors font-mono"
                    />
                  </div>

                  <button
                    onClick={handleTelegramConnect}
                    disabled={loading || !telegramChatId.trim()}
                    className="w-full py-3 bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="" className="w-5 h-5 invert" />
                    {loading ? "Connecting..." : "Connect Telegram"}
                  </button>
                </div>
              )}
            </div>

            {message && (
              <div className={`mt-4 p-4 rounded-xl ${message.type === "success" ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">
                    {message.type === "success" ? "check_circle" : "error"}
                  </span>
                  <span className="font-medium">{message.text}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Help Section */}
        <section>
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">help</span>
            Help
          </h2>
          <div className="bg-surface p-6 rounded-3xl border border-outline-variant/10 space-y-3">
            <a
              href="/dashboard"
              className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors"
            >
              <span className="text-on-surface font-medium">Dashboard</span>
              <span className="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
            </a>
            <a
              href="/alerts"
              className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors"
            >
              <span className="text-on-surface font-medium">Manage Alerts</span>
              <span className="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
            </a>
            <a
              href="/upgrade"
              className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors"
            >
              <span className="text-on-surface font-medium">Subscription</span>
              <span className="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
            </a>
          </div>
        </section>

        {/* Version */}
        <p className="text-center text-on-surface-variant/50 text-xs mt-12">
          RupeWatch v1.0.0 • Made with ☕
        </p>
      </main>
    </div>
  );
}
