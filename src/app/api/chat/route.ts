import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt } from '@/app/lib/prompts';
import { chatCompletion } from '@/app/lib/openrouter';
import { Message, CoachingPhase } from '@/app/lib/types';

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

    const response = await chatCompletion(fullMessages);

    return NextResponse.json({ response });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
