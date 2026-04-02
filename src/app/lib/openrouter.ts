import { Message } from './types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4';

const HEADERS = {
  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'X-Title': 'Ikigai Coach',
};

async function openRouterFetch(messages: Message[], stream: boolean, maxTokens: number = 400): Promise<Response> {
  // For non-streaming (synthesis): abort 10s before Vercel's 60s hard kill
  // so we can return a clean error the client can retry.
  // For streaming: no fetch-level timeout — stale detection happens in route.ts.
  const controller = stream ? undefined : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), 50000) : undefined;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        frequency_penalty: 0.3,
        ...(stream && { stream: true }),
      }),
      ...(controller && { signal: controller.signal }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function chatCompletion(messages: Message[]): Promise<string> {
  const response = await openRouterFetch(messages, false, 2000);
  const data = await response.json();
  return data.choices[0].message.content;
}

export async function chatCompletionStream(messages: Message[]): Promise<Response> {
  return openRouterFetch(messages, true, 400);
}
