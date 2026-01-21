'use client';

import { Mic, Square, StopCircle } from 'lucide-react';
import { type VoiceState } from '@/lib/hooks/use-voice-interaction';

interface PushToTalkButtonProps {
  voiceState: VoiceState;
  onPressStart: () => void;
  onPressEnd: () => void;
  onStopSpeaking: () => void;
  disabled?: boolean;
}

export function PushToTalkButton({
  voiceState,
  onPressStart,
  onPressEnd,
  onStopSpeaking,
  disabled = false,
}: PushToTalkButtonProps) {
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isThinking = voiceState === 'thinking';

  const handleMouseDown = () => {
    if (isSpeaking) {
      onStopSpeaking();
      return;
    }
    if (!disabled && !isThinking) {
      onPressStart();
    }
  };

  const handleMouseUp = () => {
    if (isListening) {
      onPressEnd();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isSpeaking) {
      onStopSpeaking();
      return;
    }
    if (!disabled && !isThinking) {
      onPressStart();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isListening) {
      onPressEnd();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || isThinking}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isListening
            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 scale-110 ptt-active focus:ring-cyan-400'
            : isSpeaking
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-105 active:scale-95 focus:ring-red-400'
              : isThinking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 hover:scale-105 active:scale-95 focus:ring-emerald-400'
          }
        `}
        aria-label={isListening ? 'Relâcher pour envoyer' : isSpeaking ? 'Appuyer pour arrêter' : 'Maintenir pour parler'}
      >
        {isListening ? (
          <Square className="h-8 w-8 fill-current" />
        ) : isSpeaking ? (
          <StopCircle className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}

        {/* Pulse ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-50" />
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {isListening
          ? 'Relâchez pour envoyer'
          : isSpeaking
            ? 'Appuyer pour arrêter'
            : isThinking
              ? 'Patientez...'
              : 'Maintenir pour parler'}
      </p>
    </div>
  );
}
