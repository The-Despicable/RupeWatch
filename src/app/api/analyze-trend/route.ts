import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const { series, days } = await request.json();

    if (!series || series.length === 0) {
      return NextResponse.json({
        sentiment: 'neutral',
        summary: 'No trend data available yet.',
      });
    }

    const startPrice = series[0];
    const endPrice = series[series.length - 1];
    const min = Math.min(...series);
    const max = Math.max(...series);
    const change = ((endPrice - startPrice) / startPrice) * 100;

    if (!apiKey) {
      return NextResponse.json({
        sentiment: change >= 0 ? 'bullish' : 'bearish',
        summary: `USD/INR ${change >= 0 ? 'gained' : 'lost'} ${Math.abs(change).toFixed(2)}% over ${days} days (₹${min.toFixed(2)} - ₹${max.toFixed(2)}).`,
      });
    }

    const prompt = `You are a financial analyst. Analyze the following USD/INR exchange rate data over the last ${days} days.
    - Start: ${startPrice.toFixed(2)}
    - End: ${endPrice.toFixed(2)}
    - Change: ${change.toFixed(2)}%
    - Range: ${min.toFixed(2)} – ${max.toFixed(2)}
    Provide a short, actionable insight (max 50 words) in JSON format with fields "sentiment" (bullish/bearish/neutral) and "summary".`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('DeepSeek API error');
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[analyze-trend] Error:', error);
    return NextResponse.json({
      sentiment: 'neutral',
      summary: 'Trend analysis temporarily unavailable.',
    });
  }
}
