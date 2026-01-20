'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { signOut } from 'next-auth/react';
import { LogOut, Send, Mic, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export function TextChatContainer() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'include',
    }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
            >
              <Mic className="h-4 w-4 mr-2" />
              Mode Vocal
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Commencez une conversation avec Sage</p>
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
                  <div className={`prose prose-sm max-w-none ${
                    isDarkMode
                      ? 'prose-invert prose-p:text-gray-100 prose-headings:text-white prose-strong:text-white prose-li:text-gray-100'
                      : 'prose-gray'
                  } prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0`}>
                    <ReactMarkdown>{textContent}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
      <form
        onSubmit={handleSubmit}
        className={`p-4 border-t transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex gap-3 max-w-4xl mx-auto">
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
          <Button
            type="submit"
            size="lg"
            disabled={!inputValue.trim() || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
