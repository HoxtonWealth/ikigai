import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt } from '@/app/lib/prompts';
import { chatCompletion, chatCompletionStream } from '@/app/lib/openrouter';
import { Message, CoachingPhase } from '@/app/lib/types';

function findSentenceBoundary(text: string): number {
  for (let i = 0; i < text.length - 1; i++) {
    if (
      (text[i] === '.' || text[i] === '?' || text[i] === '!') &&
      (text[i + 1] === ' ' || text[i + 1] === '\n')
    ) {
      // Skip short fragments to avoid splitting on abbreviations (e.g. "M. Dupont")
      const before = text.slice(0, i + 1).trim();
      if (before.length < 4) continue;
      return i + 1;
    }
  }
  return -1;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, phase } = (await request.json()) as {
      messages: Message[];
      phase: CoachingPhase | 'synthesis';
    };

    const systemPrompt = getSystemPrompt(phase);
    const fullMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Non-streaming for synthesis (returns JSON)
    if (phase === 'synthesis') {
      const response = await chatCompletion(fullMessages);
      return NextResponse.json({ response });
    }

    // Streaming for coaching phases — split into sentences
    const streamRes = await chatCompletionStream(fullMessages);
    const reader = streamRes.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const sseEvent = (data: object) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

    const stream = new ReadableStream({
      async start(controller) {
        let sseBuffer = '';
        let fullText = '';
        let emittedUpTo = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content || '';
                if (token) fullText += token;
              } catch {
                continue;
              }
            }

            // Emit complete sentences
            let searching = true;
            while (searching) {
              const unemitted = fullText.slice(emittedUpTo);
              const boundary = findSentenceBoundary(unemitted);
              if (boundary <= 0) {
                searching = false;
              } else {
                const sentence = unemitted.slice(0, boundary).trim();
                if (sentence) {
                  controller.enqueue(sseEvent({ sentence }));
                }
                emittedUpTo += boundary;
              }
            }
          }

          const remaining = fullText.slice(emittedUpTo).trim();
          if (remaining) {
            controller.enqueue(sseEvent({ sentence: remaining }));
          }

          controller.enqueue(sseEvent({ done: true, full: fullText }));
        } catch (err) {
          controller.enqueue(sseEvent({ error: String(err) }));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
