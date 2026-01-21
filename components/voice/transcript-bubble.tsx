'use client';

import { Mic } from 'lucide-react';

interface TranscriptBubbleProps {
  transcript: string;
  isVisible: boolean;
}

export function TranscriptBubble({ transcript, isVisible }: TranscriptBubbleProps) {
  if (!isVisible || !transcript) return null;

  return (
    <div className="transcript-bubble max-w-md mx-auto">
      <div className="bg-emerald-600/90 backdrop-blur-sm text-white rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Mic className="h-4 w-4 flex-shrink-0 mic-animated" />
          <p className="text-sm leading-relaxed">{transcript}</p>
        </div>
      </div>
    </div>
  );
}
