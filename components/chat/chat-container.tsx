'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { signOut } from 'next-auth/react';
import { LogOut, Mic, MicOff, Moon, Sun, MessageSquare } from 'lucide-react';
import Link from 'next/link';
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
  const [isDarkMode, setIsDarkMode] = useState(false);
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
    <div className={`flex flex-col h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-gradient-to-b from-gray-900 to-gray-950'
        : 'bg-gradient-to-b from-white to-gray-50'
    }`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm transition-colors duration-300 ${
        isDarkMode
          ? 'border-gray-700 bg-gray-900/80'
          : 'border-gray-200 bg-white/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Synapgen®</h1>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assistant Commercial</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/chat">
            <Button
              variant="ghost"
              size="sm"
              className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Main Content - Centered Avatar */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-visible">
        <SageAvatar isSpeaking={isSpeaking || testSpeaking} />

        {/* Status Text */}
        <p className={`mt-24 text-center relative z-20 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
                : isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {testSpeaking ? 'Stop Test' : 'Test Animation'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Réponses basées sur des données scientifiques. Toujours vérifier les sources.
        </p>
      </div>
    </div>
  );
}
