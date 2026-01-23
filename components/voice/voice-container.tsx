'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceInteraction } from '@/lib/hooks/use-voice-interaction';
import { useAudioAnalyzer } from '@/lib/hooks/use-audio-analyzer';
import { MinimalHeader } from './minimal-header';
import { VoiceCapsule } from './voice-capsule';
import { StatusIndicator } from './status-indicator';
import { TranscriptBubble } from './transcript-bubble';
import { PushToTalkButton } from './push-to-talk-button';
import { TextInput } from './text-input';

const SENT_MESSAGE_FADE_DELAY = 3000; // Hide sent message 3 seconds after speaking starts

export function VoiceContainer() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSentDuringSpeaking, setShowSentDuringSpeaking] = useState(false);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    voiceState,
    transcript,
    lastUserMessage,
    isVoiceSupported,
    isLoading,
    startPushToTalk,
    stopPushToTalk,
    stopSpeaking,
    stopAll,
    sendTextMessage,
  } = useVoiceInteraction();

  const { audioLevel, start: startAnalyzer, stop: stopAnalyzer } = useAudioAnalyzer();

  // Track when component is mounted (client-side)
  useEffect(() => {
    setIsMounted(true);
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  // Start/stop audio analyzer based on voice state
  // On mobile, don't start analyzer during listening - it competes for the microphone
  // Only run it during speaking for visual feedback
  useEffect(() => {
    if (isMobile && voiceState === 'listening') {
      stopAnalyzer();
      return;
    }

    if (voiceState === 'listening' || voiceState === 'speaking') {
      startAnalyzer();
    } else {
      stopAnalyzer();
    }
  }, [voiceState, isMobile, startAnalyzer, stopAnalyzer]);

  // Manage sent message visibility with fade delay
  useEffect(() => {
    // Clear any existing timer
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (voiceState === 'thinking') {
      // Show sent message during thinking
      setShowSentDuringSpeaking(true);
    } else if (voiceState === 'speaking' && showSentDuringSpeaking) {
      // Start fade timer when speaking begins
      fadeTimerRef.current = setTimeout(() => {
        setShowSentDuringSpeaking(false);
      }, SENT_MESSAGE_FADE_DELAY);
    } else if (voiceState === 'listening' || voiceState === 'idle') {
      // Reset when starting new interaction or going idle
      setShowSentDuringSpeaking(false);
    }

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, [voiceState, showSentDuringSpeaking]);

  // Keyboard support for spacebar PTT (only when not typing in input)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger PTT if user is typing in an input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' && !e.repeat && voiceState === 'idle') {
      e.preventDefault();
      startPushToTalk();
    }
  }, [voiceState, startPushToTalk]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Don't trigger PTT if user is typing in an input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' && voiceState === 'listening') {
      e.preventDefault();
      stopPushToTalk();
    }
  }, [voiceState, stopPushToTalk]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Show loading state until mounted and voice support is determined
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-cyan-50/30">
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isVoiceSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-cyan-50/30">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Mode vocal non disponible
          </h2>
          <p className="text-gray-600">
            Votre navigateur ne supporte pas les fonctionnalités vocales requises.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-emerald-50/30 to-cyan-50/30">
      {/* Minimal Header */}
      <MinimalHeader />

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-8">
        {/* Voice Capsule */}
        <div className="mb-8">
          <VoiceCapsule voiceState={voiceState} audioLevel={audioLevel} />
        </div>

        {/* Status Indicator */}
        <div className="mb-6">
          <StatusIndicator voiceState={voiceState} />
        </div>

        {/* Transcript Bubble */}
        <div className="h-20 mb-8 w-full max-w-md">
          {(() => {
            const showLiveTranscript = voiceState === 'listening' && transcript.length > 0;
            const showSentMessage = (voiceState === 'thinking' || (voiceState === 'speaking' && showSentDuringSpeaking)) && lastUserMessage.length > 0;
            return (
              <TranscriptBubble
                transcript={showLiveTranscript ? transcript : lastUserMessage}
                isVisible={showLiveTranscript || showSentMessage}
                isSent={showSentMessage}
              />
            );
          })()}
        </div>

        {/* Push to Talk Button */}
        <PushToTalkButton
          voiceState={voiceState}
          onPressStart={startPushToTalk}
          onPressEnd={stopPushToTalk}
          onStopSpeaking={stopSpeaking}
          disabled={isLoading}
        />

        {/* Keyboard hint */}
        <p className="mt-4 text-xs text-gray-400 mb-6">
          Astuce: Appuyez sur Espace pour parler
        </p>

        {/* Text Input */}
        <div className="w-full px-4">
          <TextInput
            onSend={sendTextMessage}
            disabled={voiceState === 'listening' || voiceState === 'thinking'}
            placeholder="Tapez votre message..."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-4 text-center">
        <p className="text-xs text-gray-400">
          Assistant vocal Synapgen - Réponses basées sur des données scientifiques
        </p>
      </footer>
    </div>
  );
}
