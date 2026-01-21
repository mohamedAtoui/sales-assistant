'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/hooks/use-speech';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Clean text for TTS - remove markdown and make it speech-friendly
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/Synapgen/gi, 'Synapjène')
    .replace(/\|[^\n]+\|/g, '')
    .replace(/\|-+\|/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\(PMID:\s*(\d+)\)/g, ', référence PMID $1,')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/\|/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .trim();
}

interface UseVoiceInteractionOptions {
  onError?: (error: string) => void;
}

export function useVoiceInteraction({ onError }: UseVoiceInteractionOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const pendingMessageRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'include',
    }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === 'submitted' || status === 'streaming';

  // Refs for cross-callback access
  const stopSpeakingRef = useRef<(() => void) | null>(null);
  const voiceStateRef = useRef(voiceState);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // Handle voice result - always store the latest transcript
  const handleVoiceResult = useCallback((text: string, isFinal: boolean) => {
    console.log('[Voice] Result:', { text, isFinal, state: voiceStateRef.current });
    if (text.trim()) {
      setTranscript(text);
      // Always update pending message with latest transcript
      pendingMessageRef.current = text;
    }
  }, []);

  // Handle recognition end
  const handleRecognitionEnd = useCallback(async () => {
    console.log('[Voice] Recognition ended, pending:', pendingMessageRef.current);
    if (pendingMessageRef.current) {
      const message = pendingMessageRef.current;
      pendingMessageRef.current = null;
      setVoiceState('thinking');
      setTranscript('');
      console.log('[Voice] Sending message:', message);
      try {
        await sendMessage({ text: message });
        console.log('[Voice] Message sent successfully');
      } catch (error) {
        console.error('[Voice] Error sending message:', error);
        onError?.('Erreur lors de l\'envoi du message');
        setVoiceState('idle');
      }
    } else {
      console.log('[Voice] No pending message, going idle');
      setVoiceState('idle');
      setTranscript('');
    }
  }, [sendMessage, onError]);

  const {
    isListening,
    isSupported: isRecognitionSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'fr-FR',
    interimResults: true,
    continuous: true,
    onResult: handleVoiceResult,
    onEnd: handleRecognitionEnd,
    playSounds: true,
    stopOnResult: false,
  });

  // Auto-start listening after TTS finishes
  const handleSpeechEnd = useCallback(() => {
    setVoiceState('listening');
    setTimeout(() => {
      startListening();
    }, 300);
  }, [startListening]);

  const {
    isSpeaking,
    isSupported: isSynthesisSupported,
    speak,
    stop: stopSpeaking,
    setVoiceEnabled,
  } = useSpeechSynthesis({
    lang: 'fr-FR',
    rate: 1,
    onSpeechEnd: handleSpeechEnd,
  });

  stopSpeakingRef.current = stopSpeaking;

  const isVoiceSupported = isRecognitionSupported && isSynthesisSupported;

  // Auto-speak assistant messages when in voice mode
  useEffect(() => {
    if (isLoading || voiceState === 'idle') return;

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      lastMessage.id !== lastMessageIdRef.current &&
      lastMessage.parts
    ) {
      const textContent = lastMessage.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join(' ');

      const cleanedText = cleanTextForSpeech(textContent);
      if (cleanedText && cleanedText.length > 0) {
        lastMessageIdRef.current = lastMessage.id;
        setVoiceState('speaking');
        setVoiceEnabled(true);
        speak(cleanedText);
      }
    }
  }, [messages, isLoading, voiceState, speak, setVoiceEnabled]);

  // Sync state with actual listening/speaking status
  useEffect(() => {
    if (isListening && voiceState !== 'listening' && voiceState !== 'speaking') {
      setVoiceState('listening');
    }
  }, [isListening, voiceState]);

  useEffect(() => {
    if (isSpeaking && voiceState !== 'speaking') {
      setVoiceState('speaking');
    }
  }, [isSpeaking, voiceState]);

  // Start push-to-talk
  const startPushToTalk = useCallback(() => {
    console.log('[Voice] Start push-to-talk, supported:', isVoiceSupported);
    if (!isVoiceSupported) return;
    stopSpeaking();
    setVoiceState('listening');
    setTranscript('');
    pendingMessageRef.current = null;
    setVoiceEnabled(true);
    startListening();
  }, [isVoiceSupported, stopSpeaking, startListening, setVoiceEnabled]);

  // Stop push-to-talk (release)
  const stopPushToTalk = useCallback(() => {
    console.log('[Voice] Stop push-to-talk, pending:', pendingMessageRef.current);
    stopListening();
  }, [stopListening]);

  // Stop speaking manually (from button) - goes to idle, not listening
  const stopSpeakingManually = useCallback(() => {
    console.log('[Voice] Manual stop speaking');
    stopSpeaking();
    setVoiceState('idle');
  }, [stopSpeaking]);

  // Cancel/stop everything
  const stopAll = useCallback(() => {
    stopSpeaking();
    stopListening();
    setVoiceState('idle');
    setTranscript('');
    pendingMessageRef.current = null;
    setVoiceEnabled(false);
  }, [stopSpeaking, stopListening, setVoiceEnabled]);

  return {
    voiceState,
    transcript,
    isVoiceSupported,
    isLoading,
    startPushToTalk,
    stopPushToTalk,
    stopSpeaking: stopSpeakingManually,
    stopAll,
  };
}
