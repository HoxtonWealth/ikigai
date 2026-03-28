'use client';

export function TranscriptDisplay({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="text-sm text-gray-500 italic px-4 py-2 text-center">
      {text}
    </div>
  );
}
