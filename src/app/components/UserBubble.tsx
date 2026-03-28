'use client';

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-violet-500 text-white text-sm sm:text-base leading-relaxed">
          {text}
        </div>
      </div>
    </div>
  );
}
