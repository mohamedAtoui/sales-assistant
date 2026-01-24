'use client';

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VoiceInputButton } from './voice-button';

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  isListening?: boolean;
  isVoiceSupported?: boolean;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
}

export function ChatInput({
  input,
  handleInputChange,
  isLoading,
  isListening = false,
  isVoiceSupported = false,
  onVoiceStart,
  onVoiceStop,
}: ChatInputProps) {
  return (
    <>
      <Input
        value={input || ''}
        onChange={handleInputChange}
        placeholder={isListening ? "Parlez maintenant..." : "Posez une question sur Synapgen®..."}
        disabled={isLoading || isListening}
        className="flex-1"
      />
      {isVoiceSupported && onVoiceStart && onVoiceStop && (
        <VoiceInputButton
          isListening={isListening}
          isSupported={isVoiceSupported}
          onStart={onVoiceStart}
          onStop={onVoiceStop}
        />
      )}
      <Button type="submit" disabled={isLoading || !input?.trim()} size="icon">
        <Send className="h-4 w-4" />
        <span className="sr-only">Envoyer</span>
      </Button>
    </>
  );
}
