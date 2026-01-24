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

// Speech recognition corrections for product-specific terms
const SPEECH_CORRECTIONS: Array<{ pattern: RegExp; replacement: string }> = [
  // Synapgen - product name
  { pattern: /snap\s*chat/gi, replacement: 'Synapgen' },
  { pattern: /snap\s*jeun/gi, replacement: 'Synapgen' },
  { pattern: /synap\s*jeun/gi, replacement: 'Synapgen' },
  { pattern: /synap?\s*[gj][eèé]u?n/gi, replacement: 'Synapgen' },
  { pattern: /sina[bp]\s*[gj][eèé]n/gi, replacement: 'Synapgen' },
  { pattern: /snap\s*[gj][eèé]n/gi, replacement: 'Synapgen' },
  { pattern: /s[iy]na[bp]\s*gen/gi, replacement: 'Synapgen' },

  // Handson - company name
  { pattern: /hands?\s*on/gi, replacement: 'Handson' },
  { pattern: /han[dt]\s*son/gi, replacement: 'Handson' },
  { pattern: /and\s*son/gi, replacement: 'Handson' },

  // Magtein - ingredient brand
  { pattern: /mag\s*t[eèé][iy]n/gi, replacement: 'Magtein' },
  { pattern: /mag?\s*taine/gi, replacement: 'Magtein' },
  { pattern: /mac\s*t[eèé][iy]n/gi, replacement: 'Magtein' },

  // L-thréonate - compound
  { pattern: /l[\s-]*t[hr]?[eèé]onat/gi, replacement: 'L-thréonate' },
  { pattern: /l[\s-]*tr[eèé]onat/gi, replacement: 'L-thréonate' },
  { pattern: /elle?\s*t[hr]?[eèé]onat/gi, replacement: 'L-thréonate' },

  // Magnésium L-thréonate - full compound name
  { pattern: /magn[eèé]sium\s+l[\s-]*t[hr]?[eèé]onat/gi, replacement: 'Magnésium L-thréonate' },

  // Bisglycinate - magnesium form
  { pattern: /bis?\s*glycinate/gi, replacement: 'bisglycinate' },
  { pattern: /bi\s*glycinate/gi, replacement: 'bisglycinate' },

  // BHE - blood-brain barrier (French abbreviation)
  { pattern: /b\.?\s*h\.?\s*e\.?/gi, replacement: 'BHE' },
  { pattern: /barri[eè]re\s+h[eèé]mato[\s-]*enc[eèé]phalique/gi, replacement: 'barrière hémato-encéphalique' },

  // GABA
  { pattern: /gaba[eèé]rgique/gi, replacement: 'GABAergique' },
];

function normalizeUserInput(text: string): string {
  let result = text;
  for (const { pattern, replacement } of SPEECH_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

interface UseVoiceInteractionOptions {
  onError?: (error: string) => void;
}

export function useVoiceInteraction({ onError }: UseVoiceInteractionOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
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
      const normalized = normalizeUserInput(text);
      setTranscript(normalized);
      pendingMessageRef.current = normalized;
    }
  }, []);

  // Handle recognition end
  const handleRecognitionEnd = useCallback(async () => {
    console.log('[Voice] Recognition ended, pending:', pendingMessageRef.current);
    // Only send if we have actual content (not just whitespace)
    if (pendingMessageRef.current && pendingMessageRef.current.trim().length > 0) {
      const rawMessage = pendingMessageRef.current;
      const message = normalizeUserInput(rawMessage);
      if (message !== rawMessage) {
        console.log('[Voice] Corrected:', rawMessage, '→', message);
      }
      pendingMessageRef.current = null;
      setLastUserMessage(message);
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
      // No content captured, go back to idle
      console.log('[Voice] No pending message or empty content, going idle');
      pendingMessageRef.current = null;
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

  // Go idle after TTS finishes (user must press button again to speak)
  const handleSpeechEnd = useCallback(() => {
    console.log('[Voice] Speech ended, going idle');
    setVoiceState('idle');
  }, []);

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
    setLastUserMessage('');
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
    console.log('[Voice] Manual stop speaking, isSpeaking:', isSpeaking);
    stopSpeaking();
    setVoiceState('idle');
  }, [stopSpeaking, isSpeaking]);

  // Cancel/stop everything
  const stopAll = useCallback(() => {
    stopSpeaking();
    stopListening();
    setVoiceState('idle');
    setTranscript('');
    pendingMessageRef.current = null;
    setVoiceEnabled(false);
  }, [stopSpeaking, stopListening, setVoiceEnabled]);

  // Send a text message (from text input)
  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any ongoing speech
    stopSpeaking();
    stopListening();

    setLastUserMessage(text);
    setVoiceState('thinking');
    setVoiceEnabled(true);

    try {
      await sendMessage({ text });
    } catch (error) {
      console.error('[Voice] Error sending text message:', error);
      onError?.('Erreur lors de l\'envoi du message');
      setVoiceState('idle');
    }
  }, [sendMessage, stopSpeaking, stopListening, setVoiceEnabled, onError]);

  return {
    voiceState,
    transcript,
    lastUserMessage,
    isVoiceSupported,
    isLoading,
    startPushToTalk,
    stopPushToTalk,
    stopSpeaking: stopSpeakingManually,
    stopAll,
    sendTextMessage,
  };
}
