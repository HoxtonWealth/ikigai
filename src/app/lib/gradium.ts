export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const voiceId = process.env.GRADIUM_VOICE_ID;
  const apiKey = process.env.GRADIUM_API_KEY;

  console.log('[TTS] Calling Gradium:', { voiceId: voiceId ? `${voiceId.slice(0, 6)}...` : 'MISSING', apiKeySet: !!apiKey, textLength: text.length });

  const response = await fetch(
    'https://eu.api.gradium.ai/api/post/speech/tts',
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        output_format: 'wav',
        only_audio: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[TTS] Gradium error:', response.status, errorText);
    let message = errorText;
    try { message = JSON.parse(errorText).error || errorText; } catch {}
    throw new Error(`Gradium API error: ${response.status} - ${message}`);
  }

  return response.arrayBuffer();
}
