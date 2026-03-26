import { NextRequest, NextResponse } from "next/server";

type CurrencyPair = "USD/INR" | "EUR/INR" | "GBP/INR";
type Commodity = "GOLD" | "SILVER" | "CRUDE";

interface PredictionDay {
  day: string;
  high: number;
  low: number;
  trend: "up" | "down" | "stable";
  confidence: number;
}

interface PricePrediction {
  pair: CurrencyPair | Commodity;
  currentPrice: number;
  prediction: PredictionDay[];
  summary: string;
  factors: string[];
}

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "https://models.llamacloud.ai/api/v1/chat";
const API_KEY = process.env.OLLAMA_API_KEY || process.env.ANTHROPIC_API_KEY;

async function getOllamaPrediction(
  pair: CurrencyPair | Commodity,
  currentPrice: number
): Promise<PricePrediction> {
  const prompt = `You are a financial analyst AI. Provide a 7-day price prediction for ${pair} currently trading at ${currentPrice}.

Return a JSON response with this exact structure:
{
  "pair": "${pair}",
  "currentPrice": ${currentPrice},
  "prediction": [
    {"day": "Day 1", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0},
    {"day": "Day 2", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0},
    {"day": "Day 3", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0},
    {"day": "Day 4", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0},
    {"day": "Day 5", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0},
    {"day": "Day 6", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0},
    {"day": "Day 7", "high": number, "low": number, "trend": "up|down|stable", "confidence": 0.0-1.0}
  ],
  "summary": "2-3 sentence analysis summary",
  "factors": ["factor 1", "factor 2", "factor 3"]
}

Rules:
- High/Low should be realistic (±0.5-3% from current price)
- Add reasonable variance per day
- Trend should reflect natural market movement
- Confidence should decrease further into the future (0.8-0.5 range)
- Return ONLY valid JSON, no markdown or explanation`;

  const response = await fetch(OLLAMA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-instruct",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ollama API error:", response.status, errorText);
    throw new Error(`Ollama API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const cleanedResponse = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleanedResponse) as PricePrediction;
  } catch {
    console.error("Failed to parse JSON response:", content);
    throw new Error("Invalid JSON response from AI");
  }
}

function generateFallbackPrediction(
  pair: CurrencyPair | Commodity,
  currentPrice: number
): PricePrediction {
  const days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
  const trends: ("up" | "down" | "stable")[] = ["up", "stable", "up", "down", "stable", "up", "up"];

  const prediction = days.map((day, i) => {
    const variance = (Math.random() - 0.4) * 0.03;
    const confidence = Math.max(0.5, 0.85 - i * 0.05);
    return {
      day,
      high: Number((currentPrice * (1 + variance + 0.005)).toFixed(2)),
      low: Number((currentPrice * (1 + variance - 0.005)).toFixed(2)),
      trend: trends[i],
      confidence,
    };
  });

  return {
    pair,
    currentPrice,
    prediction,
    summary: `Based on current market conditions, ${pair} shows a mixed trend for the coming week. Markets remain volatile with potential for both gains and corrections.`,
    factors: [
      "Global economic conditions",
      "Local currency demand",
      "Market sentiment",
    ],
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pair = searchParams.get("pair") as CurrencyPair | Commodity | null;
  const price = searchParams.get("price");

  if (!pair || !price) {
    return NextResponse.json(
      { error: "Missing pair or price parameter" },
      { status: 400 }
    );
  }

  const currentPrice = parseFloat(price);
  if (isNaN(currentPrice)) {
    return NextResponse.json(
      { error: "Invalid price value" },
      { status: 400 }
    );
  }

  try {
    const prediction = await getOllamaPrediction(pair, currentPrice);
    return NextResponse.json(prediction);
  } catch (error) {
    console.error("Prediction error:", error);
    const fallback = generateFallbackPrediction(pair, currentPrice);
    return NextResponse.json(fallback);
  }
}
