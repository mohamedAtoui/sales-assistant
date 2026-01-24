'use client';

import { useState, useEffect } from 'react';
import { Mic, Square, StopCircle } from 'lucide-react';
import { type VoiceState } from '@/lib/hooks/use-voice-interaction';

// Detect mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const isThinking = voiceState === 'thinking';

  // Mobile: tap to toggle (start/stop)
  const handleTap = () => {
    if (isSpeaking) {
      onStopSpeaking();
      return;
    }
    if (isListening) {
      onPressEnd();
      return;
    }
    if (!disabled && !isThinking) {
      onPressStart();
    }
  };

  // Desktop: push-to-talk (hold to speak)
  const handleMouseDown = () => {
    if (isMobile) return; // Use tap on mobile
    if (isSpeaking) {
      onStopSpeaking();
      return;
    }
    if (!disabled && !isThinking) {
      onPressStart();
    }
  };

  const handleMouseUp = () => {
    if (isMobile) return; // Use tap on mobile
    if (isListening) {
      onPressEnd();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isMobile) {
      handleTap();
    }
  };

  // Get the appropriate label based on device and state
  const getLabel = () => {
    if (isListening) {
      return isMobile ? 'Appuyer pour envoyer' : 'Relâchez pour envoyer';
    }
    if (isSpeaking) {
      return 'Appuyer pour arrêter';
    }
    if (isThinking) {
      return 'Patientez...';
    }
    return isMobile ? 'Appuyer pour parler' : 'Maintenir pour parler';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || isThinking}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          select-none touch-none
          ${isListening
            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 scale-110 ptt-active focus:ring-cyan-400'
            : isSpeaking
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-105 active:scale-95 focus:ring-red-400'
              : isThinking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 hover:scale-105 active:scale-95 focus:ring-emerald-400'
          }
        `}
        aria-label={getLabel()}
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
        {getLabel()}
      </p>
    </div>
  );
}
