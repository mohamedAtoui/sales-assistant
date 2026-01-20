'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { signOut } from 'next-auth/react';
import { LogOut, Mic, MicOff, Moon, Sun, Send, Volume2, AudioWaveform } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/hooks/use-speech';
import ReactMarkdown from 'react-markdown';

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
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // Remove emojis
    .trim();
}

export function ChatContainer() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [pendingVoiceMessage, setPendingVoiceMessage] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Refs for cross-callback access
  const stopSpeakingRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const startListeningRef = useRef<(() => void) | null>(null);
  const voiceModeEnabledRef = useRef(voiceModeEnabled);

  // Keep ref in sync with state
  useEffect(() => {
    voiceModeEnabledRef.current = voiceModeEnabled;
  }, [voiceModeEnabled]);

  // Handle voice result - show in messages area as pending
  const handleVoiceResult = useCallback((transcript: string, isFinal: boolean) => {
    if (transcript.trim()) {
      // Stop Sage speaking if user interrupts
      stopSpeakingRef.current?.();
      setPendingVoiceMessage(transcript); // Show in messages area
      if (isFinal) {
        pendingMessageRef.current = transcript;
      }
    }
  }, []);

  // Handle recognition end - send the message
  const handleRecognitionEnd = useCallback(async () => {
    setIsVoiceInputActive(false);
    if (pendingMessageRef.current) {
      const message = pendingMessageRef.current;
      pendingMessageRef.current = null;
      setPendingVoiceMessage(null); // Clear after sending
      setInputValue('');
      try {
        await sendMessage({ text: message });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else if (isSpeakingRef.current && voiceModeEnabledRef.current) {
      // No result but TTS still playing - restart listening for interruption
      setTimeout(() => {
        startListeningRef.current?.();
        setIsVoiceInputActive(true);
      }, 100);
    }
  }, [sendMessage]);

  const {
    isListening,
    isSupported: isRecognitionSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    lang: 'fr-FR',
    interimResults: true,
    onResult: handleVoiceResult,
    onEnd: handleRecognitionEnd,
    playSounds: true,
    stopOnResult: true,
  });

  // Auto-start listening after TTS finishes (when voice mode is enabled)
  const handleSpeechEnd = useCallback(() => {
    setSpeakingMessageId(null);
    if (voiceModeEnabledRef.current) {
      setTimeout(() => {
        if (!isLoading) {
          startListening();
          setIsVoiceInputActive(true);
        }
      }, 300);
    }
  }, [startListening, isLoading]);

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

  // Set refs for cross-callback access
  stopSpeakingRef.current = stopSpeaking;
  isSpeakingRef.current = isSpeaking;
  startListeningRef.current = startListening;

  const isVoiceSupported = isRecognitionSupported && isSynthesisSupported;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-speak assistant messages when voice mode is enabled
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!voiceModeEnabled || isLoading) return;

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
        setSpeakingMessageId(lastMessage.id);
        setVoiceEnabled(true);
        speak(cleanedText);
        // Start listening after a short delay so user can interrupt
        setTimeout(() => {
          if (voiceModeEnabledRef.current) {
            startListening();
            setIsVoiceInputActive(true);
          }
        }, 500);
      }
    }
  }, [messages, voiceModeEnabled, isLoading, speak, startListening, setVoiceEnabled]);

  // Handle text submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue;
    setInputValue('');
    try {
      await sendMessage({ text: message });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Start voice input
  const handleStartVoiceInput = () => {
    if (!isVoiceSupported) return;
    setIsVoiceInputActive(true);
    setPendingVoiceMessage(null);
    pendingMessageRef.current = null;
    startListening();
  };

  // Stop voice input
  const handleStopVoiceInput = () => {
    stopListening();
    setIsVoiceInputActive(false);
    setPendingVoiceMessage(null);
    pendingMessageRef.current = null;
  };

  // Speak a specific message
  const handleSpeakMessage = (messageId: string, text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }
    const cleanedText = cleanTextForSpeech(text);
    if (cleanedText) {
      setSpeakingMessageId(messageId);
      setVoiceEnabled(true);
      speak(cleanedText);
    }
  };

  // Toggle voice mode
  const handleToggleVoiceMode = () => {
    const newState = !voiceModeEnabled;
    setVoiceModeEnabled(newState);
    if (!newState) {
      // Turning off - stop everything
      stopSpeaking();
      stopListening();
      setIsVoiceInputActive(false);
      setSpeakingMessageId(null);
      setVoiceEnabled(false);
    } else {
      // Turning on - start listening
      setVoiceEnabled(true);
      startListening();
      setIsVoiceInputActive(true);
    }
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-gray-900'
        : 'bg-gray-50'
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
          {/* Voice Mode Toggle */}
          {isVoiceSupported && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleVoiceMode}
              className={`${
                voiceModeEnabled
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {voiceModeEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
              Mode Vocal
            </Button>
          )}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-lg mb-2">Bienvenue sur Sage</p>
            <p className="text-sm">Tapez un message ou utilisez le micro pour commencer</p>
          </div>
        )}
        {messages.map((message) => {
          const textContent = message.parts
            ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
            .map((part) => part.text)
            .join(' ') || '';

          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-100'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{textContent}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className={`prose prose-sm max-w-none ${
                      isDarkMode
                        ? 'prose-invert prose-p:text-gray-100 prose-headings:text-white prose-strong:text-white prose-li:text-gray-100'
                        : 'prose-gray'
                    } prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0`}>
                      <ReactMarkdown>{textContent}</ReactMarkdown>
                    </div>
                    {/* Speaker button for assistant messages */}
                    {isVoiceSupported && textContent && (
                      <button
                        onClick={() => handleSpeakMessage(message.id, textContent)}
                        className={`self-start flex items-center gap-1 text-xs transition-colors ${
                          speakingMessageId === message.id
                            ? 'text-emerald-500'
                            : isDarkMode
                              ? 'text-gray-400 hover:text-gray-200'
                              : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Volume2 className={`h-4 w-4 ${speakingMessageId === message.id ? 'animate-pulse' : ''}`} />
                        {speakingMessageId === message.id ? 'Arrêter' : 'Écouter'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* Show pending voice message while listening */}
        {pendingVoiceMessage && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-emerald-600 text-white opacity-70">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 animate-pulse" />
                <p className="whitespace-pre-wrap">{pendingVoiceMessage}</p>
              </div>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-3 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-200'
            }`}>
              <div className="flex gap-1">
                <span className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '0ms' }} />
                <span className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '150ms' }} />
                <span className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t transition-colors duration-300 ${
        isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
      }`}>
        <div className="max-w-4xl mx-auto">
          {isVoiceInputActive ? (
            /* Voice Input Mode - Simple listening indicator */
            <div className={`flex items-center gap-3 px-4 py-3 rounded-full border ${
              isDarkMode
                ? 'bg-gray-800 border-emerald-500'
                : 'bg-gray-50 border-emerald-500'
            }`}>
              <Mic className="h-5 w-5 text-emerald-500 animate-pulse" />
              <span className={`flex-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Je vous écoute...
              </span>
              <Button
                onClick={handleStopVoiceInput}
                size="sm"
                variant="destructive"
                className="rounded-full"
              >
                Stop
              </Button>
            </div>
          ) : (
            /* Text Input Mode */
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Tapez votre message..."
                className={`flex-1 px-4 py-3 rounded-full border outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-emerald-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500'
                }`}
                disabled={isLoading}
              />
              {/* Waveform/Mic button */}
              {isVoiceSupported && (
                <Button
                  type="button"
                  onClick={handleStartVoiceInput}
                  size="lg"
                  variant="outline"
                  disabled={isLoading}
                  className={`rounded-full px-4 ${
                    isDarkMode
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-emerald-400'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-emerald-600'
                  }`}
                >
                  <AudioWaveform className="h-5 w-5" />
                </Button>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={!inputValue.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          )}
        </div>

        {/* Voice mode indicator */}
        {voiceModeEnabled && (
          <p className={`text-xs text-center mt-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Mode vocal actif - Les réponses seront lues automatiquement
          </p>
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 pb-4 text-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Réponses basées sur des données scientifiques. Toujours vérifier les sources.
        </p>
      </div>
    </div>
  );
}
