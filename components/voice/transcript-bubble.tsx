'use client';

import { Mic, Check } from 'lucide-react';

interface TranscriptBubbleProps {
  transcript: string;
  isVisible: boolean;
  isSent?: boolean;
}

export function TranscriptBubble({ transcript, isVisible, isSent = false }: TranscriptBubbleProps) {
  if (!isVisible || !transcript) return null;

  return (
    <div className="transcript-bubble max-w-md mx-auto">
      <div className={`backdrop-blur-sm text-white rounded-2xl px-5 py-3 shadow-lg ${
        isSent ? 'bg-emerald-700/80' : 'bg-emerald-600/90'
      }`}>
        <div className="flex items-center gap-3">
          {isSent ? (
            <Check className="h-4 w-4 flex-shrink-0 text-emerald-300" />
          ) : (
            <Mic className="h-4 w-4 flex-shrink-0 mic-animated" />
          )}
          <p className="text-sm leading-relaxed">
            {isSent && <span className="text-emerald-300 mr-1">Vous:</span>}
            {transcript}
          </p>
        </div>
      </div>
    </div>
  );
}
