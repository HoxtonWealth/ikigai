import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/app/lib/elevenlabs';

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text: string };

    const audioBuffer = await textToSpeech(text);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
