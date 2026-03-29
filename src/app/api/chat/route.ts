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
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ sentence })}\n\n`)
                  );
                }
                emittedUpTo += boundary;
              }
            }
          }

          // Emit any remaining text
          const remaining = fullText.slice(emittedUpTo).trim();
          if (remaining) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ sentence: remaining })}\n\n`)
            );
          }

          // Signal completion with full text
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, full: fullText })}\n\n`)
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`
            )
          );
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
