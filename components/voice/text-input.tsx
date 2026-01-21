'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Keyboard } from 'lucide-react';

interface TextInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TextInput({ onSend, disabled = false, placeholder = "Tapez votre message..." }: TextInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  }, [message, disabled, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Divider with "ou" text */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">ou écrivez</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>

      {/* Input container */}
      <div
        className={`
          relative flex items-center gap-2
          bg-white/70 backdrop-blur-md
          border-2 rounded-2xl
          px-4 py-3
          shadow-lg shadow-emerald-500/5
          transition-all duration-300 ease-out
          ${isFocused
            ? 'border-emerald-400 shadow-xl shadow-emerald-500/10 bg-white/90'
            : 'border-gray-200/80 hover:border-gray-300'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        {/* Keyboard icon */}
        <Keyboard
          className={`
            h-5 w-5 flex-shrink-0 transition-colors duration-200
            ${isFocused ? 'text-emerald-500' : 'text-gray-400'}
          `}
        />

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            flex-1 bg-transparent
            text-gray-800 placeholder-gray-400
            text-sm font-medium
            outline-none
            disabled:cursor-not-allowed
          `}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`
            relative flex items-center justify-center
            w-10 h-10 rounded-xl
            transition-all duration-300 ease-out
            ${canSend
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }
          `}
          aria-label="Envoyer le message"
        >
          <Send
            className={`
              h-4 w-4 transition-transform duration-200
              ${canSend ? 'translate-x-0' : '-translate-x-0.5'}
            `}
          />

          {/* Ripple effect on hover */}
          {canSend && (
            <span className="absolute inset-0 rounded-xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-200" />
          )}
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-center text-xs text-gray-400">
        Appuyez sur Entrée pour envoyer
      </p>
    </div>
  );
}
