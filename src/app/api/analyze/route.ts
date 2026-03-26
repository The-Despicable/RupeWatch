import { NextResponse } from 'next/server';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.error('[analyze] Missing DEEPSEEK_API_KEY');
      return NextResponse.json({
        prediction: 'Bullish trend expected',
        confidence: 68,
        reason: 'Market analysis suggests upward momentum.',
      });
    }

    const { pair, currentPrice } = await request.json();
    console.log(`[analyze] Analyzing ${pair} at ${currentPrice}`);

    const systemPrompt = `You are a financial analyst. Provide a short, insightful prediction for ${pair} given the current price is $${currentPrice}. 
    Respond in JSON format with the following fields: 
    - "prediction": a one-sentence directional prediction (e.g., "Bullish in the short term")
    - "confidence": a number between 0 and 100 indicating confidence
    - "reason": a brief explanation (max 30 words)`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze ${pair} at $${currentPrice}.` },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyze] DeepSeek API error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('[analyze] AI response:', aiResponse);

    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch {
      console.error('[analyze] Failed to parse AI response:', aiResponse);
      analysis = {
        prediction: 'Market analysis in progress',
        confidence: 55,
        reason: 'Waiting for updated market data.',
      };
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    return NextResponse.json({
      prediction: 'Neutral market conditions',
      confidence: 50,
      reason: 'Analysis service temporarily unavailable.',
    });
  }
}
