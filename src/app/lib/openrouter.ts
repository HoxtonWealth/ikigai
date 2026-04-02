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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  return response;
}

export async function chatCompletion(messages: Message[]): Promise<string> {
  const response = await openRouterFetch(messages, false, 2000);
  const data = await response.json();
  return data.choices[0].message.content;
}

export async function chatCompletionStream(messages: Message[]): Promise<Response> {
  return openRouterFetch(messages, true, 400);
}
