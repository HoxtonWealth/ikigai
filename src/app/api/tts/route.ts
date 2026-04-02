import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/app/lib/gradium';

export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text: string };

    const audioBuffer = await textToSpeech(text);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TTS] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
