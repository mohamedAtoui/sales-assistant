'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { signOut } from 'next-auth/react';
import { LogOut, Mic, MicOff } from 'lucide-react';
import { SageAvatar } from './sage-avatar';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/hooks/use-speech';

// Clean text for TTS - remove markdown and make it speech-friendly
function cleanTextForSpeech(text: string): string {
  return text
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
    .trim();
}

export function ChatContainer() {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [testSpeaking, setTestSpeaking] = useState(false);
  const pendingMessageRef = useRef<string | null>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'include',
    }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === 'submitted' || status === 'streaming';

  // Handle voice result - store transcript
  const handleVoiceResult = useCallback((transcript: string) => {
    if (transcript.trim()) {
      pendingMessageRef.current = transcript;
    }
  }, []);

  // Handle recognition end - send the message
  const handleRecognitionEnd = useCallback(async () => {
    if (pendingMessageRef.current) {
      const message = pendingMessageRef.current;
      pendingMessageRef.current = null;
      try {
        await sendMessage({ text: message });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }, [sendMessage]);

  const {
    isListening,
    isSupported: isRecognitionSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'fr-FR',
    onResult: handleVoiceResult,
    onEnd: handleRecognitionEnd,
    playSounds: true,
    stopOnResult: true,
  });

  // Auto-start listening after TTS finishes (continuous conversation)
  const handleSpeechEnd = useCallback(() => {
    if (isConversationActive) {
      setTimeout(() => {
        if (!isLoading) {
          startListening();
        }
      }, 300);
    }
  }, [startListening, isLoading, isConversationActive]);

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

  // Read assistant messages aloud
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isConversationActive || isLoading) return;

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
        speak(cleanedText);
      }
    }
  }, [messages, isConversationActive, isLoading, speak]);

  // Start conversation
  const handleStart = useCallback(() => {
    setIsConversationActive(true);
    setVoiceEnabled(true);
    startListening();
  }, [startListening, setVoiceEnabled]);

  // End conversation
  const handleEnd = useCallback(() => {
    setIsConversationActive(false);
    setVoiceEnabled(false);
    stopListening();
    stopSpeaking();
  }, [stopListening, stopSpeaking, setVoiceEnabled]);

  const isVoiceSupported = isRecognitionSupported && isSynthesisSupported;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Synapgen®</h1>
            <p className="text-xs text-gray-500">Assistant Commercial</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-gray-500 hover:text-gray-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </header>

      {/* Main Content - Centered Avatar */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-visible">
        <SageAvatar isSpeaking={isSpeaking || testSpeaking} />

        {/* Status Text */}
        <p className="text-gray-600 mt-24 text-center relative z-20">
          {!isConversationActive && !testSpeaking && "Cliquez sur Démarrer pour parler avec Sage"}
          {isConversationActive && isListening && "Je vous écoute..."}
          {isConversationActive && isSpeaking && "Sage parle..."}
          {isConversationActive && isLoading && !isSpeaking && "Réflexion en cours..."}
          {isConversationActive && !isListening && !isSpeaking && !isLoading && "Prêt à écouter..."}
          {testSpeaking && "Test animation active..."}
        </p>

        {/* Start/End Buttons */}
        <div className="mt-16 flex gap-4">
          {!isVoiceSupported ? (
            <p className="text-red-500 text-sm">
              Votre navigateur ne supporte pas les fonctionnalités vocales.
            </p>
          ) : !isConversationActive ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-full"
            >
              <Mic className="h-6 w-6 mr-2" />
              Démarrer
            </Button>
          ) : (
            <Button
              onClick={handleEnd}
              size="lg"
              variant="destructive"
              className="px-8 py-6 text-lg rounded-full"
            >
              <MicOff className="h-6 w-6 mr-2" />
              Terminer
            </Button>
          )}

          {/* Test Animation Button */}
          <Button
            onClick={() => setTestSpeaking(!testSpeaking)}
            size="lg"
            variant="outline"
            className={`px-6 py-6 text-lg rounded-full ${
              testSpeaking
                ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {testSpeaking ? 'Stop Test' : 'Test Animation'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className="text-xs text-gray-400">
          Réponses basées sur des données scientifiques. Toujours vérifier les sources.
        </p>
      </div>
    </div>
  );
}
