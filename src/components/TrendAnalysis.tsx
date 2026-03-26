"use client";

import { useState, useEffect } from 'react';

interface Analysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
}

interface Props {
  series: number[];
  days: number;
}

export default function TrendAnalysis({ series, days }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!series.length) return;

    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/analyze-trend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series, days }),
        });
        const data = await res.json();
        setAnalysis(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [series, days]);

  if (loading) {
    return (
      <div className="bg-surface-container-low p-4 rounded-xl animate-pulse">
        <div className="h-4 bg-surface-container-highest rounded w-1/3 mb-2" />
        <div className="h-6 bg-surface-container-highest rounded w-2/3" />
      </div>
    );
  }

  if (!analysis) return null;

  const sentimentColor = {
    bullish: 'text-secondary',
    bearish: 'text-error',
    neutral: 'text-on-surface-variant',
  }[analysis.sentiment];

  return (
    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex items-start gap-3">
      <span className="material-symbols-outlined text-2xl text-primary-container">insight</span>
      <div>
        <p className="text-xs text-on-surface-variant uppercase tracking-wide">
          AI Trend Analysis
        </p>
        <p className="text-sm font-medium text-on-surface">
          {analysis.summary}
        </p>
        <p className={`text-xs font-bold mt-1 ${sentimentColor}`}>
          Sentiment: {analysis.sentiment.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
