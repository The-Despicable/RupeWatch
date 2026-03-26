"use client";

import { useState, useEffect } from "react";

interface PredictionData {
  prediction: string;
  confidence: number;
  reason: string;
}

interface PricePredictionCardProps {
  pair: string;
  currentPrice: number;
}

export default function PricePredictionCard({ pair, currentPrice }: PricePredictionCardProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, currentPrice }),
      });
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error(err);
      setPrediction({
        prediction: 'Market data loading',
        confidence: 50,
        reason: 'Fetching latest market analysis.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, [pair, currentPrice]);

  const formatPrice = (price: number) => {
    if (pair.includes('INR') || pair === 'GOLD' || pair === 'SILVER') {
      return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return price.toFixed(4);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-secondary';
    if (confidence >= 50) return 'text-primary-container';
    return 'text-on-surface-variant';
  };

  return (
    <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-lg">psychology</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-on-surface">{pair} Prediction</h3>
            <p className="text-xs text-on-surface-variant">AI-Powered Forecast</p>
          </div>
        </div>
        <button
          onClick={fetchPrediction}
          disabled={loading}
          className="p-2 hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
          title="Refresh prediction"
        >
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      {loading && !prediction && (
        <div className="space-y-3">
          <div className="h-6 bg-surface-container-high animate-pulse rounded w-3/4" />
          <div className="h-4 bg-surface-container-high animate-pulse rounded w-1/2" />
          <div className="h-16 bg-surface-container-high animate-pulse rounded" />
        </div>
      )}

      {error && !prediction && (
        <p className="text-error text-sm">{error}</p>
      )}

      {prediction && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-high p-3 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-1">Current Price</p>
              <p className="font-headline font-bold text-on-surface text-lg">
                {formatPrice(currentPrice)}
              </p>
            </div>
            <div className="bg-surface-container-high p-3 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-1">Confidence</p>
              <p className={`font-headline font-bold text-lg ${getConfidenceColor(prediction.confidence)}`}>
                {prediction.confidence}%
              </p>
            </div>
          </div>

          <div className="p-4 bg-surface-container-high/50 rounded-xl">
            <p className="text-lg font-bold text-on-surface mb-2">
              {prediction.prediction}
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {prediction.reason}
            </p>
          </div>

          <div className="pt-2 border-t border-outline-variant/20">
            <p className="text-[10px] text-on-surface-variant/50 text-right">
              Powered by DeepSeek
            </p>
          </div>
        </>
      )}
    </div>
  );
}
